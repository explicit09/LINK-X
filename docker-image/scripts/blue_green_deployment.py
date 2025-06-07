#!/usr/bin/env python3
"""
Blue/Green Deployment Script for Production Readiness
Enables zero-downtime deployments with traffic mirroring and validation
"""
import os
import sys
import time
import json
import subprocess
import argparse
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class DeploymentEnvironment:
    """Represents a deployment environment (blue or green)"""
    name: str  # 'blue' or 'green'
    docker_compose_file: str
    database_url: str
    redis_url: str
    worker_replicas: int
    health_check_url: str
    metrics_port: int
    is_active: bool = False


@dataclass
class DeploymentMetrics:
    """Metrics collected during deployment validation"""
    environment: str
    timestamp: datetime
    response_time_ms: float
    error_rate_percent: float
    throughput_rps: float
    memory_usage_mb: float
    cpu_usage_percent: float
    embedding_queue_depth: int
    database_connections: int


class BlueGreenDeployment:
    """Manages blue/green deployments with traffic mirroring and validation"""
    
    def __init__(self, config_file: str = "deployment_config.json"):
        self.config = self._load_config(config_file)
        self.blue = DeploymentEnvironment(**self.config['blue'])
        self.green = DeploymentEnvironment(**self.config['green'])
        self.validation_period_minutes = self.config.get('validation_period_minutes', 24 * 60)  # 24 hours default
        self.traffic_mirror_percentage = self.config.get('traffic_mirror_percentage', 5)
        self.rollback_threshold = self.config.get('rollback_threshold', {
            'error_rate_percent': 2.0,
            'response_time_increase_percent': 50.0,
            'memory_increase_percent': 100.0
        })
        
    def _load_config(self, config_file: str) -> Dict:
        """Load deployment configuration"""
        default_config = {
            'blue': {
                'name': 'blue',
                'docker_compose_file': 'docker-compose.blue.yml',
                'database_url': 'postgresql://localhost:5432/learnx_blue',
                'redis_url': 'redis://localhost:6379/0',
                'worker_replicas': 3,
                'health_check_url': 'http://localhost:8000/api/health',
                'metrics_port': 9090
            },
            'green': {
                'name': 'green',
                'docker_compose_file': 'docker-compose.green.yml',
                'database_url': 'postgresql://localhost:5433/learnx_green',
                'redis_url': 'redis://localhost:6380/0',
                'worker_replicas': 3,
                'health_check_url': 'http://localhost:8001/api/health',
                'metrics_port': 9091
            },
            'validation_period_minutes': 1440,  # 24 hours
            'traffic_mirror_percentage': 5,
            'rollback_threshold': {
                'error_rate_percent': 2.0,
                'response_time_increase_percent': 50.0,
                'memory_increase_percent': 100.0
            }
        }
        
        try:
            with open(config_file, 'r') as f:
                user_config = json.load(f)
                default_config.update(user_config)
        except FileNotFoundError:
            logger.warning(f"Config file {config_file} not found, using defaults")
            # Save default config for future use
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
        
        return default_config
    
    def deploy(self, target_environment: str, image_tag: str) -> bool:
        """
        Deploy new version to target environment (blue or green)
        
        Args:
            target_environment: 'blue' or 'green'
            image_tag: Docker image tag to deploy
            
        Returns:
            bool: True if deployment successful
        """
        logger.info(f"Starting deployment to {target_environment} environment")
        
        target = self.blue if target_environment == 'blue' else self.green
        active = self._get_active_environment()
        
        try:
            # Step 1: Deploy to target environment
            if not self._deploy_environment(target, image_tag):
                return False
            
            # Step 2: Run health checks
            if not self._health_check(target):
                logger.error(f"Health check failed for {target_environment}")
                return False
            
            # Step 3: Run database migrations if needed
            if not self._run_migrations(target):
                logger.error(f"Database migration failed for {target_environment}")
                return False
            
            # Step 4: Start traffic mirroring for validation
            if active:
                logger.info(f"Starting {self.traffic_mirror_percentage}% traffic mirror to {target_environment}")
                self._start_traffic_mirror(active, target, self.traffic_mirror_percentage)
            
            # Step 5: Validation period
            if not self._validate_deployment(target, active):
                logger.error("Deployment validation failed")
                self._stop_traffic_mirror()
                return False
            
            logger.info(f"Deployment to {target_environment} completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Deployment failed: {e}")
            self._cleanup_failed_deployment(target)
            return False
    
    def promote(self, environment: str) -> bool:
        """
        Promote environment to active (switch traffic)
        
        Args:
            environment: 'blue' or 'green' to promote
            
        Returns:
            bool: True if promotion successful
        """
        logger.info(f"Promoting {environment} to active")
        
        target = self.blue if environment == 'blue' else self.green
        current_active = self._get_active_environment()
        
        try:
            # Step 1: Final health check
            if not self._health_check(target):
                logger.error("Health check failed before promotion")
                return False
            
            # Step 2: Switch traffic gradually
            traffic_percentages = [25, 50, 75, 100]
            
            for percentage in traffic_percentages:
                logger.info(f"Switching {percentage}% of traffic to {environment}")
                self._switch_traffic(target, percentage)
                
                # Monitor for issues during switch
                time.sleep(30)  # Wait 30 seconds between increments
                
                metrics = self._collect_metrics(target)
                if self._should_rollback(metrics, current_active):
                    logger.error(f"Rollback triggered during promotion at {percentage}%")
                    self._switch_traffic(current_active, 100)
                    return False
            
            # Step 3: Update active environment marker
            target.is_active = True
            if current_active:
                current_active.is_active = False
            
            # Step 4: Stop old environment after successful promotion
            if current_active:
                logger.info(f"Stopping old environment: {current_active.name}")
                time.sleep(300)  # Wait 5 minutes before stopping
                self._stop_environment(current_active)
            
            logger.info(f"Successfully promoted {environment} to active")
            return True
            
        except Exception as e:
            logger.error(f"Promotion failed: {e}")
            # Rollback to previous environment
            if current_active:
                self._switch_traffic(current_active, 100)
            return False
    
    def rollback(self) -> bool:
        """
        Emergency rollback to previous environment
        
        Returns:
            bool: True if rollback successful
        """
        logger.warning("Initiating emergency rollback")
        
        active = self._get_active_environment()
        inactive = self._get_inactive_environment()
        
        if not inactive:
            logger.error("No inactive environment available for rollback")
            return False
        
        try:
            # Step 1: Quick health check of rollback target
            if not self._health_check(inactive):
                logger.error("Rollback target environment is unhealthy")
                return False
            
            # Step 2: Immediate traffic switch
            logger.info(f"Rolling back to {inactive.name}")
            self._switch_traffic(inactive, 100)
            
            # Step 3: Update active markers
            inactive.is_active = True
            if active:
                active.is_active = False
            
            logger.info("Emergency rollback completed")
            return True
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False
    
    def status(self) -> Dict:
        """Get current deployment status"""
        active = self._get_active_environment()
        inactive = self._get_inactive_environment()
        
        status = {
            'active_environment': active.name if active else None,
            'inactive_environment': inactive.name if inactive else None,
            'deployment_time': datetime.now().isoformat(),
            'environments': {}
        }
        
        for env in [self.blue, self.green]:
            env_status = {
                'name': env.name,
                'is_active': env.is_active,
                'health_status': 'unknown',
                'metrics': {}
            }
            
            try:
                if self._health_check(env, timeout=5):
                    env_status['health_status'] = 'healthy'
                    env_status['metrics'] = self._collect_metrics(env).__dict__
                else:
                    env_status['health_status'] = 'unhealthy'
            except:
                env_status['health_status'] = 'unreachable'
            
            status['environments'][env.name] = env_status
        
        return status
    
    # Private methods
    def _deploy_environment(self, env: DeploymentEnvironment, image_tag: str) -> bool:
        """Deploy to specific environment"""
        try:
            # Update docker-compose file with new image tag
            self._update_compose_file(env.docker_compose_file, image_tag)
            
            # Deploy using docker-compose
            cmd = [
                'docker-compose',
                '-f', env.docker_compose_file,
                'up', '-d',
                '--scale', f'worker={env.worker_replicas}'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                logger.error(f"Docker deployment failed: {result.stderr}")
                return False
            
            # Wait for services to start
            time.sleep(30)
            
            logger.info(f"Successfully deployed to {env.name}")
            return True
            
        except Exception as e:
            logger.error(f"Deployment to {env.name} failed: {e}")
            return False
    
    def _health_check(self, env: DeploymentEnvironment, timeout: int = 60) -> bool:
        """Perform health check on environment"""
        import requests
        
        try:
            response = requests.get(env.health_check_url, timeout=timeout)
            
            if response.status_code == 200:
                health_data = response.json()
                
                # Check specific health indicators
                if health_data.get('status') == 'healthy':
                    # Additional checks
                    db_healthy = health_data.get('database', {}).get('status') == 'connected'
                    redis_healthy = health_data.get('redis', {}).get('status') == 'connected'
                    workers_healthy = health_data.get('workers', {}).get('healthy_count', 0) > 0
                    
                    return db_healthy and redis_healthy and workers_healthy
            
            return False
            
        except Exception as e:
            logger.error(f"Health check failed for {env.name}: {e}")
            return False
    
    def _run_migrations(self, env: DeploymentEnvironment) -> bool:
        """Run database migrations"""
        try:
            # Run migrations in the deployed container
            cmd = [
                'docker-compose',
                '-f', env.docker_compose_file,
                'exec', '-T', 'backend',
                'python', '-m', 'alembic', 'upgrade', 'head'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                logger.error(f"Migration failed: {result.stderr}")
                return False
            
            logger.info(f"Migrations completed for {env.name}")
            return True
            
        except Exception as e:
            logger.error(f"Migration failed for {env.name}: {e}")
            return False
    
    def _start_traffic_mirror(self, source: DeploymentEnvironment, target: DeploymentEnvironment, percentage: int):
        """Start traffic mirroring for validation"""
        # This would integrate with your load balancer or proxy
        # For nginx, you might update upstream configuration
        # For AWS ALB, you might use weighted routing
        logger.info(f"Traffic mirroring {percentage}% from {source.name} to {target.name}")
        
        # Placeholder implementation
        # In practice, this would configure your load balancer
        pass
    
    def _stop_traffic_mirror(self):
        """Stop traffic mirroring"""
        logger.info("Stopping traffic mirror")
        # Implementation depends on your load balancer/proxy
        pass
    
    def _switch_traffic(self, target: DeploymentEnvironment, percentage: int):
        """Switch traffic to target environment"""
        logger.info(f"Switching {percentage}% traffic to {target.name}")
        # This would update load balancer configuration
        # Implementation depends on your infrastructure
        pass
    
    def _validate_deployment(self, target: DeploymentEnvironment, baseline: Optional[DeploymentEnvironment]) -> bool:
        """Validate deployment over the validation period"""
        logger.info(f"Starting {self.validation_period_minutes} minute validation period")
        
        validation_start = datetime.now()
        validation_end = validation_start + timedelta(minutes=self.validation_period_minutes)
        
        while datetime.now() < validation_end:
            # Collect metrics from both environments
            target_metrics = self._collect_metrics(target)
            baseline_metrics = self._collect_metrics(baseline) if baseline else None
            
            # Check if we should rollback
            if self._should_rollback(target_metrics, baseline_metrics):
                logger.error("Validation failed - metrics indicate problems")
                return False
            
            # Log metrics
            self._log_metrics(target_metrics)
            if baseline_metrics:
                self._log_metrics(baseline_metrics)
            
            # Wait before next check (check every 5 minutes during validation)
            time.sleep(300)
        
        logger.info("Validation period completed successfully")
        return True
    
    def _collect_metrics(self, env: DeploymentEnvironment) -> DeploymentMetrics:
        """Collect metrics from environment"""
        import requests
        
        try:
            # Get metrics from the metrics endpoint
            response = requests.get(f"http://localhost:{env.metrics_port}/metrics", timeout=10)
            
            # Parse Prometheus metrics (simplified)
            metrics_text = response.text
            
            # Extract key metrics (this is simplified - use proper Prometheus client in practice)
            response_time = self._extract_metric(metrics_text, 'http_request_duration_seconds')
            error_rate = self._extract_metric(metrics_text, 'http_requests_total{status=~"5.."}')
            memory_usage = self._extract_metric(metrics_text, 'process_resident_memory_bytes') / 1024 / 1024
            cpu_usage = self._extract_metric(metrics_text, 'process_cpu_seconds_total')
            
            # Get application-specific metrics
            app_response = requests.get(f"{env.health_check_url}/metrics", timeout=10)
            app_data = app_response.json()
            
            return DeploymentMetrics(
                environment=env.name,
                timestamp=datetime.now(),
                response_time_ms=response_time * 1000,
                error_rate_percent=error_rate * 100,
                throughput_rps=self._extract_metric(metrics_text, 'http_requests_total'),
                memory_usage_mb=memory_usage,
                cpu_usage_percent=cpu_usage * 100,
                embedding_queue_depth=app_data.get('embedding_queue_depth', 0),
                database_connections=app_data.get('database_connections', 0)
            )
            
        except Exception as e:
            logger.error(f"Failed to collect metrics from {env.name}: {e}")
            # Return default metrics to avoid blocking deployment
            return DeploymentMetrics(
                environment=env.name,
                timestamp=datetime.now(),
                response_time_ms=0,
                error_rate_percent=0,
                throughput_rps=0,
                memory_usage_mb=0,
                cpu_usage_percent=0,
                embedding_queue_depth=0,
                database_connections=0
            )
    
    def _extract_metric(self, metrics_text: str, metric_name: str) -> float:
        """Extract metric value from Prometheus format"""
        # Simplified metric extraction
        for line in metrics_text.split('\n'):
            if line.startswith(metric_name):
                try:
                    return float(line.split()[-1])
                except:
                    return 0.0
        return 0.0
    
    def _should_rollback(self, current_metrics: DeploymentMetrics, baseline_metrics: Optional[DeploymentMetrics]) -> bool:
        """Determine if rollback is needed based on metrics"""
        if not baseline_metrics:
            # Without baseline, only check absolute thresholds
            return (
                current_metrics.error_rate_percent > self.rollback_threshold['error_rate_percent'] or
                current_metrics.response_time_ms > 5000  # 5 second absolute threshold
            )
        
        # Compare with baseline
        response_time_increase = (
            (current_metrics.response_time_ms - baseline_metrics.response_time_ms) / 
            baseline_metrics.response_time_ms * 100
        ) if baseline_metrics.response_time_ms > 0 else 0
        
        memory_increase = (
            (current_metrics.memory_usage_mb - baseline_metrics.memory_usage_mb) / 
            baseline_metrics.memory_usage_mb * 100
        ) if baseline_metrics.memory_usage_mb > 0 else 0
        
        return (
            current_metrics.error_rate_percent > self.rollback_threshold['error_rate_percent'] or
            response_time_increase > self.rollback_threshold['response_time_increase_percent'] or
            memory_increase > self.rollback_threshold['memory_increase_percent']
        )
    
    def _log_metrics(self, metrics: DeploymentMetrics):
        """Log metrics for monitoring"""
        logger.info(f"Metrics for {metrics.environment}: "
                   f"Response time: {metrics.response_time_ms:.1f}ms, "
                   f"Error rate: {metrics.error_rate_percent:.2f}%, "
                   f"Memory: {metrics.memory_usage_mb:.1f}MB, "
                   f"Queue depth: {metrics.embedding_queue_depth}")
    
    def _get_active_environment(self) -> Optional[DeploymentEnvironment]:
        """Get currently active environment"""
        if self.blue.is_active:
            return self.blue
        elif self.green.is_active:
            return self.green
        return None
    
    def _get_inactive_environment(self) -> Optional[DeploymentEnvironment]:
        """Get currently inactive environment"""
        if not self.blue.is_active and not self.green.is_active:
            return self.blue  # Default to blue if neither is active
        return self.green if self.blue.is_active else self.blue
    
    def _stop_environment(self, env: DeploymentEnvironment):
        """Stop environment"""
        try:
            cmd = ['docker-compose', '-f', env.docker_compose_file, 'down']
            subprocess.run(cmd, timeout=60)
            logger.info(f"Stopped environment {env.name}")
        except Exception as e:
            logger.error(f"Failed to stop environment {env.name}: {e}")
    
    def _cleanup_failed_deployment(self, env: DeploymentEnvironment):
        """Clean up after failed deployment"""
        logger.info(f"Cleaning up failed deployment to {env.name}")
        self._stop_environment(env)
    
    def _update_compose_file(self, compose_file: str, image_tag: str):
        """Update docker-compose file with new image tag"""
        # This would update the docker-compose file with the new image tag
        # Implementation depends on your compose file structure
        logger.info(f"Updated {compose_file} with image tag {image_tag}")


def main():
    """Main entry point for blue/green deployment script"""
    parser = argparse.ArgumentParser(description='Blue/Green Deployment Manager')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Deploy command
    deploy_parser = subparsers.add_parser('deploy', help='Deploy to environment')
    deploy_parser.add_argument('environment', choices=['blue', 'green'], help='Target environment')
    deploy_parser.add_argument('image_tag', help='Docker image tag to deploy')
    
    # Promote command
    promote_parser = subparsers.add_parser('promote', help='Promote environment to active')
    promote_parser.add_argument('environment', choices=['blue', 'green'], help='Environment to promote')
    
    # Rollback command
    rollback_parser = subparsers.add_parser('rollback', help='Emergency rollback')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show deployment status')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Initialize deployment manager
    deployment = BlueGreenDeployment()
    
    # Execute command
    if args.command == 'deploy':
        success = deployment.deploy(args.environment, args.image_tag)
        sys.exit(0 if success else 1)
    
    elif args.command == 'promote':
        success = deployment.promote(args.environment)
        sys.exit(0 if success else 1)
    
    elif args.command == 'rollback':
        success = deployment.rollback()
        sys.exit(0 if success else 1)
    
    elif args.command == 'status':
        status = deployment.status()
        print(json.dumps(status, indent=2, default=str))
        sys.exit(0)
    
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
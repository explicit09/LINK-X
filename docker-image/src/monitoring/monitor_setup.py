"""
Monitoring setup and initialization script.
Configures comprehensive monitoring for the LEARN-X application.
"""
import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
import psutil

# Add the src directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.monitoring import (
    setup_performance_monitoring,
    update_system_metrics,
    track_user_session,
    security_monitor
)
from monitoring.distributed_tracing import tracer, apm_collector
from monitoring.task_monitor import TaskMonitor

logger = logging.getLogger(__name__)

class MonitoringSetup:
    """Centralized monitoring setup and configuration"""
    
    def __init__(self):
        self.task_monitor = TaskMonitor()
        self.system_metrics_interval = 30  # seconds
        self.last_system_update = 0
        
    def initialize_monitoring(self, app=None):
        """Initialize all monitoring components"""
        try:
            logger.info("Initializing comprehensive monitoring system...")
            
            # Setup Flask monitoring if app provided
            if app:
                setup_performance_monitoring(app)
                logger.info("Flask performance monitoring initialized")
            
            # Initialize distributed tracing
            self._setup_distributed_tracing()
            
            # Setup system metrics collection
            self._setup_system_metrics()
            
            # Initialize security monitoring
            self._setup_security_monitoring()
            
            # Setup task monitoring
            self._setup_task_monitoring()
            
            # Register shutdown handlers
            self._setup_shutdown_handlers()
            
            logger.info("Monitoring system initialization completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize monitoring system: {e}")
            return False
    
    def _setup_distributed_tracing(self):
        """Setup distributed tracing components"""
        try:
            # Configure tracer
            tracer.service_name = "learn-x-backend"
            
            # Start a background trace for system initialization
            with tracer.trace("system.initialization") as span:
                span.add_tag("component", "monitoring")
                span.add_tag("version", "1.0.0")
                span.add_log("Distributed tracing initialized")
            
            logger.info("Distributed tracing initialized")
            
        except Exception as e:
            logger.error(f"Failed to setup distributed tracing: {e}")
    
    def _setup_system_metrics(self):
        """Setup system metrics collection"""
        try:
            # Collect initial system metrics
            metrics = apm_collector.collect_system_metrics()
            
            if metrics:
                memory_bytes = metrics.get('memory', {}).get('rss', 0)
                cpu_percent = metrics.get('cpu', {}).get('percent', 0)
                update_system_metrics("application", memory_bytes, cpu_percent)
            
            logger.info("System metrics collection initialized")
            
        except Exception as e:
            logger.error(f"Failed to setup system metrics: {e}")
    
    def _setup_security_monitoring(self):
        """Setup security monitoring components"""
        try:
            # Initialize security patterns
            security_monitor._failed_attempts = {}
            security_monitor._suspicious_patterns = {}
            
            logger.info("Security monitoring initialized")
            
        except Exception as e:
            logger.error(f"Failed to setup security monitoring: {e}")
    
    def _setup_task_monitoring(self):
        """Setup task monitoring components"""
        try:
            # Get initial task health report
            health_report = self.task_monitor.get_health_report()
            
            logger.info(f"Task monitoring initialized - Status: {health_report['status']}")
            
            if health_report['issues']:
                logger.warning(f"Initial health issues detected: {health_report['issues']}")
            
        except Exception as e:
            logger.error(f"Failed to setup task monitoring: {e}")
    
    def _setup_shutdown_handlers(self):
        """Setup graceful shutdown handlers"""
        import atexit
        import signal
        
        def cleanup_monitoring():
            """Cleanup monitoring resources"""
            try:
                logger.info("Cleaning up monitoring resources...")
                
                # Cleanup task monitor
                if hasattr(self, 'task_monitor'):
                    self.task_monitor.cleanup()
                
                # Final trace for shutdown
                with tracer.trace("system.shutdown") as span:
                    span.add_tag("component", "monitoring")
                    span.add_log("System shutdown initiated")
                
                logger.info("Monitoring cleanup completed")
                
            except Exception as e:
                logger.error(f"Error during monitoring cleanup: {e}")
        
        # Register cleanup handlers
        atexit.register(cleanup_monitoring)
        signal.signal(signal.SIGTERM, lambda signum, frame: cleanup_monitoring())
        signal.signal(signal.SIGINT, lambda signum, frame: cleanup_monitoring())
    
    def collect_startup_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive startup metrics"""
        try:
            with tracer.trace("monitoring.startup_metrics") as span:
                # System information
                system_info = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "python_version": sys.version,
                    "platform": sys.platform,
                    "pid": os.getpid(),
                    "working_directory": os.getcwd()
                }
                
                # Process information
                process = psutil.Process()
                process_info = {
                    "memory_mb": process.memory_info().rss / 1024 / 1024,
                    "cpu_percent": process.cpu_percent(),
                    "threads": process.num_threads(),
                    "create_time": datetime.fromtimestamp(process.create_time()).isoformat()
                }
                
                # System resources
                system_resources = {
                    "cpu_count": psutil.cpu_count(),
                    "memory_total_gb": psutil.virtual_memory().total / 1024 / 1024 / 1024,
                    "disk_usage_percent": psutil.disk_usage('/').percent,
                    "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
                }
                
                # Environment information
                env_info = {
                    "environment": os.getenv("ENVIRONMENT", "unknown"),
                    "debug_mode": os.getenv("DEBUG", "false").lower() == "true",
                    "log_level": os.getenv("LOG_LEVEL", "INFO")
                }
                
                # Task monitoring status
                task_health = self.task_monitor.get_health_report()
                
                startup_metrics = {
                    "system_info": system_info,
                    "process_info": process_info,
                    "system_resources": system_resources,
                    "environment": env_info,
                    "task_health": task_health,
                    "monitoring_components": {
                        "distributed_tracing": True,
                        "system_metrics": True,
                        "security_monitoring": True,
                        "task_monitoring": True
                    }
                }
                
                # Add metrics to span
                span.add_tag("startup.memory_mb", process_info["memory_mb"])
                span.add_tag("startup.cpu_count", system_resources["cpu_count"])
                span.add_tag("startup.environment", env_info["environment"])
                span.add_tag("startup.health_status", task_health["status"])
                
                logger.info(f"Startup metrics collected - Health: {task_health['status']}")
                return startup_metrics
                
        except Exception as e:
            logger.error(f"Failed to collect startup metrics: {e}")
            return {"error": str(e)}
    
    def update_periodic_metrics(self):
        """Update metrics that should be collected periodically"""
        try:
            current_time = datetime.utcnow().timestamp()
            
            # Update system metrics if interval has passed
            if current_time - self.last_system_update >= self.system_metrics_interval:
                with tracer.trace("monitoring.periodic_update") as span:
                    # Collect current system metrics
                    metrics = apm_collector.collect_system_metrics()
                    
                    if metrics:
                        memory_bytes = metrics.get('memory', {}).get('rss', 0)
                        cpu_percent = metrics.get('cpu', {}).get('percent', 0)
                        update_system_metrics("application", memory_bytes, cpu_percent)
                        
                        span.add_tag("system.memory_mb", memory_bytes / 1024 / 1024)
                        span.add_tag("system.cpu_percent", cpu_percent)
                    
                    # Update task health
                    health_report = self.task_monitor.get_health_report()
                    if health_report['status'] != 'healthy':
                        logger.warning(f"System health degraded: {health_report['status']} - {health_report['issues']}")
                    
                    self.last_system_update = current_time
                    
        except Exception as e:
            logger.error(f"Failed to update periodic metrics: {e}")
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring system status"""
        try:
            with tracer.trace("monitoring.status_check") as span:
                # Get system metrics
                system_metrics = apm_collector.collect_system_metrics()
                trace_metrics = apm_collector.collect_trace_metrics()
                
                # Get task monitoring status
                task_health = self.task_monitor.get_health_report()
                
                # Get active spans
                active_spans = len(tracer.get_active_spans())
                
                # Get recent performance summary
                performance_summary = apm_collector.get_performance_summary(hours=1)
                
                status = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "overall_health": task_health['status'],
                    "monitoring_components": {
                        "distributed_tracing": {
                            "active": True,
                            "active_spans": active_spans,
                            "metrics": trace_metrics
                        },
                        "system_metrics": {
                            "active": True,
                            "last_update": self.last_system_update,
                            "metrics": system_metrics
                        },
                        "task_monitoring": {
                            "active": True,
                            "health": task_health
                        },
                        "performance_summary": performance_summary
                    }
                }
                
                span.add_tag("status.overall_health", task_health['status'])
                span.add_tag("status.active_spans", active_spans)
                
                return status
                
        except Exception as e:
            logger.error(f"Failed to get monitoring status: {e}")
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

# Global monitoring setup instance
monitoring_setup = MonitoringSetup()

def initialize_monitoring(app=None):
    """Initialize monitoring system - main entry point"""
    return monitoring_setup.initialize_monitoring(app)

def get_monitoring_status():
    """Get current monitoring status"""
    return monitoring_setup.get_monitoring_status()

def update_periodic_metrics():
    """Update periodic metrics"""
    monitoring_setup.update_periodic_metrics()

def collect_startup_metrics():
    """Collect startup metrics"""
    return monitoring_setup.collect_startup_metrics()

if __name__ == "__main__":
    # CLI mode for testing monitoring setup
    import argparse
    
    parser = argparse.ArgumentParser(description="LEARN-X Monitoring Setup")
    parser.add_argument("--test", action="store_true", help="Test monitoring setup")
    parser.add_argument("--status", action="store_true", help="Show monitoring status")
    parser.add_argument("--startup", action="store_true", help="Collect startup metrics")
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    if args.test:
        print("Testing monitoring setup...")
        success = initialize_monitoring()
        print(f"Monitoring setup: {'SUCCESS' if success else 'FAILED'}")
        
    elif args.status:
        print("Getting monitoring status...")
        status = get_monitoring_status()
        import json
        print(json.dumps(status, indent=2))
        
    elif args.startup:
        print("Collecting startup metrics...")
        metrics = collect_startup_metrics()
        import json
        print(json.dumps(metrics, indent=2))
        
    else:
        print("Initializing monitoring system...")
        success = initialize_monitoring()
        if success:
            print("Monitoring system initialized successfully")
            
            # Show status
            status = get_monitoring_status()
            print(f"Overall health: {status.get('overall_health', 'unknown')}")
        else:
            print("Failed to initialize monitoring system")
            sys.exit(1)
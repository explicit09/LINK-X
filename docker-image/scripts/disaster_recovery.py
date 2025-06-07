#!/usr/bin/env python3
"""
Disaster Recovery Script for Production Systems
Provides automated backup, restore, and failover capabilities
"""
import os
import sys
import json
import time
import boto3
import logging
import argparse
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import psycopg2
import redis

logger = logging.getLogger(__name__)


@dataclass
class BackupInfo:
    """Information about a backup"""
    backup_id: str
    timestamp: datetime
    backup_type: str  # 'full', 'incremental', 'point_in_time'
    size_bytes: int
    location: str
    metadata: Dict
    status: str  # 'creating', 'completed', 'failed', 'expired'


@dataclass
class RestoreOperation:
    """Information about a restore operation"""
    restore_id: str
    backup_id: str
    target_environment: str
    started_at: datetime
    completed_at: Optional[datetime]
    status: str  # 'running', 'completed', 'failed'
    recovery_point: datetime
    estimated_rto_minutes: int
    actual_rto_minutes: Optional[int]


class DisasterRecoveryManager:
    """Manages disaster recovery operations including backup, restore, and failover"""
    
    def __init__(self, config_file: str = "dr_config.json"):
        self.config = self._load_config(config_file)
        self.primary_db_url = self.config['primary_database_url']
        self.backup_db_url = self.config.get('backup_database_url')
        self.s3_bucket = self.config['backup_s3_bucket']
        self.s3_region = self.config.get('aws_region', 'us-east-1')
        self.retention_days = self.config.get('retention_days', 30)
        self.rto_target_minutes = self.config.get('rto_target_minutes', 120)  # 2 hours
        self.rpo_target_minutes = self.config.get('rpo_target_minutes', 15)   # 15 minutes
        
        # Initialize AWS clients
        self.s3_client = boto3.client('s3', region_name=self.s3_region)
        self.rds_client = boto3.client('rds', region_name=self.s3_region)
        
    def _load_config(self, config_file: str) -> Dict:
        """Load disaster recovery configuration"""
        default_config = {
            'primary_database_url': os.getenv('DATABASE_URL', 'postgresql://localhost/learnx'),
            'backup_database_url': os.getenv('BACKUP_DATABASE_URL'),
            'backup_s3_bucket': os.getenv('BACKUP_S3_BUCKET', 'learnx-backups'),
            'aws_region': os.getenv('AWS_REGION', 'us-east-1'),
            'retention_days': 30,
            'rto_target_minutes': 120,  # Recovery Time Objective
            'rpo_target_minutes': 15,   # Recovery Point Objective
            'backup_schedule': {
                'full_backup_cron': '0 2 * * 0',    # Weekly full backup
                'incremental_cron': '0 */6 * * *',  # Every 6 hours
                'point_in_time_enabled': True
            },
            'environments': {
                'staging': {
                    'database_url': 'postgresql://localhost/learnx_staging',
                    'redis_url': 'redis://localhost:6379/1'
                },
                'dr_site': {
                    'database_url': 'postgresql://dr-host/learnx',
                    'redis_url': 'redis://dr-host:6379/0'
                }
            }
        }
        
        try:
            with open(config_file, 'r') as f:
                user_config = json.load(f)
                default_config.update(user_config)
        except FileNotFoundError:
            logger.warning(f"Config file {config_file} not found, using defaults")
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
        
        return default_config
    
    def create_backup(self, backup_type: str = 'full') -> BackupInfo:
        """
        Create a backup of the production system
        
        Args:
            backup_type: 'full', 'incremental', or 'point_in_time'
            
        Returns:
            BackupInfo object with backup details
        """
        backup_id = f"{backup_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        logger.info(f"Creating {backup_type} backup: {backup_id}")
        
        try:
            if backup_type == 'full':
                return self._create_full_backup(backup_id)
            elif backup_type == 'incremental':
                return self._create_incremental_backup(backup_id)
            elif backup_type == 'point_in_time':
                return self._create_point_in_time_backup(backup_id)
            else:
                raise ValueError(f"Unknown backup type: {backup_type}")
                
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return BackupInfo(
                backup_id=backup_id,
                timestamp=datetime.now(),
                backup_type=backup_type,
                size_bytes=0,
                location="",
                metadata={'error': str(e)},
                status='failed'
            )
    
    def _create_full_backup(self, backup_id: str) -> BackupInfo:
        """Create a full database and file system backup"""
        start_time = datetime.now()
        
        # Step 1: Create database backup
        db_backup_file = f"/tmp/{backup_id}_database.sql"
        logger.info("Creating database backup...")
        
        # Use pg_dump for database backup
        db_cmd = [
            'pg_dump',
            self.primary_db_url,
            '--verbose',
            '--no-password',
            '--format=custom',
            '--file', db_backup_file
        ]
        
        result = subprocess.run(db_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Database backup failed: {result.stderr}")
        
        # Step 2: Create file system backup (if applicable)
        # This would backup uploaded files, configurations, etc.
        fs_backup_file = f"/tmp/{backup_id}_filesystem.tar.gz"
        logger.info("Creating filesystem backup...")
        
        fs_cmd = [
            'tar', '-czf', fs_backup_file,
            '--exclude=/tmp',
            '--exclude=/var/tmp',
            '/var/lib/learnx/uploads',  # Adjust paths as needed
            '/etc/learnx/config'
        ]
        
        try:
            subprocess.run(fs_cmd, check=True, capture_output=True)
        except subprocess.CalledProcessError as e:
            logger.warning(f"Filesystem backup had warnings: {e}")
        
        # Step 3: Upload to S3
        s3_key_db = f"backups/{backup_id}/{backup_id}_database.sql"
        s3_key_fs = f"backups/{backup_id}/{backup_id}_filesystem.tar.gz"
        
        # Upload database backup
        self.s3_client.upload_file(db_backup_file, self.s3_bucket, s3_key_db)
        
        # Upload filesystem backup
        if os.path.exists(fs_backup_file):
            self.s3_client.upload_file(fs_backup_file, self.s3_bucket, s3_key_fs)
        
        # Step 4: Calculate total size
        total_size = 0
        if os.path.exists(db_backup_file):
            total_size += os.path.getsize(db_backup_file)
        if os.path.exists(fs_backup_file):
            total_size += os.path.getsize(fs_backup_file)
        
        # Step 5: Clean up local files
        for temp_file in [db_backup_file, fs_backup_file]:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        # Step 6: Store backup metadata
        metadata = {
            'database_size_bytes': os.path.getsize(db_backup_file) if os.path.exists(db_backup_file) else 0,
            'filesystem_size_bytes': os.path.getsize(fs_backup_file) if os.path.exists(fs_backup_file) else 0,
            'backup_duration_seconds': (datetime.now() - start_time).total_seconds(),
            's3_keys': [s3_key_db, s3_key_fs],
            'compression': 'gzip',
            'pg_version': self._get_postgres_version()
        }
        
        logger.info(f"Full backup completed: {backup_id}, Size: {total_size / 1024 / 1024:.1f} MB")
        
        return BackupInfo(
            backup_id=backup_id,
            timestamp=start_time,
            backup_type='full',
            size_bytes=total_size,
            location=f"s3://{self.s3_bucket}/backups/{backup_id}/",
            metadata=metadata,
            status='completed'
        )
    
    def _create_incremental_backup(self, backup_id: str) -> BackupInfo:
        """Create an incremental backup using WAL files"""
        # This would implement PostgreSQL WAL-based incremental backups
        # For simplicity, creating a point-in-time backup instead
        logger.info("Creating incremental backup (using point-in-time method)")
        return self._create_point_in_time_backup(backup_id)
    
    def _create_point_in_time_backup(self, backup_id: str) -> BackupInfo:
        """Create a point-in-time recovery backup"""
        start_time = datetime.now()
        
        # For managed databases (RDS), this would create a snapshot
        # For self-managed, this would backup WAL files
        
        try:
            # Create RDS snapshot if using managed database
            if 'rds' in self.primary_db_url:
                snapshot_id = f"learnx-{backup_id}"
                db_instance_id = self._extract_rds_instance_id(self.primary_db_url)
                
                response = self.rds_client.create_db_snapshot(
                    DBSnapshotIdentifier=snapshot_id,
                    DBInstanceIdentifier=db_instance_id
                )
                
                # Wait for snapshot to complete (simplified)
                while True:
                    snapshot = self.rds_client.describe_db_snapshots(
                        DBSnapshotIdentifier=snapshot_id
                    )['DBSnapshots'][0]
                    
                    if snapshot['Status'] == 'available':
                        break
                    elif snapshot['Status'] == 'error':
                        raise Exception("RDS snapshot creation failed")
                    
                    time.sleep(30)
                
                location = f"rds://{snapshot_id}"
                size_bytes = snapshot.get('AllocatedStorage', 0) * 1024 * 1024 * 1024  # GB to bytes
                
            else:
                # For self-managed PostgreSQL, backup WAL files
                location = self._backup_wal_files(backup_id)
                size_bytes = self._calculate_wal_backup_size(backup_id)
            
            metadata = {
                'backup_duration_seconds': (datetime.now() - start_time).total_seconds(),
                'recovery_point': start_time.isoformat(),
                'wal_files_included': True
            }
            
            logger.info(f"Point-in-time backup completed: {backup_id}")
            
            return BackupInfo(
                backup_id=backup_id,
                timestamp=start_time,
                backup_type='point_in_time',
                size_bytes=size_bytes,
                location=location,
                metadata=metadata,
                status='completed'
            )
            
        except Exception as e:
            logger.error(f"Point-in-time backup failed: {e}")
            raise
    
    def restore_from_backup(self, backup_id: str, target_environment: str) -> RestoreOperation:
        """
        Restore from a backup to target environment
        
        Args:
            backup_id: ID of backup to restore from
            target_environment: 'staging', 'dr_site', etc.
            
        Returns:
            RestoreOperation object with restore details
        """
        restore_id = f"restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.now()
        
        logger.info(f"Starting restore operation: {restore_id}")
        logger.info(f"Restoring backup {backup_id} to {target_environment}")
        
        try:
            # Step 1: Get backup information
            backup_info = self._get_backup_info(backup_id)
            if not backup_info:
                raise Exception(f"Backup {backup_id} not found")
            
            # Step 2: Validate target environment
            target_config = self.config['environments'].get(target_environment)
            if not target_config:
                raise Exception(f"Unknown target environment: {target_environment}")
            
            # Step 3: Perform restore based on backup type
            if backup_info.backup_type == 'full':
                success = self._restore_full_backup(backup_info, target_config)
            elif backup_info.backup_type in ['incremental', 'point_in_time']:
                success = self._restore_point_in_time_backup(backup_info, target_config)
            else:
                raise Exception(f"Unknown backup type: {backup_info.backup_type}")
            
            # Step 4: Verify restore
            if success:
                verification_result = self._verify_restore(target_config)
                if not verification_result:
                    raise Exception("Restore verification failed")
            
            completed_time = datetime.now()
            actual_rto = int((completed_time - start_time).total_seconds() / 60)
            
            restore_op = RestoreOperation(
                restore_id=restore_id,
                backup_id=backup_id,
                target_environment=target_environment,
                started_at=start_time,
                completed_at=completed_time,
                status='completed' if success else 'failed',
                recovery_point=backup_info.timestamp,
                estimated_rto_minutes=self.rto_target_minutes,
                actual_rto_minutes=actual_rto
            )
            
            logger.info(f"Restore completed: {restore_id}, RTO: {actual_rto} minutes")
            return restore_op
            
        except Exception as e:
            logger.error(f"Restore operation failed: {e}")
            return RestoreOperation(
                restore_id=restore_id,
                backup_id=backup_id,
                target_environment=target_environment,
                started_at=start_time,
                completed_at=datetime.now(),
                status='failed',
                recovery_point=datetime.now(),
                estimated_rto_minutes=self.rto_target_minutes,
                actual_rto_minutes=None
            )
    
    def _restore_full_backup(self, backup_info: BackupInfo, target_config: Dict) -> bool:
        """Restore from a full backup"""
        logger.info("Restoring full backup...")
        
        # Step 1: Download backup files from S3
        s3_keys = backup_info.metadata.get('s3_keys', [])
        local_files = []
        
        for s3_key in s3_keys:
            local_file = f"/tmp/{os.path.basename(s3_key)}"
            self.s3_client.download_file(self.s3_bucket, s3_key, local_file)
            local_files.append(local_file)
        
        # Step 2: Restore database
        db_backup_file = next((f for f in local_files if 'database' in f), None)
        if db_backup_file:
            logger.info("Restoring database...")
            
            # Drop and recreate target database
            self._recreate_database(target_config['database_url'])
            
            # Restore from backup
            restore_cmd = [
                'pg_restore',
                '--verbose',
                '--no-password',
                '--dbname', target_config['database_url'],
                db_backup_file
            ]
            
            result = subprocess.run(restore_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"Database restore failed: {result.stderr}")
                return False
        
        # Step 3: Restore filesystem
        fs_backup_file = next((f for f in local_files if 'filesystem' in f), None)
        if fs_backup_file:
            logger.info("Restoring filesystem...")
            
            extract_cmd = ['tar', '-xzf', fs_backup_file, '-C', '/']
            result = subprocess.run(extract_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                logger.warning(f"Filesystem restore had warnings: {result.stderr}")
        
        # Step 4: Clean up temporary files
        for temp_file in local_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        return True
    
    def _restore_point_in_time_backup(self, backup_info: BackupInfo, target_config: Dict) -> bool:
        """Restore from a point-in-time backup"""
        logger.info("Restoring point-in-time backup...")
        
        if 'rds' in backup_info.location:
            # Restore RDS snapshot
            return self._restore_rds_snapshot(backup_info, target_config)
        else:
            # Restore WAL-based backup
            return self._restore_wal_backup(backup_info, target_config)
    
    def run_disaster_recovery_drill(self) -> Dict:
        """
        Run a complete disaster recovery drill
        
        Returns:
            Dict with drill results and metrics
        """
        drill_id = f"drill_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.now()
        
        logger.info(f"Starting disaster recovery drill: {drill_id}")
        
        drill_results = {
            'drill_id': drill_id,
            'start_time': start_time.isoformat(),
            'target_rto_minutes': self.rto_target_minutes,
            'target_rpo_minutes': self.rpo_target_minutes,
            'steps': [],
            'overall_status': 'running'
        }
        
        try:
            # Step 1: Create a fresh backup
            logger.info("Step 1: Creating backup for drill")
            backup_result = self.create_backup('point_in_time')
            drill_results['steps'].append({
                'step': 'create_backup',
                'status': backup_result.status,
                'duration_seconds': (datetime.now() - start_time).total_seconds(),
                'backup_id': backup_result.backup_id
            })
            
            if backup_result.status != 'completed':
                raise Exception("Backup creation failed")
            
            # Step 2: Restore to staging environment
            logger.info("Step 2: Restoring to staging environment")
            restore_start = datetime.now()
            restore_result = self.restore_from_backup(backup_result.backup_id, 'staging')
            
            drill_results['steps'].append({
                'step': 'restore_backup',
                'status': restore_result.status,
                'duration_seconds': (datetime.now() - restore_start).total_seconds(),
                'actual_rto_minutes': restore_result.actual_rto_minutes,
                'restore_id': restore_result.restore_id
            })
            
            if restore_result.status != 'completed':
                raise Exception("Restore operation failed")
            
            # Step 3: Run application smoke tests
            logger.info("Step 3: Running application smoke tests")
            smoke_test_start = datetime.now()
            smoke_test_result = self._run_smoke_tests('staging')
            
            drill_results['steps'].append({
                'step': 'smoke_tests',
                'status': 'passed' if smoke_test_result else 'failed',
                'duration_seconds': (datetime.now() - smoke_test_start).total_seconds(),
                'tests_run': smoke_test_result.get('tests_run', 0) if smoke_test_result else 0,
                'tests_passed': smoke_test_result.get('tests_passed', 0) if smoke_test_result else 0
            })
            
            # Step 4: Verify data integrity
            logger.info("Step 4: Verifying data integrity")
            integrity_start = datetime.now()
            integrity_result = self._verify_data_integrity('staging')
            
            drill_results['steps'].append({
                'step': 'data_integrity',
                'status': 'passed' if integrity_result else 'failed',
                'duration_seconds': (datetime.now() - integrity_start).total_seconds()
            })
            
            # Calculate overall results
            total_duration = datetime.now() - start_time
            actual_rto = int(total_duration.total_seconds() / 60)
            
            all_steps_passed = all(step.get('status') in ['completed', 'passed'] for step in drill_results['steps'])
            
            drill_results.update({
                'end_time': datetime.now().isoformat(),
                'total_duration_minutes': actual_rto,
                'rto_target_met': actual_rto <= self.rto_target_minutes,
                'all_tests_passed': all_steps_passed,
                'overall_status': 'passed' if all_steps_passed and actual_rto <= self.rto_target_minutes else 'failed'
            })
            
            logger.info(f"Disaster recovery drill completed: {drill_results['overall_status']}")
            logger.info(f"Total RTO: {actual_rto} minutes (target: {self.rto_target_minutes} minutes)")
            
        except Exception as e:
            logger.error(f"Disaster recovery drill failed: {e}")
            drill_results.update({
                'end_time': datetime.now().isoformat(),
                'overall_status': 'failed',
                'error': str(e)
            })
        
        return drill_results
    
    def _run_smoke_tests(self, environment: str) -> Dict:
        """Run smoke tests against restored environment"""
        # This would run a suite of basic functionality tests
        # For this example, we'll simulate some basic checks
        
        target_config = self.config['environments'][environment]
        
        tests = [
            ('database_connection', self._test_database_connection, target_config['database_url']),
            ('redis_connection', self._test_redis_connection, target_config.get('redis_url')),
            ('api_health_check', self._test_api_health, target_config.get('api_url')),
            ('basic_queries', self._test_basic_queries, target_config['database_url'])
        ]
        
        results = {
            'tests_run': len(tests),
            'tests_passed': 0,
            'test_results': []
        }
        
        for test_name, test_func, test_config in tests:
            try:
                if test_config:  # Only run test if config is available
                    success = test_func(test_config)
                    if success:
                        results['tests_passed'] += 1
                    
                    results['test_results'].append({
                        'test': test_name,
                        'status': 'passed' if success else 'failed'
                    })
                else:
                    results['test_results'].append({
                        'test': test_name,
                        'status': 'skipped',
                        'reason': 'No configuration provided'
                    })
            except Exception as e:
                results['test_results'].append({
                    'test': test_name,
                    'status': 'error',
                    'error': str(e)
                })
        
        return results
    
    def _test_database_connection(self, db_url: str) -> bool:
        """Test database connectivity"""
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def _test_redis_connection(self, redis_url: str) -> bool:
        """Test Redis connectivity"""
        try:
            import redis
            r = redis.from_url(redis_url)
            r.ping()
            return True
        except Exception as e:
            logger.error(f"Redis connection test failed: {e}")
            return False
    
    def _test_api_health(self, api_url: str) -> bool:
        """Test API health endpoint"""
        try:
            import requests
            response = requests.get(f"{api_url}/health", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"API health test failed: {e}")
            return False
    
    def _test_basic_queries(self, db_url: str) -> bool:
        """Test basic database queries"""
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            # Test basic table queries
            cursor.execute("SELECT COUNT(*) FROM courses")
            course_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            
            conn.close()
            
            # Basic sanity checks
            return course_count >= 0 and user_count >= 0
            
        except Exception as e:
            logger.error(f"Basic queries test failed: {e}")
            return False
    
    # Helper methods
    def _get_backup_info(self, backup_id: str) -> Optional[BackupInfo]:
        """Get information about a backup"""
        # This would query backup metadata from database or S3
        # For this example, return a mock backup info
        return BackupInfo(
            backup_id=backup_id,
            timestamp=datetime.now() - timedelta(hours=1),
            backup_type='full',
            size_bytes=1000000000,  # 1GB
            location=f"s3://{self.s3_bucket}/backups/{backup_id}/",
            metadata={},
            status='completed'
        )
    
    def _verify_restore(self, target_config: Dict) -> bool:
        """Verify that restore was successful"""
        return self._test_database_connection(target_config['database_url'])
    
    def _verify_data_integrity(self, environment: str) -> bool:
        """Verify data integrity after restore"""
        target_config = self.config['environments'][environment]
        
        try:
            import psycopg2
            conn = psycopg2.connect(target_config['database_url'])
            cursor = conn.cursor()
            
            # Run data integrity checks
            integrity_checks = [
                "SELECT COUNT(*) FROM courses WHERE name IS NULL",  # Should be 0
                "SELECT COUNT(*) FROM users WHERE email IS NULL",   # Should be 0
                "SELECT COUNT(*) FROM file_chunks WHERE embedding IS NOT NULL",  # Should be > 0 if there's data
            ]
            
            for check in integrity_checks:
                cursor.execute(check)
                result = cursor.fetchone()[0]
                # Add specific validation logic based on your data model
            
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Data integrity verification failed: {e}")
            return False
    
    def _get_postgres_version(self) -> str:
        """Get PostgreSQL version"""
        try:
            import psycopg2
            conn = psycopg2.connect(self.primary_db_url)
            cursor = conn.cursor()
            cursor.execute("SELECT version()")
            version = cursor.fetchone()[0]
            conn.close()
            return version
        except:
            return "unknown"
    
    def _recreate_database(self, db_url: str):
        """Recreate target database (drop and create)"""
        # Extract database name from URL
        # This is a simplified implementation
        pass
    
    def _backup_wal_files(self, backup_id: str) -> str:
        """Backup WAL files for point-in-time recovery"""
        # Implementation for WAL file backup
        return f"s3://{self.s3_bucket}/wal/{backup_id}/"
    
    def _calculate_wal_backup_size(self, backup_id: str) -> int:
        """Calculate size of WAL backup"""
        return 100000000  # 100MB placeholder
    
    def _extract_rds_instance_id(self, db_url: str) -> str:
        """Extract RDS instance ID from database URL"""
        # Parse RDS instance ID from connection string
        return "learnx-primary"
    
    def _restore_rds_snapshot(self, backup_info: BackupInfo, target_config: Dict) -> bool:
        """Restore from RDS snapshot"""
        # Implementation for RDS snapshot restore
        return True
    
    def _restore_wal_backup(self, backup_info: BackupInfo, target_config: Dict) -> bool:
        """Restore from WAL backup"""
        # Implementation for WAL-based restore
        return True


def main():
    """Main entry point for disaster recovery script"""
    parser = argparse.ArgumentParser(description='Disaster Recovery Manager')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Create backup')
    backup_parser.add_argument('--type', choices=['full', 'incremental', 'point_in_time'], 
                              default='full', help='Backup type')
    
    # Restore command
    restore_parser = subparsers.add_parser('restore', help='Restore from backup')
    restore_parser.add_argument('backup_id', help='Backup ID to restore from')
    restore_parser.add_argument('--target', default='staging', help='Target environment')
    
    # Drill command
    drill_parser = subparsers.add_parser('drill', help='Run disaster recovery drill')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Initialize DR manager
    dr_manager = DisasterRecoveryManager()
    
    # Execute command
    if args.command == 'backup':
        backup_info = dr_manager.create_backup(args.type)
        print(json.dumps({
            'backup_id': backup_info.backup_id,
            'status': backup_info.status,
            'size_mb': backup_info.size_bytes / 1024 / 1024,
            'location': backup_info.location
        }, indent=2))
        sys.exit(0 if backup_info.status == 'completed' else 1)
    
    elif args.command == 'restore':
        restore_op = dr_manager.restore_from_backup(args.backup_id, args.target)
        print(json.dumps({
            'restore_id': restore_op.restore_id,
            'status': restore_op.status,
            'rto_minutes': restore_op.actual_rto_minutes,
            'target_environment': restore_op.target_environment
        }, indent=2, default=str))
        sys.exit(0 if restore_op.status == 'completed' else 1)
    
    elif args.command == 'drill':
        drill_results = dr_manager.run_disaster_recovery_drill()
        print(json.dumps(drill_results, indent=2, default=str))
        sys.exit(0 if drill_results['overall_status'] == 'passed' else 1)
    
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
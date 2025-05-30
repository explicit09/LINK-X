"""
Task monitoring and management utilities.
Provides insights into background task processing.
"""
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import redis
from celery import states
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from celery_app import app as celery_app

# Redis client for direct access
redis_client = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))

# Database setup
POSTGRES_URL = os.getenv("POSTGRES_URL")
engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)

class TaskMonitor:
    """Monitor and manage background tasks."""
    
    def __init__(self):
        self.celery_app = celery_app
        self.redis = redis_client
        self.db = Session()
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get detailed status of a specific task."""
        result = self.celery_app.AsyncResult(task_id)
        
        status = {
            'task_id': task_id,
            'state': result.state,
            'ready': result.ready(),
            'successful': result.successful() if result.ready() else None,
            'failed': result.failed() if result.ready() else None,
        }
        
        # Add result or error info
        if result.ready():
            if result.successful():
                status['result'] = result.result
            else:
                status['error'] = str(result.info)
                status['traceback'] = result.traceback
        else:
            # Task is still running or pending
            status['info'] = result.info
        
        return status
    
    def get_active_tasks(self) -> List[Dict[str, Any]]:
        """Get all currently active tasks."""
        inspect = self.celery_app.control.inspect()
        
        active_tasks = []
        active = inspect.active()
        
        if active:
            for worker, tasks in active.items():
                for task in tasks:
                    active_tasks.append({
                        'worker': worker,
                        'task_id': task['id'],
                        'name': task['name'],
                        'args': task.get('args', []),
                        'kwargs': task.get('kwargs', {}),
                        'time_start': task.get('time_start'),
                    })
        
        return active_tasks
    
    def get_scheduled_tasks(self) -> List[Dict[str, Any]]:
        """Get all scheduled tasks."""
        inspect = self.celery_app.control.inspect()
        
        scheduled_tasks = []
        scheduled = inspect.scheduled()
        
        if scheduled:
            for worker, tasks in scheduled.items():
                for task in tasks:
                    scheduled_tasks.append({
                        'worker': worker,
                        'task_id': task['request']['id'],
                        'name': task['request']['name'],
                        'eta': task['eta'],
                        'priority': task.get('priority'),
                    })
        
        return scheduled_tasks
    
    def get_queue_stats(self) -> Dict[str, int]:
        """Get statistics for all queues."""
        queues = ['critical', 'high', 'default', 'low', 'embeddings']
        stats = {}
        
        for queue in queues:
            queue_key = f"celery:queue:{queue}"
            length = self.redis.llen(queue_key)
            stats[queue] = length
        
        return stats
    
    def get_worker_stats(self) -> List[Dict[str, Any]]:
        """Get statistics for all workers."""
        inspect = self.celery_app.control.inspect()
        
        stats = inspect.stats()
        worker_stats = []
        
        if stats:
            for worker, info in stats.items():
                worker_stats.append({
                    'worker': worker,
                    'total_tasks': info.get('total', {}),
                    'pool': info.get('pool', {}),
                    'rusage': info.get('rusage', {}),
                })
        
        return worker_stats
    
    def get_indexing_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get file indexing statistics."""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        stats = {}
        
        # Files processed
        result = self.db.execute(text("""
            SELECT 
                COUNT(DISTINCT f.id) as files_with_chunks,
                COUNT(fc.id) as total_chunks,
                AVG(chunk_count) as avg_chunks_per_file
            FROM "File" f
            JOIN (
                SELECT file_id, COUNT(*) as chunk_count
                FROM "FileChunk"
                WHERE created_at > :cutoff
                GROUP BY file_id
            ) fc ON f.id = fc.file_id
        """), {"cutoff": cutoff}).fetchone()
        
        if result:
            stats['files_indexed'] = result[0]
            stats['total_chunks'] = result[1]
            stats['avg_chunks_per_file'] = float(result[2]) if result[2] else 0
        
        # Files pending
        pending = self.db.execute(text("""
            SELECT COUNT(*) 
            FROM "File" f
            WHERE f.created_at > :cutoff
            AND NOT EXISTS (
                SELECT 1 FROM "FileChunk" fc WHERE fc.file_id = f.id
            )
        """), {"cutoff": cutoff}).scalar()
        
        stats['files_pending'] = pending
        
        # Processing rate
        hourly_stats = self.db.execute(text("""
            SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                COUNT(DISTINCT file_id) as files,
                COUNT(*) as chunks
            FROM "FileChunk"
            WHERE created_at > :cutoff
            GROUP BY hour
            ORDER BY hour DESC
            LIMIT 24
        """), {"cutoff": cutoff}).fetchall()
        
        stats['hourly_processing'] = [
            {
                'hour': row[0].isoformat(),
                'files': row[1],
                'chunks': row[2]
            }
            for row in hourly_stats
        ]
        
        return stats
    
    def retry_failed_tasks(self, hours: int = 1) -> Dict[str, Any]:
        """Retry failed indexing tasks."""
        # Find files without chunks that are older than specified hours
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        failed_files = self.db.execute(text("""
            SELECT f.id
            FROM "File" f
            WHERE f.created_at < :cutoff
            AND NOT EXISTS (
                SELECT 1 FROM "FileChunk" fc WHERE fc.file_id = f.id
            )
            LIMIT 100
        """), {"cutoff": cutoff}).fetchall()
        
        retried = 0
        for row in failed_files:
            file_id = str(row[0])
            from tasks import index_file
            index_file.apply_async(args=[file_id], queue='high')
            retried += 1
        
        return {
            'files_retried': retried,
            'cutoff_time': cutoff.isoformat()
        }
    
    def cancel_task(self, task_id: str) -> bool:
        """Cancel a specific task."""
        try:
            self.celery_app.control.revoke(task_id, terminate=True)
            return True
        except Exception:
            return False
    
    def purge_queue(self, queue_name: str) -> int:
        """Purge all tasks from a specific queue."""
        from kombu import Queue
        
        with self.celery_app.connection_or_acquire() as conn:
            queue = Queue(queue_name, channel=conn.default_channel)
            return queue.purge()
    
    def get_health_report(self) -> Dict[str, Any]:
        """Get comprehensive health report."""
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'healthy',
            'issues': []
        }
        
        # Check queue lengths
        queue_stats = self.get_queue_stats()
        for queue, length in queue_stats.items():
            if length > 1000:
                report['issues'].append(f"Queue '{queue}' has {length} pending tasks")
                report['status'] = 'degraded'
        
        # Check for stuck files
        stuck_files = self.db.execute(text("""
            SELECT COUNT(*) 
            FROM "File" f
            WHERE f.created_at < :cutoff
            AND NOT EXISTS (
                SELECT 1 FROM "FileChunk" fc WHERE fc.file_id = f.id
            )
        """), {
            "cutoff": datetime.utcnow() - timedelta(hours=2)
        }).scalar()
        
        if stuck_files > 50:
            report['issues'].append(f"{stuck_files} files stuck without indexing for >2 hours")
            report['status'] = 'degraded'
        
        # Check worker availability
        workers = self.get_worker_stats()
        if not workers:
            report['issues'].append("No Celery workers available")
            report['status'] = 'unhealthy'
        
        report['summary'] = {
            'queues': queue_stats,
            'workers': len(workers),
            'stuck_files': stuck_files
        }
        
        return report
    
    def cleanup(self):
        """Cleanup resources."""
        self.db.close()

# CLI commands for monitoring
def print_task_status(task_id: str):
    """Print task status to console."""
    monitor = TaskMonitor()
    status = monitor.get_task_status(task_id)
    
    print(f"Task ID: {status['task_id']}")
    print(f"State: {status['state']}")
    print(f"Ready: {status['ready']}")
    
    if status['ready']:
        if status['successful']:
            print(f"Result: {status['result']}")
        else:
            print(f"Error: {status['error']}")
    else:
        print(f"Info: {status.get('info', 'N/A')}")
    
    monitor.cleanup()

def print_health_report():
    """Print health report to console."""
    monitor = TaskMonitor()
    report = monitor.get_health_report()
    
    print(f"Health Status: {report['status']}")
    print(f"Timestamp: {report['timestamp']}")
    
    if report['issues']:
        print("\nIssues:")
        for issue in report['issues']:
            print(f"  - {issue}")
    
    print("\nSummary:")
    print(f"  Workers: {report['summary']['workers']}")
    print(f"  Stuck Files: {report['summary']['stuck_files']}")
    print("\n  Queue Lengths:")
    for queue, length in report['summary']['queues'].items():
        print(f"    {queue}: {length}")
    
    monitor.cleanup()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "status" and len(sys.argv) > 2:
            print_task_status(sys.argv[2])
        elif sys.argv[1] == "health":
            print_health_report()
        else:
            print("Usage: python task_monitor.py [status <task_id>|health]")
    else:
        print_health_report()
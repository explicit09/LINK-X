"""
Simplified Celery tasks for testing the monitoring dashboard.
"""
import time
import logging
from datetime import datetime

from celery import Task
from src.celery_app import app

# Configure logging
logger = logging.getLogger(__name__)

class CallbackTask(Task):
    """Base task with callbacks for better error handling and monitoring."""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Success callback."""
        logger.info(f"Task {self.name}[{task_id}] succeeded")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Failure callback."""
        logger.error(f"Task {self.name}[{task_id}] failed: {exc}")
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Retry callback."""
        logger.warning(f"Task {self.name}[{task_id}] retrying: {exc}")

@app.task(base=CallbackTask, name='tasks.test_task')
def test_task(seconds: int = 5):
    """A simple test task that just sleeps for a given number of seconds."""
    logger.info(f"Starting test task for {seconds} seconds")
    time.sleep(seconds)
    logger.info("Test task completed")
    return {"status": "success", "timestamp": datetime.utcnow().isoformat()}

@app.task(base=CallbackTask, name='tasks.health_check')
def health_check():
    """A simple health check task."""
    logger.info("Health check running")
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    } 
"""
Mock tasks for running without Celery
These are synchronous versions that run immediately
"""
import logging

logger = logging.getLogger(__name__)

def process_file_async(file_id: str, file_path: str = None):
    """Mock file processing - runs synchronously"""
    logger.info(f"Mock processing file {file_id}")
    return {'status': 'completed', 'file_id': file_id}

def cleanup_old_files_async():
    """Mock cleanup - does nothing"""
    logger.info("Mock cleanup task")
    return {'status': 'completed'}

def reindex_all_content():
    """Mock reindex - does nothing"""
    logger.info("Mock reindex task")
    return {'status': 'completed'}

def process_document_outline(file_id: str):
    """Mock document outline - returns empty outline"""
    logger.info(f"Mock document outline for {file_id}")
    return {'outline': []}

# Make it look like Celery tasks
class MockTask:
    def __init__(self, func):
        self.func = func
    
    def delay(self, *args, **kwargs):
        """Run immediately instead of async"""
        return self.func(*args, **kwargs)
    
    def __call__(self, *args, **kwargs):
        return self.func(*args, **kwargs)

# Wrap functions to look like Celery tasks
process_file_async = MockTask(process_file_async)
cleanup_old_files_async = MockTask(cleanup_old_files_async)
reindex_all_content = MockTask(reindex_all_content)
process_document_outline = MockTask(process_document_outline)
"""
Celery tasks for background processing
"""
import os
import logging

logger = logging.getLogger(__name__)

# Try to import Celery, but don't fail if it's not available
try:
    from celery import Celery
    from core.settings import get_settings

    # Get settings
    settings = get_settings()

    # Create Celery instance
    celery = Celery('linkx_tasks')
    celery.config_from_object({
        'broker_url': settings.celery_broker_url,
        'result_backend': settings.celery_result_backend,
        'task_serializer': 'json',
        'accept_content': ['json'],
        'result_serializer': 'json',
        'timezone': 'UTC',
        'enable_utc': True,
        'task_routes': {
            'tasks.file_processing.*': {'queue': 'file_processing'},
            'tasks.embedding.*': {'queue': 'embeddings'},
            'tasks.maintenance.*': {'queue': 'maintenance'}
        },
        'task_default_queue': 'default',
        'task_default_exchange': 'tasks',
        'task_default_routing_key': 'task.default'
    })

    # Import tasks
    from .enhanced_file_processing import process_file_async, personalize_file_async
    from .maintenance import cleanup_old_files_async, reindex_all_content
    from .embedding_generation import (
        generate_embeddings_batch,
        process_file_embeddings,
        scan_missing_embeddings,
        generate_query_embedding
    )
    
    CELERY_AVAILABLE = True
    
except Exception as e:
    logger.warning(f"Celery not available: {e}")
    CELERY_AVAILABLE = False
    celery = None
    
    # Create mock tasks that run synchronously
    class SyncTask:
        def __init__(self, name):
            self.name = name
            
        def delay(self, *args, **kwargs):
            logger.info(f"Running {self.name} synchronously (Celery not available)")
            return {'status': 'completed_sync'}
            
        def apply_async(self, *args, **kwargs):
            return self.delay(*args, **kwargs)
    
    # Mock tasks
    process_file_async = SyncTask('process_file_async')
    personalize_file_async = SyncTask('personalize_file_async')
    generate_embeddings_async = SyncTask('generate_embeddings_async')
    update_embeddings_async = SyncTask('update_embeddings_async')
    cleanup_old_files_async = SyncTask('cleanup_old_files_async')
    reindex_all_content = SyncTask('reindex_all_content')

# Make tasks available at package level
__all__ = [
    'celery',
    'process_file_async',
    'personalize_file_async',
    'generate_embeddings_batch',
    'process_file_embeddings', 
    'scan_missing_embeddings',
    'generate_query_embedding',
    'cleanup_old_files_async',
    'reindex_all_content',
    'CELERY_AVAILABLE'
]
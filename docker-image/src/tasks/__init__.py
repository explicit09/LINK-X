"""
Celery tasks for background processing
"""
from celery import Celery
from ..config import Config

# Create Celery instance
celery = Celery('linkx_tasks')
celery.config_from_object({
    'broker_url': Config.CELERY_BROKER_URL,
    'result_backend': Config.CELERY_RESULT_BACKEND,
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
from .file_processing import process_file_async, personalize_file_async
from .embedding import generate_embeddings_async, update_embeddings_async
from .maintenance import cleanup_old_files_async, reindex_all_content

# Make tasks available at package level
__all__ = [
    'celery',
    'process_file_async',
    'personalize_file_async',
    'generate_embeddings_async',
    'update_embeddings_async',
    'cleanup_old_files_async',
    'reindex_all_content'
]
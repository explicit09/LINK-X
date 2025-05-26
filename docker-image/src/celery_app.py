"""
Celery configuration for background task processing.
Handles file indexing, embedding generation, and other async tasks.
"""
import os
from celery import Celery
from kombu import Exchange, Queue
from datetime import timedelta

# Redis configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Create Celery app
app = Celery('learnx')

# Celery configuration
app.conf.update(
    broker_url=REDIS_URL,
    result_backend=REDIS_URL,
    
    # Task execution settings
    task_track_started=True,
    task_time_limit=3600,  # 1 hour hard limit
    task_soft_time_limit=3000,  # 50 min soft limit
    task_acks_late=True,  # Ensure tasks aren't lost on worker restart
    worker_prefetch_multiplier=1,  # Process one task at a time per worker
    
    # Result settings
    result_expires=86400,  # Results expire after 24 hours
    result_persistent=True,
    
    # Serialization
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Rate limiting
    task_annotations={
        'tasks.index_file': {'rate_limit': '10/m'},  # Max 10 files per minute
        'tasks.generate_embeddings': {'rate_limit': '100/m'},  # Max 100 embedding batches per minute
    },
    
    # Retry settings
    task_autoretry_for=(Exception,),
    task_retry_kwargs={'max_retries': 3, 'countdown': 60},
    task_retry_backoff=True,
    task_retry_backoff_max=600,  # Max 10 min between retries
    task_retry_jitter=True,
    
    # Queue configuration
    task_default_queue='default',
    task_create_missing_queues=True,
    
    # Define queues with different priorities
    task_queues=(
        Queue('critical', Exchange('critical'), routing_key='critical', priority=10),
        Queue('high', Exchange('high'), routing_key='high', priority=7),
        Queue('default', Exchange('default'), routing_key='default', priority=5),
        Queue('low', Exchange('low'), routing_key='low', priority=3),
        Queue('embeddings', Exchange('embeddings'), routing_key='embeddings', priority=4),
    ),
    
    # Route tasks to appropriate queues
    task_routes={
        'tasks.index_file': {'queue': 'high'},
        'tasks.generate_embeddings': {'queue': 'embeddings'},
        'tasks.cleanup_old_chunks': {'queue': 'low'},
        'tasks.reindex_course': {'queue': 'default'},
        'tasks.health_check': {'queue': 'critical'},
    },
    
    # Beat schedule for periodic tasks
    beat_schedule={
        'cleanup-old-chunks': {
            'task': 'tasks.cleanup_old_chunks',
            'schedule': timedelta(hours=24),  # Daily
            'options': {'queue': 'low'}
        },
        'health-check': {
            'task': 'tasks.health_check',
            'schedule': timedelta(minutes=5),  # Every 5 minutes
            'options': {'queue': 'critical'}
        },
        'vacuum-analyze': {
            'task': 'tasks.vacuum_analyze_chunks',
            'schedule': timedelta(hours=6),  # Every 6 hours
            'options': {'queue': 'low'}
        },
    },
)

# Import tasks to register them
try:
    import src.tasks
except ImportError:
    app.autodiscover_tasks(['src'])
"""
Celery configuration for background task processing.
Handles file indexing, embedding generation, and other async tasks.
"""
import os
import sys
import logging
from celery import Celery
from kombu import Exchange, Queue
from datetime import timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis configuration with better error handling
REDIS_URL = os.getenv('REDIS_URL')

if not REDIS_URL:
    logger.error("REDIS_URL environment variable is not set!")
    logger.error("Please set REDIS_URL to your Redis connection string")
    logger.error("Example: redis://your-redis-host:6379/0")
    # Don't exit here, let Celery show its own error for debugging
    REDIS_URL = 'redis://localhost:6379/0'  # Fallback for local development

logger.info(f"Celery connecting to Redis: {REDIS_URL.replace('redis://', 'redis://***@')}")

# Create Celery app
app = Celery('learnx')

# Configure task autodiscovery
app.autodiscover_tasks(['tasks'], force=True)

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
    
    # Connection settings for Railway/cloud deployment
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_transport_options={
        'visibility_timeout': 3600,
        'fanout_prefix': True,
        'fanout_patterns': True
    },
    
    # Rate limiting
    task_annotations={
        'tasks.index_file': {'rate_limit': '10/m'},  # Max 10 files per minute
        # Embeddings handled by Supabase - removed rate limit
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
        # Embeddings queue removed - Supabase handles embeddings automatically
    ),
    
    # Route tasks to appropriate queues
    task_routes={
        'tasks.index_file': {'queue': 'high'},
        # 'tasks.generate_embeddings' removed - Supabase handles embeddings
        'tasks.cleanup_old_chunks': {'queue': 'low'},
        'tasks.reindex_course': {'queue': 'default'},
        'tasks.health_check': {'queue': 'critical'},
    },
    
    # Beat schedule for periodic tasks
    beat_schedule={
        # File maintenance
        'cleanup-old-files': {
            'task': 'tasks.maintenance.cleanup_old_files_async',
            'schedule': timedelta(days=1),  # Daily at midnight
            'kwargs': {'days': 30},
            'options': {'queue': 'low'}
        },
        'cleanup-orphaned-s3': {
            'task': 'tasks.maintenance.cleanup_orphaned_s3_files',
            'schedule': timedelta(days=7),  # Weekly
            'options': {'queue': 'low'}
        },
        # Embedding generation
        'scan-missing-embeddings': {
            'task': 'tasks.embedding_generation.scan_missing_embeddings',
            'schedule': timedelta(minutes=5),  # Every 5 minutes
            'options': {'queue': 'embeddings'}
        },
        # Database maintenance
        'vacuum-database': {
            'task': 'tasks.maintenance.vacuum_database',
            'schedule': timedelta(days=1),  # Daily at 3 AM
            'options': {'queue': 'low'}
        },
        # Health monitoring
        'health-check': {
            'task': 'tasks.health_check',
            'schedule': timedelta(minutes=5),  # Every 5 minutes
            'options': {'queue': 'critical'}
        },
    },
)

# Import tasks to register them
try:
    import tasks
    logger.info("Successfully imported tasks module")
except ImportError as e:
    logger.warning(f"Could not import tasks: {e}")
    app.autodiscover_tasks(['tasks'])
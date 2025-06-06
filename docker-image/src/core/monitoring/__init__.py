"""
Monitoring package for comprehensive performance and security tracking

This package provides:
- Prometheus metrics definitions
- Monitoring decorators and context managers  
- Security monitoring with pattern detection
- Flask integration for automatic monitoring
- Tracking functions for various events
"""

# Core metrics definitions
from .metrics_definitions import *

# Monitoring decorators
from .decorators import (
    monitor_request,
    monitor_cache_operation,
    monitor_ai_api_call
)

# Context managers
from .context_managers import (
    monitor_db_query,
    monitor_file_processing,
    monitor_search_operation,
    PerformanceProfiler
)

# Tracking functions
from .trackers import (
    update_connection_pool_metrics,
    track_streaming_connection,
    track_user_action,
    track_user_session,
    track_login_attempt,
    track_course_enrollment,
    update_course_completion_rate,
    track_module_progress,
    track_learning_time,
    track_file_upload,
    update_file_processing_queue,
    track_file_processing_error,
    track_chunk_creation,
    track_search_query,
    track_security_event,
    track_failed_auth,
    track_suspicious_activity,
    update_system_metrics
)

# Security monitoring
from .security_monitor import SecurityMonitor, security_monitor

# Flask integration
from .flask_integration import (
    get_metrics,
    setup_performance_monitoring,
    setup_monitoring  # Alias for backward compatibility
)

__all__ = [
    # Metrics definitions
    'request_duration', 'request_count', 'active_requests',
    'db_query_duration', 'db_connection_pool',
    'cache_operations', 'file_processing_duration',
    'streaming_connections', 'ai_api_calls', 'ai_api_latency',
    'user_sessions_active', 'user_actions_total', 'user_login_attempts',
    'course_enrollments_total', 'course_completion_rate',
    'module_progress_total', 'learning_time_total',
    'file_uploads_total', 'file_processing_queue_size',
    'file_processing_errors', 'chunk_creation_total',
    'api_endpoint_requests', 'api_endpoint_latency', 'api_rate_limit_hits',
    'search_queries_total', 'search_latency', 'retrieval_accuracy',
    'security_events_total', 'failed_auth_attempts', 'suspicious_activity_total',
    'memory_usage_bytes', 'cpu_usage_percent', 'disk_usage_bytes',
    'network_bytes_total', 'embedding_generation_duration',
    
    # Decorators
    'monitor_request', 'monitor_cache_operation', 'monitor_ai_api_call',
    
    # Context managers
    'monitor_db_query', 'monitor_file_processing', 'monitor_search_operation',
    'monitor_embedding_generation', 'PerformanceProfiler',
    
    # Tracking functions
    'update_connection_pool_metrics', 'track_streaming_connection',
    'track_user_action', 'track_user_session', 'track_login_attempt',
    'track_course_enrollment', 'update_course_completion_rate',
    'track_module_progress', 'track_learning_time', 'track_file_upload',
    'update_file_processing_queue', 'track_file_processing_error',
    'track_chunk_creation', 'track_search_query', 'track_security_event',
    'track_failed_auth', 'track_suspicious_activity', 'update_system_metrics',
    
    # Security monitoring
    'SecurityMonitor', 'security_monitor',
    
    # Flask integration
    'get_metrics', 'setup_performance_monitoring', 'setup_monitoring'
]
"""
Prometheus metrics definitions for the application
"""
from prometheus_client import Histogram, Counter, Gauge

# HTTP Request metrics
request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint', 'status']
)

request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

active_requests = Gauge(
    'http_requests_active',
    'Active HTTP requests'
)

# Database metrics
db_query_duration = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['operation', 'table']
)

db_connection_pool = Gauge(
    'db_connection_pool_size',
    'Database connection pool size',
    ['state']
)

# Cache metrics
cache_operations = Counter(
    'cache_operations_total',
    'Total cache operations',
    ['operation', 'result']
)

# File processing metrics
file_processing_duration = Histogram(
    'file_processing_duration_seconds',
    'File processing duration',
    ['file_type', 'operation']
)

file_uploads_total = Counter(
    'file_uploads_total',
    'Total file uploads',
    ['file_type', 'status', 'user_type']
)

file_processing_queue_size = Gauge(
    'file_processing_queue_size',
    'Number of files in processing queue',
    ['queue_type']
)

file_processing_errors = Counter(
    'file_processing_errors_total',
    'Total file processing errors',
    ['error_type', 'file_type']
)

chunk_creation_total = Counter(
    'chunk_creation_total',
    'Total chunks created from files',
    ['file_type', 'course_id']
)

# Streaming metrics
streaming_connections = Gauge(
    'streaming_connections_active',
    'Active streaming connections'
)

# AI API metrics
ai_api_calls = Counter(
    'ai_api_calls_total',
    'Total AI API calls',
    ['model', 'operation', 'status']
)

ai_api_latency = Histogram(
    'ai_api_latency_seconds',
    'AI API call latency',
    ['model', 'operation']
)

# Note: Embedding generation is now handled automatically by Supabase
# The embedding_generation_duration metric has been deprecated


# User activity metrics
user_sessions_active = Gauge(
    'user_sessions_active',
    'Number of active user sessions'
)

user_actions_total = Counter(
    'user_actions_total',
    'Total user actions',
    ['user_id', 'action_type', 'resource_type']
)

user_login_attempts = Counter(
    'user_login_attempts_total',
    'Total login attempts',
    ['method', 'status']
)

# Business metrics
course_enrollments_total = Counter(
    'course_enrollments_total',
    'Total course enrollments',
    ['course_id', 'user_type']
)

course_completion_rate = Gauge(
    'course_completion_rate',
    'Course completion rate percentage',
    ['course_id']
)

module_progress_total = Counter(
    'module_progress_total',
    'Total module progress events',
    ['course_id', 'module_id', 'progress_type']
)

learning_time_total = Counter(
    'learning_time_total_seconds',
    'Total learning time in seconds',
    ['course_id', 'user_id']
)

# API endpoint specific metrics
api_endpoint_requests = Counter(
    'api_endpoint_requests_total',
    'Total API endpoint requests',
    ['endpoint', 'method', 'status', 'user_type']
)

api_endpoint_latency = Histogram(
    'api_endpoint_latency_seconds',
    'API endpoint response latency',
    ['endpoint', 'method']
)

api_rate_limit_hits = Counter(
    'api_rate_limit_hits_total',
    'Total rate limit hits',
    ['endpoint', 'user_id']
)

# Search and retrieval metrics
search_queries_total = Counter(
    'search_queries_total',
    'Total search queries',
    ['course_id', 'query_type', 'user_type']
)

search_latency = Histogram(
    'search_latency_seconds',
    'Search query latency',
    ['query_type', 'result_count_bucket']
)

retrieval_accuracy = Histogram(
    'retrieval_accuracy_score',
    'Retrieval accuracy scores',
    ['course_id', 'query_type']
)

# Security metrics
security_events_total = Counter(
    'security_events_total',
    'Total security events',
    ['event_type', 'severity', 'source_ip']
)

failed_auth_attempts = Counter(
    'failed_auth_attempts_total',
    'Total failed authentication attempts',
    ['auth_method', 'failure_reason']
)

suspicious_activity_total = Counter(
    'suspicious_activity_total',
    'Total suspicious activity detected',
    ['activity_type', 'severity']
)

# System resource metrics
memory_usage_bytes = Gauge(
    'memory_usage_bytes',
    'Memory usage in bytes',
    ['component']
)

cpu_usage_percent = Gauge(
    'cpu_usage_percent',
    'CPU usage percentage',
    ['component']
)

disk_usage_bytes = Gauge(
    'disk_usage_bytes',
    'Disk usage in bytes',
    ['mount_point', 'type']
)

network_bytes_total = Counter(
    'network_bytes_total',
    'Total network bytes',
    ['direction', 'interface']
)
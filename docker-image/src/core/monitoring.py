"""
Performance monitoring and metrics collection
"""
import time
import functools
import logging
from datetime import datetime
from typing import Callable, Any, Dict
from flask import request, g
from prometheus_client import Histogram, Counter, Gauge, generate_latest

# Configure logging
logger = logging.getLogger(__name__)

# Prometheus metrics
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

cache_operations = Counter(
    'cache_operations_total',
    'Total cache operations',
    ['operation', 'result']
)

file_processing_duration = Histogram(
    'file_processing_duration_seconds',
    'File processing duration',
    ['file_type', 'operation']
)

streaming_connections = Gauge(
    'streaming_connections_active',
    'Active streaming connections'
)

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

# File processing metrics
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

embedding_generation_duration = Histogram(
    'embedding_generation_duration_seconds',
    'Time to generate embeddings',
    ['model', 'chunk_size']
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

def monitor_request(func: Callable) -> Callable:
    """Decorator to monitor HTTP requests"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Track active requests
        active_requests.inc()
        
        # Start timer
        start_time = time.time()
        
        try:
            # Execute request
            result = func(*args, **kwargs)
            
            # Extract status code
            if isinstance(result, tuple):
                response, status = result
            else:
                response, status = result, 200
            
            return result
            
        except Exception as e:
            # Log error and re-raise
            logger.error(f"Request error: {e}", exc_info=True)
            status = 500
            raise
            
        finally:
            # Record metrics
            duration = time.time() - start_time
            endpoint = request.endpoint or 'unknown'
            
            request_duration.labels(
                method=request.method,
                endpoint=endpoint,
                status=status
            ).observe(duration)
            
            request_count.labels(
                method=request.method,
                endpoint=endpoint,
                status=status
            ).inc()
            
            active_requests.dec()
            
            # Log slow requests
            if duration > 1.0:
                logger.warning(
                    f"Slow request: {request.method} {request.path} "
                    f"took {duration:.2f}s (status: {status})"
                )
    
    return wrapper

def monitor_db_query(operation: str, table: str):
    """Context manager to monitor database queries"""
    class DBQueryMonitor:
        def __enter__(self):
            self.start_time = time.time()
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.time() - self.start_time
            db_query_duration.labels(
                operation=operation,
                table=table
            ).observe(duration)
            
            # Log slow queries
            if duration > 0.5:
                logger.warning(
                    f"Slow DB query: {operation} on {table} "
                    f"took {duration:.2f}s"
                )
    
    return DBQueryMonitor()

def monitor_cache_operation(operation: str):
    """Decorator to monitor cache operations"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)
                cache_operations.labels(
                    operation=operation,
                    result='hit' if result else 'miss'
                ).inc()
                return result
            except Exception as e:
                cache_operations.labels(
                    operation=operation,
                    result='error'
                ).inc()
                raise
        return wrapper
    return decorator

def monitor_ai_api_call(model: str, operation: str):
    """Decorator to monitor AI API calls"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                # Record success
                ai_api_calls.labels(
                    model=model,
                    operation=operation,
                    status='success'
                ).inc()
                
                return result
                
            except Exception as e:
                # Record failure
                ai_api_calls.labels(
                    model=model,
                    operation=operation,
                    status='error'
                ).inc()
                raise
                
            finally:
                # Record latency
                duration = time.time() - start_time
                ai_api_latency.labels(
                    model=model,
                    operation=operation
                ).observe(duration)
        
        return wrapper
    return decorator

def update_connection_pool_metrics(pool_size: int, active: int, idle: int):
    """Update database connection pool metrics"""
    db_connection_pool.labels(state='total').set(pool_size)
    db_connection_pool.labels(state='active').set(active)
    db_connection_pool.labels(state='idle').set(idle)

def track_streaming_connection(increment: bool = True):
    """Track streaming connections"""
    if increment:
        streaming_connections.inc()
    else:
        streaming_connections.dec()

def track_user_action(user_id: str, action_type: str, resource_type: str):
    """Track user actions for analytics"""
    user_actions_total.labels(
        user_id=user_id,
        action_type=action_type,
        resource_type=resource_type
    ).inc()

def track_user_session(active: bool = True):
    """Track active user sessions"""
    if active:
        user_sessions_active.inc()
    else:
        user_sessions_active.dec()

def track_login_attempt(method: str, status: str):
    """Track login attempts"""
    user_login_attempts.labels(
        method=method,
        status=status
    ).inc()

def track_course_enrollment(course_id: str, user_type: str):
    """Track course enrollments"""
    course_enrollments_total.labels(
        course_id=course_id,
        user_type=user_type
    ).inc()

def update_course_completion_rate(course_id: str, completion_rate: float):
    """Update course completion rate"""
    course_completion_rate.labels(course_id=course_id).set(completion_rate)

def track_module_progress(course_id: str, module_id: str, progress_type: str):
    """Track module progress events"""
    module_progress_total.labels(
        course_id=course_id,
        module_id=module_id,
        progress_type=progress_type
    ).inc()

def track_learning_time(course_id: str, user_id: str, duration_seconds: float):
    """Track learning time"""
    learning_time_total.labels(
        course_id=course_id,
        user_id=user_id
    ).inc(duration_seconds)

def track_file_upload(file_type: str, status: str, user_type: str):
    """Track file uploads"""
    file_uploads_total.labels(
        file_type=file_type,
        status=status,
        user_type=user_type
    ).inc()

def update_file_processing_queue(queue_type: str, size: int):
    """Update file processing queue size"""
    file_processing_queue_size.labels(queue_type=queue_type).set(size)

def track_file_processing_error(error_type: str, file_type: str):
    """Track file processing errors"""
    file_processing_errors.labels(
        error_type=error_type,
        file_type=file_type
    ).inc()

def track_chunk_creation(file_type: str, course_id: str, count: int = 1):
    """Track chunk creation"""
    chunk_creation_total.labels(
        file_type=file_type,
        course_id=course_id
    ).inc(count)

def track_search_query(course_id: str, query_type: str, user_type: str):
    """Track search queries"""
    search_queries_total.labels(
        course_id=course_id,
        query_type=query_type,
        user_type=user_type
    ).inc()

def track_security_event(event_type: str, severity: str, source_ip: str):
    """Track security events"""
    security_events_total.labels(
        event_type=event_type,
        severity=severity,
        source_ip=source_ip
    ).inc()

def track_failed_auth(auth_method: str, failure_reason: str):
    """Track failed authentication attempts"""
    failed_auth_attempts.labels(
        auth_method=auth_method,
        failure_reason=failure_reason
    ).inc()

def track_suspicious_activity(activity_type: str, severity: str):
    """Track suspicious activity"""
    suspicious_activity_total.labels(
        activity_type=activity_type,
        severity=severity
    ).inc()

def update_system_metrics(component: str, memory_bytes: int, cpu_percent: float):
    """Update system resource metrics"""
    memory_usage_bytes.labels(component=component).set(memory_bytes)
    cpu_usage_percent.labels(component=component).set(cpu_percent)

def get_metrics() -> str:
    """Get Prometheus metrics in text format"""
    return generate_latest()

class PerformanceProfiler:
    """Context manager for detailed performance profiling"""
    
    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        self.checkpoints: Dict[str, float] = {}
        self.checkpoint_order: list = []
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def checkpoint(self, name: str):
        """Mark a checkpoint in the profiling"""
        self.checkpoints[name] = time.time()
        self.checkpoint_order.append(name)
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        total_time = time.time() - self.start_time
        
        # Log profile results
        profile_data = {
            'profile_name': self.name,
            'total_time': f"{total_time:.3f}s",
            'checkpoints': {}
        }
        
        last_time = self.start_time
        for checkpoint in self.checkpoint_order:
            checkpoint_time = self.checkpoints[checkpoint]
            duration = checkpoint_time - last_time
            profile_data['checkpoints'][checkpoint] = f"{duration:.3f}s"
            last_time = checkpoint_time
        
        # Final segment
        if self.checkpoint_order:
            final_duration = time.time() - last_time
            profile_data['checkpoints']['completion'] = f"{final_duration:.3f}s"
        
        logger.info(f"Performance profile: {profile_data}")

# Request timing middleware
def setup_performance_monitoring(app):
    """Setup performance monitoring for Flask app"""
    
    @app.before_request
    def before_request():
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            response.headers['X-Response-Time'] = f"{duration:.3f}"
        return response
    
    # Add metrics endpoint
    @app.route('/metrics')
    def metrics():
        return get_metrics(), 200, {'Content-Type': 'text/plain'}
    
    logger.info("Performance monitoring initialized")


def monitor_file_processing(file_type: str, operation: str, course_id: str = None):
    """Context manager to monitor file processing with enhanced tracking"""
    class FileProcessingMonitor:
        def __init__(self):
            self.start_time = None
            self.chunks_created = 0
            self.errors = []
        
        def __enter__(self):
            self.start_time = time.time()
            return self
        
        def add_chunks(self, count: int):
            """Track chunks created during processing"""
            self.chunks_created += count
        
        def add_error(self, error_type: str):
            """Track errors during processing"""
            self.errors.append(error_type)
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.time() - self.start_time
            
            # Record processing duration
            file_processing_duration.labels(
                file_type=file_type,
                operation=operation
            ).observe(duration)
            
            # Record chunks created
            if self.chunks_created > 0 and course_id:
                track_chunk_creation(file_type, course_id, self.chunks_created)
            
            # Record processing errors
            for error_type in self.errors:
                track_file_processing_error(error_type, file_type)
            
            # Record processing status
            status = 'error' if exc_type else 'success'
            track_file_upload(file_type, status, 'system')
            
            # Log slow file processing
            if duration > 30.0:
                logger.warning(
                    f"Slow file processing: {operation} on {file_type} "
                    f"took {duration:.2f}s, created {self.chunks_created} chunks"
                )
            
            # Log processing summary
            logger.info(
                f"File processing completed: {operation}/{file_type} "
                f"duration={duration:.2f}s chunks={self.chunks_created} "
                f"errors={len(self.errors)} status={status}"
            )
    
    return FileProcessingMonitor()

def monitor_search_operation(course_id: str, query_type: str, user_type: str):
    """Context manager to monitor search operations"""
    class SearchMonitor:
        def __init__(self):
            self.start_time = None
            self.result_count = 0
            self.accuracy_score = None
        
        def __enter__(self):
            self.start_time = time.time()
            # Track search query
            track_search_query(course_id, query_type, user_type)
            return self
        
        def set_results(self, count: int, accuracy: float = None):
            """Set search results for metrics"""
            self.result_count = count
            self.accuracy_score = accuracy
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.time() - self.start_time
            
            # Determine result count bucket for latency tracking
            if self.result_count == 0:
                bucket = 'no_results'
            elif self.result_count <= 10:
                bucket = 'few_results'
            elif self.result_count <= 50:
                bucket = 'medium_results'
            else:
                bucket = 'many_results'
            
            # Record search latency
            search_latency.labels(
                query_type=query_type,
                result_count_bucket=bucket
            ).observe(duration)
            
            # Record accuracy if available
            if self.accuracy_score is not None:
                retrieval_accuracy.labels(
                    course_id=course_id,
                    query_type=query_type
                ).observe(self.accuracy_score)
            
            # Log slow searches
            if duration > 2.0:
                logger.warning(
                    f"Slow search: {query_type} in course {course_id} "
                    f"took {duration:.2f}s, returned {self.result_count} results"
                )
    
    return SearchMonitor()

def monitor_embedding_generation(model: str, chunk_size: str):
    """Context manager to monitor embedding generation"""
    class EmbeddingMonitor:
        def __enter__(self):
            self.start_time = time.time()
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.time() - self.start_time
            embedding_generation_duration.labels(
                model=model,
                chunk_size=chunk_size
            ).observe(duration)
            
            # Log slow embedding generation
            if duration > 5.0:
                logger.warning(
                    f"Slow embedding generation: {model}/{chunk_size} "
                    f"took {duration:.2f}s"
                )
    
    return EmbeddingMonitor()

class SecurityMonitor:
    """Enhanced security monitoring with pattern detection"""
    
    def __init__(self):
        self._failed_attempts = {}
        self._suspicious_patterns = {}
    
    def track_failed_login(self, user_id: str, source_ip: str, method: str):
        """Track failed login attempts with pattern detection"""
        track_failed_auth(method, 'invalid_credentials')
        
        # Track per IP
        key = f"ip:{source_ip}"
        self._failed_attempts[key] = self._failed_attempts.get(key, 0) + 1
        
        # Track per user
        if user_id:
            key = f"user:{user_id}"
            self._failed_attempts[key] = self._failed_attempts.get(key, 0) + 1
        
        # Check for suspicious patterns
        if self._failed_attempts.get(f"ip:{source_ip}", 0) > 5:
            track_suspicious_activity('repeated_failed_login', 'high')
            track_security_event('brute_force_attempt', 'critical', source_ip)
        
        if user_id and self._failed_attempts.get(f"user:{user_id}", 0) > 3:
            track_suspicious_activity('account_targeted', 'medium')
    
    def track_unusual_access_pattern(self, user_id: str, source_ip: str, endpoint: str):
        """Track unusual access patterns"""
        # Simple pattern detection - could be enhanced with ML
        hour = datetime.now().hour
        
        # Flag access during unusual hours (midnight to 6 AM)
        if 0 <= hour <= 6:
            track_suspicious_activity('unusual_hours_access', 'low')
        
        # Track rapid API calls (simplified)
        key = f"{user_id}:{source_ip}"
        current_time = time.time()
        
        if key in self._suspicious_patterns:
            last_time, count = self._suspicious_patterns[key]
            if current_time - last_time < 1.0:  # Within 1 second
                count += 1
                if count > 10:  # More than 10 calls per second
                    track_suspicious_activity('rapid_api_calls', 'medium')
                    api_rate_limit_hits.labels(
                        endpoint=endpoint,
                        user_id=user_id
                    ).inc()
        
        self._suspicious_patterns[key] = (current_time, 
                                        self._suspicious_patterns.get(key, (0, 0))[1] + 1)

# Global security monitor instance
security_monitor = SecurityMonitor()

# Alias for compatibility
setup_monitoring = setup_performance_monitoring
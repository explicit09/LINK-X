"""
Performance monitoring and metrics collection
"""
import time
import functools
import logging
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


# Alias for compatibility
setup_monitoring = setup_performance_monitoring
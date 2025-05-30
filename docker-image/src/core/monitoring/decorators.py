"""
Monitoring decorators for automatic metrics collection
"""
import time
import functools
import logging
from typing import Callable
from flask import request
from .metrics_definitions import (
    request_duration, request_count, active_requests,
    cache_operations, ai_api_calls, ai_api_latency
)

logger = logging.getLogger(__name__)

def monitor_request(func: Callable) -> Callable:
    """Decorator to monitor HTTP requests"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Track active requests
        active_requests.inc()
        
        # Start timer
        start_time = time.time()
        status = 200
        
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
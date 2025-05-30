"""
Resilience patterns for handling failures gracefully
Includes retry logic, timeouts, and fallback mechanisms
"""

import time
import random
import asyncio
import logging
from typing import Callable, Any, Optional, Union, TypeVar, List
from functools import wraps
from concurrent.futures import TimeoutError as FuturesTimeoutError
from threading import Timer
import signal

logger = logging.getLogger(__name__)

T = TypeVar('T')


class TimeoutError(Exception):
    """Raised when operation times out"""
    pass


class RetryError(Exception):
    """Raised when all retry attempts fail"""
    pass


def timeout(seconds: float, error_message: str = "Operation timed out"):
    """
    Timeout decorator using threading
    
    Args:
        seconds: Timeout in seconds
        error_message: Error message for timeout
        
    Example:
        @timeout(5.0)
        def slow_function():
            time.sleep(10)  # Will timeout
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = [TimeoutError(error_message)]
            
            def target():
                try:
                    result[0] = func(*args, **kwargs)
                except Exception as e:
                    result[0] = e
            
            thread = Timer(0, target)
            thread.daemon = True
            thread.start()
            thread.join(seconds)
            
            if thread.is_alive():
                # Try to stop the thread (not guaranteed)
                thread.cancel()
                raise TimeoutError(error_message)
            
            if isinstance(result[0], Exception):
                raise result[0]
            
            return result[0]
        
        return wrapper
    return decorator


def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
    jitter: bool = True,
    on_retry: Optional[Callable[[Exception, int], None]] = None
):
    """
    Retry decorator with exponential backoff
    
    Args:
        max_attempts: Maximum retry attempts
        delay: Initial delay between retries
        backoff: Backoff multiplier
        exceptions: Exceptions to retry on
        jitter: Add random jitter to prevent thundering herd
        on_retry: Callback on retry (exception, attempt)
        
    Example:
        @retry(max_attempts=3, delay=1.0, backoff=2.0)
        def unreliable_api_call():
            response = requests.get("https://api.example.com")
            response.raise_for_status()
            return response.json()
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            attempt = 0
            current_delay = delay
            
            while attempt < max_attempts:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    attempt += 1
                    
                    if attempt >= max_attempts:
                        break
                    
                    if on_retry:
                        on_retry(e, attempt)
                    
                    # Calculate sleep time with optional jitter
                    sleep_time = current_delay
                    if jitter:
                        sleep_time *= (0.5 + random.random())
                    
                    logger.warning(
                        f"Retry {attempt}/{max_attempts} for {func.__name__} "
                        f"after {sleep_time:.2f}s. Error: {e}"
                    )
                    
                    time.sleep(sleep_time)
                    current_delay *= backoff
            
            raise RetryError(
                f"All {max_attempts} retry attempts failed for {func.__name__}"
            ) from last_exception
        
        return wrapper
    return decorator


def fallback(fallback_func: Callable, exceptions: tuple = (Exception,)):
    """
    Fallback decorator for graceful degradation
    
    Args:
        fallback_func: Function to call on failure
        exceptions: Exceptions to catch
        
    Example:
        def get_cached_data():
            return {"data": "cached"}
        
        @fallback(get_cached_data)
        def get_live_data():
            return fetch_from_api()
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except exceptions as e:
                logger.warning(
                    f"Falling back for {func.__name__} due to: {e}"
                )
                return fallback_func(*args, **kwargs)
        
        return wrapper
    return decorator


class BulkheadExecutor:
    """
    Bulkhead pattern to isolate resources and prevent resource exhaustion
    Limits concurrent executions of a function
    """
    
    def __init__(self, max_concurrent: int, queue_size: int = 0):
        """
        Initialize bulkhead
        
        Args:
            max_concurrent: Maximum concurrent executions
            queue_size: Maximum queued requests (0 = no queue)
        """
        self.max_concurrent = max_concurrent
        self.queue_size = queue_size
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._queue_semaphore = asyncio.Semaphore(queue_size) if queue_size > 0 else None
        self._active = 0
        self._queued = 0
        self._rejected = 0
    
    async def execute(self, coro):
        """Execute coroutine with bulkhead protection"""
        # Try to get queue slot if queueing is enabled
        if self._queue_semaphore:
            if not self._queue_semaphore.locked():
                async with self._queue_semaphore:
                    self._queued += 1
                    try:
                        async with self._semaphore:
                            self._queued -= 1
                            self._active += 1
                            try:
                                return await coro
                            finally:
                                self._active -= 1
                    except:
                        self._queued -= 1
                        raise
            else:
                self._rejected += 1
                raise BulkheadError("Bulkhead queue is full")
        else:
            # No queueing, try direct execution
            if not self._semaphore.locked():
                async with self._semaphore:
                    self._active += 1
                    try:
                        return await coro
                    finally:
                        self._active -= 1
            else:
                self._rejected += 1
                raise BulkheadError("Bulkhead is at capacity")
    
    def get_stats(self):
        """Get bulkhead statistics"""
        return {
            'active': self._active,
            'queued': self._queued,
            'rejected': self._rejected,
            'available': self.max_concurrent - self._active
        }


class BulkheadError(Exception):
    """Raised when bulkhead capacity is exceeded"""
    pass


def bulkhead(max_concurrent: int, queue_size: int = 0):
    """
    Bulkhead decorator for async functions
    
    Args:
        max_concurrent: Maximum concurrent executions
        queue_size: Maximum queue size
        
    Example:
        @bulkhead(max_concurrent=10, queue_size=20)
        async def process_request(data):
            await external_api_call(data)
    """
    executor = BulkheadExecutor(max_concurrent, queue_size)
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            coro = func(*args, **kwargs)
            return await executor.execute(coro)
        
        wrapper.bulkhead = executor
        return wrapper
    
    return decorator


class HealthCheck:
    """
    Health check for external dependencies
    """
    
    def __init__(self, name: str, check_func: Callable[[], bool], 
                 timeout_seconds: float = 5.0):
        """
        Initialize health check
        
        Args:
            name: Service name
            check_func: Function that returns True if healthy
            timeout_seconds: Timeout for health check
        """
        self.name = name
        self.check_func = check_func
        self.timeout_seconds = timeout_seconds
        self._last_check_time = None
        self._last_check_result = None
        self._consecutive_failures = 0
    
    def is_healthy(self, cache_seconds: float = 10.0) -> bool:
        """
        Check if service is healthy
        
        Args:
            cache_seconds: Cache result for this many seconds
            
        Returns:
            True if healthy, False otherwise
        """
        # Use cached result if recent
        if (self._last_check_time and 
            time.time() - self._last_check_time < cache_seconds):
            return self._last_check_result
        
        try:
            # Run health check with timeout
            @timeout(self.timeout_seconds)
            def _check():
                return self.check_func()
            
            result = _check()
            self._last_check_result = bool(result)
            self._last_check_time = time.time()
            
            if result:
                self._consecutive_failures = 0
            else:
                self._consecutive_failures += 1
            
            return self._last_check_result
            
        except Exception as e:
            logger.error(f"Health check failed for {self.name}: {e}")
            self._consecutive_failures += 1
            self._last_check_result = False
            self._last_check_time = time.time()
            return False
    
    def get_status(self) -> dict:
        """Get detailed health status"""
        return {
            'name': self.name,
            'healthy': self._last_check_result,
            'last_check': self._last_check_time,
            'consecutive_failures': self._consecutive_failures
        }


# Predefined health checks
def create_redis_health_check():
    """Create Redis health check"""
    def check():
        try:
            from core.cache import cache
            return cache.redis_client.ping() if cache.redis_client else False
        except:
            return False
    
    return HealthCheck("redis", check, timeout_seconds=2.0)


def create_database_health_check():
    """Create database health check"""
    def check():
        try:
            from core.database import db
            db.session.execute("SELECT 1")
            return True
        except:
            return False
    
    return HealthCheck("database", check, timeout_seconds=5.0)


def create_s3_health_check():
    """Create S3 health check"""
    def check():
        try:
            from services.s3_storage import s3_storage
            s3_storage.s3_client.head_bucket(Bucket=s3_storage.bucket_name)
            return True
        except:
            return False
    
    return HealthCheck("s3", check, timeout_seconds=5.0)


# Resilience utilities
def with_resilience(
    retry_attempts: int = 3,
    timeout_seconds: float = 30.0,
    fallback_value: Any = None,
    circuit_breaker_name: Optional[str] = None
):
    """
    Comprehensive resilience decorator combining multiple patterns
    
    Args:
        retry_attempts: Number of retry attempts
        timeout_seconds: Timeout for operation
        fallback_value: Fallback value on failure
        circuit_breaker_name: Optional circuit breaker to use
        
    Example:
        @with_resilience(retry_attempts=3, timeout_seconds=10.0)
        def call_external_service():
            return requests.get("https://api.example.com").json()
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Apply timeout
            @timeout(timeout_seconds)
            def timed_func():
                # Apply circuit breaker if specified
                if circuit_breaker_name:
                    from core.circuit_breaker import circuit_breaker
                    cb_func = circuit_breaker(name=circuit_breaker_name)(func)
                    return cb_func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            
            # Apply retry
            @retry(max_attempts=retry_attempts)
            def retried_func():
                return timed_func()
            
            # Apply fallback
            if fallback_value is not None:
                @fallback(lambda *a, **k: fallback_value)
                def final_func():
                    return retried_func()
                
                return final_func()
            else:
                return retried_func()
        
        return wrapper
    return decorator
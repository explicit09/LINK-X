"""Redis Health Check and Fallback Service"""
import redis
import time
import logging
from typing import Optional, Callable
from functools import wraps
from core.settings import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class RedisHealthChecker:
    """Monitor Redis health and provide fallback behavior"""
    
    def __init__(self):
        self.redis_client = None
        self.last_check_time = 0
        self.check_interval = 30  # seconds
        self.is_healthy = False
        self.failure_count = 0
        self.max_failures = 3
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                str(settings.redis_url),
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=True,
                health_check_interval=30
            )
            self.redis_client.ping()
            self.is_healthy = True
            self.failure_count = 0
            logger.info("Redis connection established")
        except Exception as e:
            self.is_healthy = False
            logger.error(f"Failed to initialize Redis: {e}")
    
    def check_health(self, force: bool = False) -> bool:
        """Check Redis health status"""
        current_time = time.time()
        
        # Skip if recently checked (unless forced)
        if not force and current_time - self.last_check_time < self.check_interval:
            return self.is_healthy
        
        self.last_check_time = current_time
        
        try:
            if self.redis_client:
                self.redis_client.ping()
                if not self.is_healthy:
                    logger.info("Redis connection restored")
                self.is_healthy = True
                self.failure_count = 0
                return True
        except Exception as e:
            self.failure_count += 1
            if self.failure_count >= self.max_failures:
                self.is_healthy = False
                logger.error(f"Redis health check failed {self.failure_count} times: {e}")
            
            # Try to reconnect
            if self.failure_count % 5 == 0:  # Every 5 failures
                logger.info("Attempting to reconnect to Redis...")
                self._init_redis()
        
        return self.is_healthy
    
    def with_fallback(self, fallback_func: Optional[Callable] = None):
        """Decorator to handle Redis failures with fallback"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                if self.check_health():
                    try:
                        return func(*args, **kwargs)
                    except redis.ConnectionError as e:
                        logger.error(f"Redis operation failed: {e}")
                        self.is_healthy = False
                        self.failure_count += 1
                
                # Use fallback if provided
                if fallback_func:
                    logger.warning(f"Using fallback for {func.__name__}")
                    return fallback_func(*args, **kwargs)
                
                # Default behavior if no fallback
                logger.warning(f"No fallback for {func.__name__}, returning None")
                return None
            
            return wrapper
        return decorator


# Global instance
redis_health = RedisHealthChecker()


# Utility function for Redis operations with automatic fallback
def safe_redis_operation(operation: Callable, fallback_value=None, log_failure=True):
    """
    Execute a Redis operation safely with fallback
    
    Args:
        operation: The Redis operation to execute
        fallback_value: Value to return if Redis fails
        log_failure: Whether to log failures
    
    Returns:
        The result of the operation or fallback_value
    """
    try:
        if redis_health.check_health():
            return operation()
        else:
            if log_failure:
                logger.warning("Redis unhealthy, using fallback value")
            return fallback_value
    except Exception as e:
        if log_failure:
            logger.error(f"Redis operation failed: {e}")
        redis_health.is_healthy = False
        return fallback_value
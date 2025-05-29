"""
Base Service Classes and Interfaces
Provides common functionality for all services
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List, TypeVar, Generic
from datetime import datetime
from sqlalchemy.orm import Session
from dataclasses import dataclass
import logging

from src.core.exceptions import ValidationError, NotFoundError, UnauthorizedException
from src.core.cache import cache

logger = logging.getLogger(__name__)


def track_performance(method):
    """Decorator to track method performance"""
    @wraps(method)
    def wrapper(self, *args, **kwargs):
        start_time = time.time()
        try:
            result = method(self, *args, **kwargs)
            execution_time = time.time() - start_time
            
            # Log slow operations
            if execution_time > 1.0:
                logger.warning(
                    f"{self.__class__.__name__}.{method.__name__} took {execution_time:.2f}s"
                )
                
            # Track metrics if available
            if hasattr(self, '_track_metric'):
                self._track_metric(
                    f"{self.__class__.__name__}.{method.__name__}",
                    execution_time
                )
                
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"{self.__class__.__name__}.{method.__name__} failed after {execution_time:.2f}s: {str(e)}"
            )
            raise
    return wrapper


def validate_input(**validators):
    """Decorator to validate method inputs"""
    def decorator(method):
        @wraps(method)
        def wrapper(self, *args, **kwargs):
            # Validate each specified parameter
            for param_name, validator_func in validators.items():
                if param_name in kwargs:
                    value = kwargs[param_name]
                    if not validator_func(value):
                        raise ValidationError(f"Invalid {param_name}: {value}")
            return method(self, *args, **kwargs)
        return wrapper
    return decorator


class BaseService:
    """
    Base service class with common functionality
    """
    
    def __init__(self, redis_client: Optional[Redis] = None):
        """
        Initialize base service
        
        Args:
            redis_client: Optional Redis client for caching
        """
        self.redis_client = redis_client
        self._cache = cache
        
    def _track_metric(self, metric_name: str, value: float):
        """
        Track a metric (can be extended to use Prometheus, DataDog, etc.)
        
        Args:
            metric_name: Name of the metric
            value: Metric value
        """
        if self.redis_client:
            # Simple implementation: store in Redis
            key = f"metrics:{metric_name}:{int(time.time())}"
            self.redis_client.setex(key, 3600, value)  # Keep for 1 hour
            
    def _cache_key(self, prefix: str, *args) -> str:
        """
        Generate cache key
        
        Args:
            prefix: Cache key prefix
            *args: Additional key components
            
        Returns:
            Cache key string
        """
        components = [prefix] + [str(arg) for arg in args if arg is not None]
        return ":".join(components)
        
    def _get_cached(self, key: str) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None
        """
        try:
            return self._cache.get(key)
        except Exception as e:
            logger.warning(f"Cache get error for {key}: {e}")
            return None
            
    def _set_cached(self, key: str, value: Any, timeout: int = 300):
        """
        Set value in cache
        
        Args:
            key: Cache key
            value: Value to cache
            timeout: Cache timeout in seconds
        """
        try:
            self._cache.set(key, value, timeout=timeout)
        except Exception as e:
            logger.warning(f"Cache set error for {key}: {e}")
            
    def _invalidate_cache(self, pattern: str):
        """
        Invalidate cache entries matching pattern
        
        Args:
            pattern: Cache key pattern (supports wildcards)
        """
        try:
            if self.redis_client:
                # Use Redis SCAN to find matching keys
                cursor = 0
                while True:
                    cursor, keys = self.redis_client.scan(
                        cursor, 
                        match=pattern,
                        count=100
                    )
                    if keys:
                        self.redis_client.delete(*keys)
                    if cursor == 0:
                        break
            else:
                # Fallback to simple cache clear
                self._cache.clear()
        except Exception as e:
            logger.warning(f"Cache invalidation error for {pattern}: {e}")
            
    def _validate_pagination(self, offset: int = 0, limit: int = 20) -> tuple[int, int]:
        """
        Validate pagination parameters
        
        Args:
            offset: Number of items to skip
            limit: Maximum number of items to return
            
        Returns:
            Validated (offset, limit) tuple
        """
        if offset < 0:
            raise ValidationError("Offset must be non-negative")
            
        if limit < 1:
            raise ValidationError("Limit must be positive")
            
        # Cap limit to prevent excessive queries
        max_limit = 100
        if limit > max_limit:
            limit = max_limit
            
        return offset, limit
        
    def _check_permission(self, user_id: str, resource_type: str, 
                          resource_id: str, action: str) -> bool:
        """
        Check if user has permission for action on resource
        
        Args:
            user_id: User ID
            resource_type: Type of resource (course, file, etc.)
            resource_id: Resource ID
            action: Action to perform (read, write, delete)
            
        Returns:
            True if permitted, False otherwise
        """
        # This is a placeholder - implement actual permission checking
        # based on your authorization model
        cache_key = self._cache_key(
            "permission",
            user_id,
            resource_type,
            resource_id,
            action
        )
        
        # Check cache first
        cached_result = self._get_cached(cache_key)
        if cached_result is not None:
            return cached_result
            
        # Perform actual permission check (to be implemented)
        # This would typically check:
        # - User role
        # - Resource ownership
        # - Enrollment status
        # - etc.
        
        result = True  # Placeholder
        
        # Cache the result
        self._set_cached(cache_key, result, timeout=300)
        
        return result
        
    def _require_permission(self, user_id: str, resource_type: str,
                            resource_id: str, action: str):
        """
        Require permission for action on resource
        
        Args:
            user_id: User ID
            resource_type: Type of resource
            resource_id: Resource ID
            action: Action to perform
            
        Raises:
            UnauthorizedException: If permission denied
        """
        if not self._check_permission(user_id, resource_type, resource_id, action):
            raise UnauthorizedException(
                f"User {user_id} not authorized to {action} {resource_type} {resource_id}"
            )
            
    def _log_action(self, user_id: str, action: str, resource_type: str,
                    resource_id: str, details: Optional[Dict[str, Any]] = None):
        """
        Log user action for auditing
        
        Args:
            user_id: User ID
            action: Action performed
            resource_type: Type of resource
            resource_id: Resource ID
            details: Additional details
        """
        log_entry = {
            'timestamp': time.time(),
            'user_id': user_id,
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'details': details or {}
        }
        
        logger.info(f"Action log: {log_entry}")
        
        # Store in Redis for recent activity tracking
        if self.redis_client:
            key = f"activity:{user_id}:{int(time.time())}"
            self.redis_client.setex(key, 86400, str(log_entry))  # Keep for 24 hours
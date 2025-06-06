import json
import hashlib
from functools import wraps
from flask import request
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
from datetime import timedelta
import pickle
import os

class CacheManager:
    """Redis cache manager"""
    def __init__(self, app=None):
        self.redis_client = None
        self.default_timeout = 300  # 5 minutes
        self._redis_url = None
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize cache with Flask app"""
        self._redis_url = app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        self.default_timeout = app.config.get('CACHE_DEFAULT_TIMEOUT', 300)
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection"""
        if not REDIS_AVAILABLE:
            print("Redis module not available - caching disabled")
            self.redis_client = None
            return
            
        if self._redis_url and not self.redis_client:
            try:
                self.redis_client = redis.from_url(self._redis_url)
                # Test connection
                self.redis_client.ping()
            except Exception as e:
                print(f"Failed to initialize Redis: {e}")
                self.redis_client = None
    
    def _ensure_redis(self):
        """Ensure Redis connection is available"""
        if self.redis_client is None:
            if self._redis_url:
                self._init_redis()
            else:
                # Fallback: try to get Redis URL from environment
                redis_url = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
                self._redis_url = redis_url
                self._init_redis()
        return self.redis_client is not None
    
    def get(self, key):
        """Get value from cache"""
        try:
            if not self._ensure_redis():
                return None
            value = self.redis_client.get(key)
            if value:
                try:
                    # Try to deserialize as JSON first
                    return json.loads(value)
                except json.JSONDecodeError:
                    # Fall back to pickle
                    return pickle.loads(value)
        except redis.RedisError as e:
            # Log error but don't raise
            print(f"Cache get error: {e}")
        return None
    
    def set(self, key, value, timeout=None):
        """Set value in cache"""
        if not self._ensure_redis():
            return False
            
        if timeout is None:
            timeout = self.default_timeout
        
        try:
            # Try to serialize as JSON first
            try:
                serialized = json.dumps(value)
            except (TypeError, ValueError):
                # Fall back to pickle for complex objects
                serialized = pickle.dumps(value)
            
            self.redis_client.setex(key, timeout, serialized)
            return True
        except redis.RedisError as e:
            # Log error but don't raise
            print(f"Cache set error: {e}")
        return False
    
    def delete(self, key):
        """Delete value from cache"""
        if not self._ensure_redis():
            return False
        try:
            return self.redis_client.delete(key) > 0
        except redis.RedisError as e:
            print(f"Cache delete error: {e}")
        return False
    
    def clear_pattern(self, pattern):
        """Clear all keys matching pattern"""
        if not self._ensure_redis():
            return 0
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            return len(keys)
        except redis.RedisError as e:
            print(f"Cache clear error: {e}")
        return 0
    
    def exists(self, key):
        """Check if key exists in cache"""
        if not self._ensure_redis():
            return False
        try:
            return self.redis_client.exists(key) > 0
        except redis.RedisError:
            return False

# Global cache instance
cache = CacheManager()

def cache_key(*args, **kwargs):
    """Generate cache key from arguments"""
    key_data = f"{args}:{sorted(kwargs.items())}"
    return hashlib.md5(key_data.encode()).hexdigest()

def cached(expiration=300, key_prefix=None):
    """Cache decorator for functions"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            prefix = key_prefix or f"{func.__module__}.{func.__name__}"
            key = f"{prefix}:{cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = cache.get(key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            cache.set(key, result, expiration)
            
            return result
        return wrapper
    return decorator

def invalidate_cache(pattern):
    """Invalidate cache entries matching pattern"""
    return cache.clear_pattern(pattern)

def cache_response(expiration=300, key_prefix=None):
    """Cache decorator for Flask routes"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key based on request path and args
            prefix = key_prefix or f"response:{request.endpoint}"
            cache_data = {
                'path': request.path,
                'method': request.method,
                'args': dict(request.args),
                'json': request.get_json(silent=True) if request.is_json else None
            }
            key = f"{prefix}:{cache_key(cache_data)}"
            
            # Try to get from cache
            cached_value = cache.get(key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Only cache successful responses
            if isinstance(result, tuple):
                response, status = result
                if status == 200:
                    cache.set(key, result, expiration)
            else:
                cache.set(key, result, expiration)
            
            return result
        return wrapper
    return decorator

class CacheTagging:
    """Cache with tagging support for invalidation"""
    def __init__(self, cache_manager):
        self.cache = cache_manager
    
    def set_with_tags(self, key, value, tags, timeout=None):
        """Set cache value with tags"""
        # Store the value
        self.cache.set(key, value, timeout)
        
        # Store tags
        for tag in tags:
            tag_key = f"tag:{tag}"
            tag_values = self.cache.get(tag_key) or []
            if key not in tag_values:
                tag_values.append(key)
            self.cache.set(tag_key, tag_values, timeout=86400)  # 24 hours
    
    def invalidate_by_tag(self, tag):
        """Invalidate all cache entries with a specific tag"""
        tag_key = f"tag:{tag}"
        keys = self.cache.get(tag_key) or []
        
        for key in keys:
            self.cache.delete(key)
        
        # Clean up the tag
        self.cache.delete(tag_key)
        
        return len(keys)
"""
Production-Ready Rate Limiter
Implements sliding window rate limiting with Redis
Following industry best practices for DDoS protection
"""

import time
from functools import wraps
from typing import Optional, Callable, Tuple
import redis
from flask import request, jsonify, g
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Sliding window rate limiter using Redis
    More accurate than fixed window, prevents burst attacks
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        
    def is_allowed(
        self,
        key: str,
        limit: int,
        window: int,
        cost: int = 1
    ) -> Tuple[bool, dict]:
        """
        Check if request is allowed under rate limit
        
        Args:
            key: Unique identifier (e.g., user_id, IP)
            limit: Maximum requests allowed
            window: Time window in seconds
            cost: Cost of this request (default 1)
            
        Returns:
            (allowed, metadata) tuple
        """
        now = time.time()
        pipeline = self.redis.pipeline()
        
        # Sliding window key
        window_key = f"rate_limit:{key}:{int(now // window)}"
        
        try:
            # Remove old entries
            pipeline.zremrangebyscore(window_key, 0, now - window)
            
            # Count current requests in window
            pipeline.zcard(window_key)
            
            # Add current request
            pipeline.zadd(window_key, {f"{now}:{id(now)}": now})
            
            # Set expiry
            pipeline.expire(window_key, window + 1)
            
            # Execute pipeline
            results = pipeline.execute()
            
            current_requests = results[1]
            
            # Calculate remaining limit
            remaining = max(0, limit - current_requests - cost)
            reset_time = int(now) + window
            
            metadata = {
                'limit': limit,
                'remaining': remaining,
                'reset': reset_time,
                'retry_after': None
            }
            
            if current_requests + cost > limit:
                # Rate limit exceeded
                metadata['retry_after'] = window
                return False, metadata
                
            return True, metadata
            
        except redis.RedisError as e:
            logger.error(f"Redis error in rate limiter: {e}")
            logger.warning("Falling back to local in-memory rate limiter")
            
            # Use local fallback to prevent abuse during Redis outage
            from core.rate_limiter_local import local_rate_limiter
            return local_rate_limiter.is_allowed(key, limit, window, cost)


def get_rate_limit_key(request) -> str:
    """
    Get rate limit key from request
    Prioritizes authenticated user, falls back to IP
    """
    # Check for authenticated user
    if hasattr(g, 'current_user') and g.current_user:
        return f"user:{g.current_user.id}"
    
    # Check for API key
    api_key = request.headers.get('X-API-Key')
    if api_key:
        return f"api_key:{api_key}"
    
    # Fall back to IP address
    # Handle proxied requests
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ',' in ip:
        ip = ip.split(',')[0].strip()
    
    return f"ip:{ip}"


def rate_limit(
    limit: int = 100,
    window: int = 3600,
    key_func: Optional[Callable] = None,
    cost: int = 1,
    error_message: str = "Rate limit exceeded"
):
    """
    Rate limiting decorator
    
    Args:
        limit: Maximum requests allowed
        window: Time window in seconds (default 1 hour)
        key_func: Function to generate rate limit key
        cost: Cost of this endpoint (default 1)
        error_message: Custom error message
        
    Example:
        @rate_limit(limit=10, window=60)  # 10 requests per minute
        def my_endpoint():
            return "Hello"
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Skip rate limiting in tests
            if hasattr(g, 'skip_rate_limit') and g.skip_rate_limit:
                return f(*args, **kwargs)
            
            # Get Redis client
            from flask import current_app
            redis_client = current_app.extensions.get('redis')
            
            if not redis_client:
                # Redis not available, use local fallback
                logger.warning("Redis not available for rate limiting, using local fallback")
                from core.rate_limiter_local import local_rate_limiter
                
                # Get rate limit key
                if key_func:
                    key = key_func(request)
                else:
                    key = get_rate_limit_key(request)
                
                # Check with local limiter
                allowed, metadata = local_rate_limiter.is_allowed(key, limit, window, cost)
                
                if not allowed:
                    logger.warning(f"Local rate limit enforced for {key}")
                    return jsonify({
                        'error': error_message,
                        'retry_after': metadata['retry_after']
                    }), 429
                
                return f(*args, **kwargs)
            
            # Get rate limit key
            if key_func:
                key = key_func(request)
            else:
                key = get_rate_limit_key(request)
            
            # Check rate limit
            limiter = RateLimiter(redis_client)
            allowed, metadata = limiter.is_allowed(key, limit, window, cost)
            
            # Add headers
            @wraps(f)
            def add_rate_limit_headers(response):
                response.headers['X-RateLimit-Limit'] = str(metadata['limit'])
                response.headers['X-RateLimit-Remaining'] = str(metadata['remaining'])
                response.headers['X-RateLimit-Reset'] = str(metadata['reset'])
                
                if not allowed:
                    response.headers['Retry-After'] = str(metadata['retry_after'])
                
                return response
            
            if not allowed:
                return jsonify({
                    'error': error_message,
                    'retry_after': metadata['retry_after']
                }), 429
            
            # Call the actual function
            response = f(*args, **kwargs)
            
            # Add rate limit headers to response
            from flask import make_response
            if not isinstance(response, tuple):
                response = make_response(response)
            
            return add_rate_limit_headers(response)
            
        return decorated_function
    return decorator


# Preset rate limits for common use cases

def auth_rate_limit():
    """Strict rate limit for authentication endpoints"""
    return rate_limit(
        limit=20,
        window=3600,  # 20 attempts per hour
        error_message="Too many authentication attempts"
    )


def api_rate_limit():
    """Standard API rate limit"""
    return rate_limit(
        limit=1000,
        window=3600,  # 1000 requests per hour
        error_message="API rate limit exceeded"
    )


def upload_rate_limit():
    """Rate limit for file uploads"""
    return rate_limit(
        limit=10,
        window=3600,  # 10 uploads per hour
        cost=5,  # Each upload costs 5 points
        error_message="Upload rate limit exceeded"
    )


def search_rate_limit():
    """Rate limit for search endpoints"""
    return rate_limit(
        limit=100,
        window=60,  # 100 searches per minute
        error_message="Search rate limit exceeded"
    )
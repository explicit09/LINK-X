"""Advanced Rate Limiting with Multiple Strategies"""
import redis
import time
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from functools import wraps
from flask import request, jsonify, g
import logging
from .rate_limiter_local import local_rate_limiter

logger = logging.getLogger(__name__)


class RateLimiter:
    """Advanced rate limiter with multiple strategies and Redis backend"""
    
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.prefix = "rate_limit:"
        
    def _get_identifier(self, identifier_type: str = 'ip') -> str:
        """Get identifier for rate limiting"""
        if identifier_type == 'user' and hasattr(g, 'current_user'):
            return f"user:{g.current_user.id}"
        elif identifier_type == 'ip':
            # Get real IP behind proxy
            forwarded_for = request.headers.get('X-Forwarded-For')
            if forwarded_for:
                ip = forwarded_for.split(',')[0].strip()
            else:
                ip = request.headers.get('X-Real-IP', request.remote_addr)
            return f"ip:{ip}"
        elif identifier_type == 'api_key':
            api_key = request.headers.get('X-API-Key', 'anonymous')
            return f"api_key:{api_key}"
        else:
            return f"anonymous:{request.remote_addr}"
    
    def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        identifier_type: str = 'ip',
        strategy: str = 'sliding_window'
    ) -> Tuple[bool, Dict[str, any]]:
        """
        Check if request is within rate limits
        
        Returns:
            Tuple of (is_allowed, metadata)
        """
        identifier = self._get_identifier(identifier_type)
        full_key = f"{self.prefix}{key}:{identifier}"
        
        if strategy == 'sliding_window':
            return self._sliding_window_check(full_key, max_requests, window_seconds)
        elif strategy == 'fixed_window':
            return self._fixed_window_check(full_key, max_requests, window_seconds)
        elif strategy == 'token_bucket':
            return self._token_bucket_check(full_key, max_requests, window_seconds)
        else:
            raise ValueError(f"Unknown rate limiting strategy: {strategy}")
    
    def _sliding_window_check(
        self, 
        key: str, 
        max_requests: int, 
        window_seconds: int
    ) -> Tuple[bool, Dict]:
        """Sliding window rate limiting using sorted sets"""
        now = time.time()
        window_start = now - window_seconds
        
        try:
            pipe = self.redis_client.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(now): now})
            
            # Set expiry
            pipe.expire(key, window_seconds + 1)
            
            results = pipe.execute()
            request_count = results[1]
            
            # Check if over limit
            if request_count >= max_requests:
                # Calculate when the oldest request will expire
                oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    reset_time = oldest[0][1] + window_seconds
                else:
                    reset_time = now + window_seconds
                
                return False, {
                    'limit': max_requests,
                    'remaining': 0,
                    'reset': int(reset_time),
                    'retry_after': int(reset_time - now)
                }
            
            return True, {
                'limit': max_requests,
                'remaining': max_requests - request_count - 1,
                'reset': int(now + window_seconds)
            }
            
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error in rate limiter: {e}")
            logger.warning("SECURITY: Rate limiting failed over to local memory fallback")
            # Use local fallback instead of failing open completely
            return local_rate_limiter.is_allowed(
                key=key,
                limit=max_requests,
                window=window_seconds,
                cost=1
            )
        except Exception as e:
            logger.error(f"Unexpected error in rate limiter: {e}")
            # Fail open for any other errors
            return True, {
                'limit': max_requests,
                'remaining': max_requests,
                'reset': int(now + window_seconds),
                'fallback': True
            }
    
    def _fixed_window_check(
        self, 
        key: str, 
        max_requests: int, 
        window_seconds: int
    ) -> Tuple[bool, Dict]:
        """Fixed window rate limiting"""
        try:
            # Calculate window key
            window = int(time.time() / window_seconds)
            window_key = f"{key}:window:{window}"
            
            # Increment counter
            pipe = self.redis_client.pipeline()
            pipe.incr(window_key)
            pipe.expire(window_key, window_seconds)
            
            results = pipe.execute()
            request_count = results[0]
            
            if request_count > max_requests:
                reset_time = (window + 1) * window_seconds
                return False, {
                    'limit': max_requests,
                    'remaining': 0,
                    'reset': reset_time,
                    'retry_after': reset_time - int(time.time())
                }
            
            return True, {
                'limit': max_requests,
                'remaining': max_requests - request_count,
                'reset': (window + 1) * window_seconds
            }
            
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error in fixed window rate limiter: {e}")
            logger.warning("SECURITY: Fixed window rate limiting failed over to local memory fallback")
            # Use local fallback instead of failing open completely
            return local_rate_limiter.is_allowed(
                key=key,
                limit=max_requests,
                window=window_seconds,
                cost=1
            )
        except Exception as e:
            logger.error(f"Unexpected error in fixed window rate limiter: {e}")
            return True, {
                'limit': max_requests,
                'remaining': max_requests,
                'reset': int(time.time()) + window_seconds,
                'fallback': True
            }
    
    def _token_bucket_check(
        self, 
        key: str, 
        capacity: int, 
        refill_rate: int
    ) -> Tuple[bool, Dict]:
        """Token bucket rate limiting"""
        now = time.time()
        bucket_key = f"{key}:bucket"
        
        try:
            # Get current bucket state
            bucket_data = self.redis_client.hgetall(bucket_key)
            
            if not bucket_data:
                # Initialize bucket
                tokens = capacity - 1
                last_refill = now
            else:
                tokens = float(bucket_data.get('tokens', capacity))
                last_refill = float(bucket_data.get('last_refill', now))
                
                # Calculate tokens to add
                time_passed = now - last_refill
                tokens_to_add = time_passed * (capacity / refill_rate)
                tokens = min(capacity, tokens + tokens_to_add)
            
            if tokens >= 1:
                # Consume a token
                tokens -= 1
                
                # Update bucket
                pipe = self.redis_client.pipeline()
                pipe.hset(bucket_key, mapping={
                    'tokens': tokens,
                    'last_refill': now
                })
                pipe.expire(bucket_key, refill_rate * 2)
                pipe.execute()
                
                return True, {
                    'limit': capacity,
                    'remaining': int(tokens),
                    'reset': int(now + refill_rate)
                }
            
            # Calculate when next token available
            time_until_token = (1 - tokens) / (capacity / refill_rate)
            
            return False, {
                'limit': capacity,
                'remaining': 0,
                'reset': int(now + time_until_token),
                'retry_after': int(time_until_token)
            }
            
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error in token bucket rate limiter: {e}")
            logger.warning("SECURITY: Token bucket rate limiting failed over to local memory fallback")
            # Use local fallback instead of failing open completely
            return local_rate_limiter.is_allowed(
                key=key,
                limit=capacity,
                window=refill_rate,  # Use refill_rate as window for fallback
                cost=1
            )
        except Exception as e:
            logger.error(f"Unexpected error in token bucket rate limiter: {e}")
            return True, {
                'limit': capacity,
                'remaining': capacity,
                'reset': int(now + refill_rate),
                'fallback': True
            }
    
    def reset_limits(self, key: str, identifier_type: str = 'ip'):
        """Reset rate limits for a specific key and identifier"""
        identifier = self._get_identifier(identifier_type)
        pattern = f"{self.prefix}{key}:{identifier}*"
        
        for key in self.redis_client.scan_iter(match=pattern):
            self.redis_client.delete(key)


class RateLimitConfig:
    """Rate limit configurations for different endpoints"""
    
    # Authentication endpoints
    AUTH_LOGIN = {
        'key_prefix': 'auth:login',
        'max_requests': 5,
        'window_seconds': 300,  # 5 minutes
        'strategy': 'sliding_window'
    }
    
    AUTH_REGISTER = {
        'key_prefix': 'auth:register',
        'max_requests': 3,
        'window_seconds': 3600,  # 1 hour
        'strategy': 'sliding_window'
    }
    
    # API endpoints
    API_DEFAULT = {
        'key_prefix': 'api:default',
        'max_requests': 100,
        'window_seconds': 60,  # 1 minute
        'strategy': 'sliding_window'
    }
    
    API_HEAVY = {
        'key_prefix': 'api:heavy',
        'max_requests': 10,
        'window_seconds': 60,
        'strategy': 'token_bucket'
    }
    
    # File uploads
    FILE_UPLOAD = {
        'key_prefix': 'file:upload',
        'max_requests': 10,
        'window_seconds': 3600,  # 1 hour
        'strategy': 'sliding_window'
    }
    
    # AI endpoints
    AI_GENERATE = {
        'key_prefix': 'ai:generate',
        'max_requests': 20,
        'window_seconds': 3600,  # 1 hour
        'strategy': 'token_bucket'
    }


def rate_limit_decorator(
    max_requests: int = 60,
    window_seconds: int = 60,
    identifier_type: str = 'ip',
    strategy: str = 'sliding_window',
    key_prefix: Optional[str] = None
):
    """Decorator for rate limiting endpoints"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Skip rate limiting in tests
            if hasattr(g, 'skip_rate_limit') and g.skip_rate_limit:
                return f(*args, **kwargs)
            
            # Get rate limiter
            from core.settings import get_settings
            settings = get_settings()
            limiter = RateLimiter(str(settings.redis_url))
            
            # Generate key
            key = key_prefix or f"{request.endpoint or 'unknown'}"
            
            # Check rate limit
            allowed, metadata = limiter.check_rate_limit(
                key=key,
                max_requests=max_requests,
                window_seconds=window_seconds,
                identifier_type=identifier_type,
                strategy=strategy
            )
            
            # Add headers
            headers = {
                'X-RateLimit-Limit': str(metadata['limit']),
                'X-RateLimit-Remaining': str(metadata['remaining']),
                'X-RateLimit-Reset': str(metadata['reset'])
            }
            
            if not allowed:
                headers['Retry-After'] = str(metadata['retry_after'])
                
                response = jsonify({
                    'error': 'Rate limit exceeded',
                    'code': 'rate_limit_exceeded',
                    'retry_after': metadata['retry_after']
                })
                response.status_code = 429
                
                for header, value in headers.items():
                    response.headers[header] = value
                
                return response
            
            # Process request
            response = f(*args, **kwargs)
            
            # Add rate limit headers to successful response
            if hasattr(response, 'headers'):
                for header, value in headers.items():
                    response.headers[header] = value
            
            return response
            
        return decorated_function
    return decorator


# Convenience decorators
auth_rate_limit = rate_limit_decorator(**RateLimitConfig.AUTH_LOGIN)
api_rate_limit = rate_limit_decorator(**RateLimitConfig.API_DEFAULT)
upload_rate_limit = rate_limit_decorator(**RateLimitConfig.FILE_UPLOAD)
ai_rate_limit = rate_limit_decorator(**RateLimitConfig.AI_GENERATE)
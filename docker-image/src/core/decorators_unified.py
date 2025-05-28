"""
Unified Decorators
Combines v1 and v2 decorator functionality with version awareness
"""

import functools
import logging
from typing import List, Optional, Callable
import time
import json

from flask import request, g, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from firebase_admin import auth as firebase_auth
import redis
from werkzeug.exceptions import Unauthorized, Forbidden

from db.schema import User
from core.cache import cache
from core.exceptions import AuthenticationError, ValidationError

logger = logging.getLogger(__name__)


def get_redis_client():
    """Get Redis client for rate limiting"""
    try:
        return redis.from_url(
            current_app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
            decode_responses=True
        )
    except:
        return None


def auth_required(roles: Optional[List[str]] = None, 
                  optional: bool = False,
                  fresh: bool = False,
                  refresh: bool = False,
                  version_aware: bool = True):
    """
    Unified authentication decorator supporting both v1 and v2
    
    Args:
        roles: List of allowed roles
        optional: If True, authentication is optional
        fresh: If True, requires fresh token (v2 only)
        refresh: If True, allows refresh tokens (v2 only)
        version_aware: If True, adapts behavior based on API version
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            # Determine API version
            version = 'v1'
            if version_aware:
                if '/api/v2/' in request.path or request.headers.get('X-API-Version') == 'v2':
                    version = 'v2'
                    
            # Initialize user as None
            g.current_user = None
            
            try:
                # Try authentication methods in order
                authenticated = False
                
                # Method 1: JWT Bearer Token (both versions)
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    try:
                        if version == 'v2':
                            # Use flask-jwt-extended for v2
                            verify_jwt_in_request(optional=optional, fresh=fresh, refresh=refresh)
                            
                            # Check token type
                            jwt_payload = get_jwt()
                            if not refresh and jwt_payload.get('type') == 'refresh':
                                raise AuthenticationError("Access token required")
                                
                            user_id = get_jwt_identity()
                            g.current_user = _get_user_by_id(user_id)
                            authenticated = True
                        else:
                            # v1 simple JWT verification
                            token = auth_header[7:]
                            user = _verify_v1_jwt(token)
                            if user:
                                g.current_user = user
                                authenticated = True
                    except Exception as e:
                        logger.debug(f"JWT auth failed: {e}")
                        
                # Method 2: Session Cookie JWT (v1 compatibility)
                if not authenticated and version == 'v1':
                    jwt_cookie = request.cookies.get('jwt_token')
                    if jwt_cookie:
                        try:
                            user = _verify_v1_jwt(jwt_cookie)
                            if user:
                                g.current_user = user
                                authenticated = True
                        except Exception as e:
                            logger.debug(f"Cookie JWT auth failed: {e}")
                            
                # Method 3: Firebase Token (both versions)
                if not authenticated:
                    firebase_token = request.headers.get('X-Firebase-Token')
                    if firebase_token:
                        try:
                            user = _verify_firebase_token(firebase_token)
                            if user:
                                g.current_user = user
                                authenticated = True
                        except Exception as e:
                            logger.debug(f"Firebase auth failed: {e}")
                            
                # Check if authentication is required
                if not optional and not authenticated:
                    return jsonify({'error': 'Authentication required'}), 401
                    
                # Check roles if specified
                if authenticated and roles and g.current_user:
                    if g.current_user.role_type not in roles:
                        return jsonify({'error': 'Insufficient permissions'}), 403
                        
                # Call the decorated function
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Auth decorator error: {e}")
                if optional:
                    return f(*args, **kwargs)
                return jsonify({'error': 'Authentication failed'}), 401
                
        return decorated_function
    return decorator


def rate_limit(max_requests: int = 60, window_seconds: int = 60, 
               by_user: bool = False, by_ip: bool = True):
    """
    Rate limiting decorator
    
    Args:
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds
        by_user: If True, rate limit by authenticated user
        by_ip: If True, rate limit by IP address
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            redis_client = get_redis_client()
            if not redis_client:
                # No Redis, skip rate limiting
                return f(*args, **kwargs)
                
            # Determine rate limit key
            if by_user and hasattr(g, 'current_user') and g.current_user:
                key = f"rate_limit:user:{g.current_user.user_id}:{request.endpoint}"
            elif by_ip:
                # Get client IP
                client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
                if client_ip:
                    client_ip = client_ip.split(',')[0].strip()
                key = f"rate_limit:ip:{client_ip}:{request.endpoint}"
            else:
                # Global rate limit
                key = f"rate_limit:global:{request.endpoint}"
                
            try:
                # Check rate limit
                current = redis_client.get(key)
                if current is None:
                    # First request
                    redis_client.setex(key, window_seconds, 1)
                else:
                    current_count = int(current)
                    if current_count >= max_requests:
                        retry_after = redis_client.ttl(key)
                        return jsonify({
                            'error': 'Rate limit exceeded',
                            'retry_after': retry_after
                        }), 429
                    else:
                        redis_client.incr(key)
                        
            except Exception as e:
                logger.error(f"Rate limit error: {e}")
                # Don't block request on rate limit errors
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def cache_response(timeout: int = 300, key_prefix: Optional[str] = None,
                   unless: Optional[Callable] = None):
    """
    Cache response decorator
    
    Args:
        timeout: Cache timeout in seconds
        key_prefix: Optional key prefix
        unless: Optional function to determine if response should be cached
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if caching should be skipped
            if unless and unless():
                return f(*args, **kwargs)
                
            # Generate cache key
            if key_prefix:
                cache_key = f"{key_prefix}:{request.path}:{request.query_string.decode()}"
            else:
                cache_key = f"{request.endpoint}:{request.path}:{request.query_string.decode()}"
                
            # Add user context if authenticated
            if hasattr(g, 'current_user') and g.current_user:
                cache_key += f":user:{g.current_user.user_id}"
                
            # Try to get from cache
            cached = cache.get(cache_key)
            if cached:
                return cached
                
            # Call function and cache result
            result = f(*args, **kwargs)
            
            # Only cache successful responses
            if hasattr(result, 'status_code') and result.status_code == 200:
                cache.set(cache_key, result, timeout=timeout)
                
            return result
        return decorated_function
    return decorator


def validate_request(schema: dict):
    """
    Validate request JSON against schema
    
    Args:
        schema: JSON schema dict
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
                
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Request body required'}), 400
                
            # Simple schema validation (in production, use jsonschema)
            for field, rules in schema.items():
                if rules.get('required', False) and field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
                    
                if field in data and 'type' in rules:
                    expected_type = rules['type']
                    if expected_type == 'string' and not isinstance(data[field], str):
                        return jsonify({'error': f'Field {field} must be string'}), 400
                    elif expected_type == 'number' and not isinstance(data[field], (int, float)):
                        return jsonify({'error': f'Field {field} must be number'}), 400
                        
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# Helper functions

def _get_user_by_id(user_id: str) -> Optional[User]:
    """Get user by ID from database"""
    from repositories.user_repository import UserRepository
    
    try:
        user_repo = UserRepository()
        with user_repo.get_session() as session:
            user = session.query(User).filter_by(user_id=user_id).first()
            if user:
                # Detach from session
                session.expunge(user)
            return user
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {e}")
        return None


def _verify_v1_jwt(token: str) -> Optional[User]:
    """Verify v1 style JWT token"""
    from flask_jwt_extended import decode_token
    
    try:
        # Decode token
        decoded = decode_token(token)
        user_id = decoded.get('sub') or decoded.get('identity')
        
        if user_id:
            return _get_user_by_id(user_id)
    except Exception as e:
        logger.debug(f"v1 JWT verification failed: {e}")
        
    return None


def _verify_firebase_token(token: str) -> Optional[User]:
    """Verify Firebase token and get user"""
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        firebase_uid = decoded_token['uid']
        
        from repositories.user_repository import UserRepository
        user_repo = UserRepository()
        
        with user_repo.get_session() as session:
            user = session.query(User).filter_by(firebase_uid=firebase_uid).first()
            if user:
                session.expunge(user)
            return user
            
    except Exception as e:
        logger.debug(f"Firebase token verification failed: {e}")
        return None


# Backward compatibility aliases
firebase_auth_required = functools.partial(auth_required, version_aware=False)
jwt_required_v1 = functools.partial(auth_required, version_aware=False)
jwt_required_v2 = functools.partial(auth_required, version_aware=True)
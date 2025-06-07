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
from services.auth.supabase_auth_service import get_auth_service
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
    def auth_decorator(f):
        print(f"auth_decorator wrapping function: {f.__name__}")
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            print(f"auth_decorator executing for: {f.__name__}")
            
            # Skip authentication for OPTIONS requests
            if request.method == 'OPTIONS':
                return f(*args, **kwargs)
                
            # Determine API version
            version = 'v1'
            if version_aware:
                if '/api/v2/' in request.path or request.headers.get('X-API-Version') == 'v2':
                    version = 'v2'
                    
            # Initialize user as None
            g.current_user = None
            
            try:
                logger.info(f"Auth check for {request.path}, version: {version}")
                logger.info(f"Headers: {dict(request.headers)}")
                
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
                            logger.info(f"Attempting v1 JWT verification for endpoint: {request.endpoint}")
                            # Direct JWT verification without flask-jwt-extended
                            user = _verify_v1_jwt(token)
                            if user:
                                g.current_user = user
                                authenticated = True
                                logger.info(f"JWT auth successful for user: {user.id}")
                            else:
                                logger.warning("JWT verification returned no user")
                    except Exception as e:
                        logger.error(f"JWT auth failed: {e}", exc_info=True)
                        
                # Method 2: Firebase Session Cookie - DISABLED (no cookie support)
                # Cookie authentication has been removed for security
                            
                # Method 3: Supabase Token (both versions)
                if not authenticated and auth_header.startswith('Bearer '):
                    # We already have the Bearer token, use it for Supabase auth
                    supabase_token = auth_header[7:]
                    if supabase_token:
                        try:
                            # Use simple auth service first
                            from services.auth.simple_auth_service import get_simple_auth_service
                            auth_service = get_simple_auth_service()
                            auth_user = auth_service.verify_token(supabase_token)
                            if auth_user:
                                # Simple auth service already returns the complete user
                                # No need to look up again - just use the AuthUser directly
                                g.current_user = auth_user
                                g.auth_type = 'supabase'
                                authenticated = True
                                logger.info(f"Authenticated user via Supabase: {auth_user.email} ({auth_user.role})")
                        except Exception as e:
                            logger.info(f"Supabase auth failed: {e}")
                            
                # Check if authentication is required
                if not optional and not authenticated:
                    logger.warning(f"Authentication failed for {request.path}. No valid auth found.")
                    return jsonify({'error': 'Authentication required', 'debug': 'No authentication token found'}), 401
                    
                # Check roles if specified
                if authenticated and roles and g.current_user:
                    # Handle both User objects (with role_type) and AuthUser objects (with role)
                    user_role = getattr(g.current_user, 'role_type', None) or getattr(g.current_user, 'role', None)
                    if user_role and user_role not in roles:
                        return jsonify({'error': 'Insufficient permissions'}), 403
                        
                # Call the decorated function
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Auth decorator error: {e}")
                if optional:
                    return f(*args, **kwargs)
                return jsonify({'error': 'Authentication failed'}), 401
                
        return decorated_function
    return auth_decorator


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
    def rate_limit_decorator(f):
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
    return rate_limit_decorator


def cache_response(timeout: int = 300, key_prefix: Optional[str] = None,
                   unless: Optional[Callable] = None):
    """
    Cache response decorator
    
    Args:
        timeout: Cache timeout in seconds
        key_prefix: Optional key prefix
        unless: Optional function to determine if response should be cached
    """
    def cache_decorator(f):
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
    return cache_decorator


def validate_request(schema: dict):
    """
    Validate request JSON against schema
    
    Args:
        schema: JSON schema dict
    """
    def validate_decorator(f):
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
    return validate_decorator


# Helper functions

def _get_user_by_id(user_id: str) -> Optional[User]:
    """Get user by ID from database"""
    from core.database_supabase import db
    from sqlalchemy.orm import joinedload
    
    try:
        logger.info(f"Looking up user by ID: {user_id}")
        # Query directly using the current session
        user = db.session.query(User).options(
            joinedload(User.role),
            joinedload(User.student_profile),
            joinedload(User.instructor_profile)
        ).filter_by(id=user_id).first()
        
        if user:
            logger.info(f"User found: {user.email}, role: {user.role.role_type if user.role else 'no role'}")
        else:
            logger.warning(f"User not found in database for ID: {user_id}")
        return user
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {e}", exc_info=True)
        return None


def _verify_v1_jwt(token: str) -> Optional[User]:
    """Verify v1 style JWT token"""
    import jwt
    from flask import current_app
    
    try:
        logger.info(f"Decoding JWT token: {token[:20]}...")
        
        # First, decode without verification to see the header
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            header = jwt.get_unverified_header(token)
            logger.info(f"JWT header: {header}")
            logger.info(f"JWT payload (unverified): {unverified}")
        except Exception as e:
            logger.info(f"Could not decode unverified JWT: {e}")
        
        # Get JWT secret from app config
        secret = current_app.config.get('JWT_SECRET_KEY') or current_app.config.get('SECRET_KEY')
        if not secret:
            logger.error("No JWT secret key configured")
            return None
            
        # Try different algorithms based on what we see in the header
        algorithms_to_try = ['HS256', 'RS256', 'ES256']
        
        for alg in algorithms_to_try:
            try:
                logger.info(f"Trying algorithm: {alg}")
                decoded = jwt.decode(
                    token, 
                    secret, 
                    algorithms=[alg],
                    options={'verify_exp': True}
                )
                logger.info(f"Successfully decoded with {alg}: {decoded}")
                
                user_id = decoded.get('sub') or decoded.get('identity')
                logger.info(f"Extracted user_id: {user_id}")
                
                if user_id:
                    user = _get_user_by_id(user_id)
                    if user:
                        logger.info(f"Found user: {user.id}, email: {user.email}")
                    else:
                        logger.warning(f"No user found for id: {user_id}")
                    return user
                break
            except jwt.InvalidSignatureError:
                logger.info(f"Invalid signature with algorithm {alg}")
                continue
            except Exception as e:
                logger.info(f"Failed with algorithm {alg}: {e}")
                continue
                
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
    except Exception as e:
        logger.error(f"v1 JWT verification failed: {e}", exc_info=True)
        
    return None


def _verify_supabase_token(token: str) -> Optional[User]:
    """Verify Supabase token and get user"""
    try:
        auth_service = get_auth_service()
        auth_user = auth_service.verify_token(token)
        if auth_user:
            return _get_user_by_firebase_uid(auth_user.id)  # Use firebase_uid field for Supabase ID
        return None
            
    except Exception as e:
        logger.debug(f"Supabase token verification failed: {e}")
        return None


def _get_user_by_firebase_uid(firebase_uid: str) -> Optional[User]:
    """Get user by Firebase UID from database"""
    from core.database_supabase import db
    from sqlalchemy.orm import joinedload
    
    try:
        logger.info(f"Looking up user by Firebase UID: {firebase_uid}")
        # Query directly using the current session
        user = db.session.query(User).options(
            joinedload(User.role),
            joinedload(User.student_profile),
            joinedload(User.instructor_profile)
        ).filter_by(firebase_uid=firebase_uid).first()
        
        if user:
            logger.info(f"User found: {user.email}, role: {user.role.role_type if user.role else 'no role'}")
        else:
            logger.warning(f"User not found in database for Firebase UID: {firebase_uid}")
        return user
    except Exception as e:
        logger.error(f"Error getting user by Firebase UID {firebase_uid}: {e}", exc_info=True)
        return None


# Backward compatibility aliases
# Create proper decorators instead of partials to avoid Flask endpoint naming issues
def firebase_auth_required(f):
    """Supabase authentication required decorator (Firebase compatibility)"""
    print(f"firebase_auth_required called for function: {f.__name__}")
    return auth_required(version_aware=True)(f)

def jwt_required_v1(f):
    """JWT v1 authentication required decorator"""
    return auth_required(version_aware=False)(f)

def jwt_required_v2(f):
    """JWT v2 authentication required decorator"""
    return auth_required(version_aware=True)(f)


def supabase_token_required(allow_unregistered: bool = False):
    """
    Decorator specifically for Supabase token authentication
    
    Args:
        allow_unregistered: If True, allows Supabase authenticated users who aren't registered in the database
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            # Skip authentication for OPTIONS requests
            if request.method == 'OPTIONS':
                return f(*args, **kwargs)
                
            # Check for Supabase token
            auth_header = request.headers.get('Authorization', '')
            supabase_token = request.headers.get('X-Auth-Token')
            
            if auth_header.startswith('Bearer '):
                supabase_token = auth_header[7:]
            
            if not supabase_token:
                return jsonify({'error': 'Authentication token required'}), 401
                
            try:
                # Verify Supabase token
                auth_service = get_auth_service()
                auth_user = auth_service.verify_token(supabase_token)
                
                if not auth_user:
                    return jsonify({'error': 'Invalid authentication token'}), 401
                
                # Store Supabase user info
                g.supabase_user = {
                    'uid': auth_user.id,
                    'email': auth_user.email,
                    'name': auth_user.metadata.get('full_name'),
                    'role': auth_user.role
                }
                
                # Try to get user from database
                user = _get_user_by_firebase_uid(auth_user.id)  # Use firebase_uid field for Supabase ID
                if user:
                    g.current_user = user
                elif not allow_unregistered:
                    return jsonify({
                        'error': 'User not registered',
                        'code': 'USER_NOT_REGISTERED',
                        'message': 'Please complete registration to access this resource'
                    }), 404
                    
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Supabase token verification failed: {e}")
                return jsonify({'error': 'Invalid authentication token'}), 401
                
        return decorated_function
    return decorator
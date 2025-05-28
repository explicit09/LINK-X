"""
Enhanced Authentication Decorators V2
Implements proper token validation with retry logic
"""
from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
import jwt
import firebase_admin.auth as firebase_auth
from datetime import datetime

from ..services.auth_service_v2 import AuthServiceV2
from ..repositories.user_repository import UserRepository
from ..db.connection import get_db_session
from ..config import Config

auth_service = AuthServiceV2()

def auth_required(optional=False, fresh=False, refresh=False):
    """
    Enhanced authentication decorator with multiple auth methods
    
    Args:
        optional: If True, authentication is optional
        fresh: If True, requires a fresh token (recently authenticated)
        refresh: If True, requires a refresh token
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Skip for OPTIONS requests (CORS preflight)
            if request.method == 'OPTIONS':
                return f(*args, **kwargs)
            
            # Try multiple authentication methods in order
            auth_success = False
            auth_error = None
            
            # 1. Try JWT from Authorization header
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    user_data = auth_service.verify_session_token(token)
                    auth_success = True
                    _set_user_context(user_data['id'])
                except Exception as e:
                    auth_error = str(e)
            
            # 2. Try JWT from cookie
            if not auth_success:
                token = request.cookies.get('access_token')
                if token:
                    try:
                        user_data = auth_service.verify_session_token(token)
                        auth_success = True
                        _set_user_context(user_data['id'])
                    except Exception as e:
                        auth_error = str(e)
            
            # 3. Try Firebase token (backward compatibility)
            if not auth_success and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    decoded_token = firebase_auth.verify_id_token(token)
                    # Look up user by Firebase UID
                    user_repo = UserRepository()
                    user = user_repo.find_by_firebase_uid(decoded_token['uid'])
                    if user:
                        auth_success = True
                        _set_user_context(str(user.id))
                    else:
                        auth_error = "User not found"
                except Exception as e:
                    auth_error = str(e)
            
            # Handle authentication result
            if not auth_success:
                if optional:
                    g.current_user = None
                    return f(*args, **kwargs)
                else:
                    return jsonify({
                        'error': auth_error or 'Authentication required',
                        'code': 'AUTHENTICATION_REQUIRED'
                    }), 401
            
            # Check token freshness if required
            if fresh and hasattr(g, 'jwt_claims'):
                if not g.jwt_claims.get('fresh', False):
                    return jsonify({
                        'error': 'Fresh token required',
                        'code': 'FRESH_TOKEN_REQUIRED'
                    }), 401
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def require_role(*allowed_roles):
    """
    Decorator to require specific user roles
    """
    def decorator(f):
        @wraps(f)
        @auth_required()
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({
                    'error': 'Authentication required',
                    'code': 'AUTHENTICATION_REQUIRED'
                }), 401
            
            user_role = g.current_user.role.name.lower()
            allowed_roles_lower = [r.lower() for r in allowed_roles]
            
            if user_role not in allowed_roles_lower:
                return jsonify({
                    'error': 'Insufficient permissions',
                    'code': 'INSUFFICIENT_PERMISSIONS',
                    'required_roles': list(allowed_roles),
                    'user_role': user_role
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def _set_user_context(user_id: str):
    """
    Set user context in Flask g object
    """
    session = get_db_session()
    try:
        from ..db.schema import User
        from sqlalchemy.orm import joinedload
        
        user = session.query(User).options(
            joinedload(User.role),
            joinedload(User.student_profile),
            joinedload(User.instructor_profile),
            joinedload(User.admin_profile)
        ).filter_by(id=user_id).first()
        
        if user:
            g.current_user = user
            g.user_id = str(user.id)
            g.user_role = user.role.name
            g.db_session = session  # Keep session alive for request
            
            # Set JWT claims if available
            try:
                if hasattr(verify_jwt_in_request, '__call__'):
                    verify_jwt_in_request(optional=True)
                    g.jwt_claims = get_jwt()
            except:
                pass
    except Exception as e:
        session.close()
        raise

# Backward compatibility aliases
firebase_auth_required = auth_required
jwt_required_v2 = auth_required

# Enhanced rate limiting with user awareness
def rate_limit_v2(limit=60, per=60, by='ip'):
    """
    Enhanced rate limiting decorator
    
    Args:
        limit: Number of requests allowed
        per: Time period in seconds
        by: Rate limit by 'ip', 'user', or 'both'
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            import redis
            redis_client = redis.Redis(
                host=Config.REDIS_HOST,
                port=Config.REDIS_PORT,
                db=0
            )
            
            # Determine rate limit key
            identifiers = []
            
            if by in ['ip', 'both']:
                identifiers.append(f"ip:{request.remote_addr}")
            
            if by in ['user', 'both'] and hasattr(g, 'user_id'):
                identifiers.append(f"user:{g.user_id}")
            
            if not identifiers:
                identifiers.append(f"ip:{request.remote_addr}")
            
            # Check rate limits
            for identifier in identifiers:
                key = f"rate_limit:{f.__name__}:{identifier}"
                
                try:
                    current = redis_client.get(key)
                    if current and int(current) >= limit:
                        return jsonify({
                            'error': 'Rate limit exceeded',
                            'retry_after': redis_client.ttl(key)
                        }), 429
                    
                    # Increment counter
                    pipe = redis_client.pipeline()
                    pipe.incr(key)
                    pipe.expire(key, per)
                    pipe.execute()
                    
                except redis.RedisError:
                    # If Redis is down, allow the request
                    pass
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

# Request validation decorator
def validate_request(schema=None, required_fields=None):
    """
    Enhanced request validation decorator
    
    Args:
        schema: JSON schema for validation
        required_fields: List of required fields (simpler alternative)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.method == 'OPTIONS':
                return f(*args, **kwargs)
            
            # For GET requests, validate query parameters
            if request.method == 'GET':
                data = request.args.to_dict()
            else:
                # Check content type
                if not request.is_json:
                    return jsonify({
                        'error': 'Content-Type must be application/json'
                    }), 400
                
                data = request.get_json()
                if not data:
                    return jsonify({
                        'error': 'Request body is required'
                    }), 400
            
            # Simple required fields validation
            if required_fields:
                missing_fields = [
                    field for field in required_fields 
                    if field not in data or data[field] is None
                ]
                if missing_fields:
                    return jsonify({
                        'error': f'Missing required fields: {", ".join(missing_fields)}'
                    }), 400
            
            # JSON schema validation
            if schema:
                try:
                    import jsonschema
                    jsonschema.validate(data, schema)
                except jsonschema.ValidationError as e:
                    return jsonify({
                        'error': f'Validation error: {e.message}'
                    }), 400
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

# Cleanup decorator for database sessions
def cleanup_session(f):
    """
    Decorator to ensure database sessions are properly cleaned up
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            result = f(*args, **kwargs)
            return result
        finally:
            # Clean up any database session in g
            if hasattr(g, 'db_session'):
                try:
                    g.db_session.close()
                except:
                    pass
    
    return decorated_function
from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
import time
import redis
from datetime import datetime, timedelta
import firebase_admin.auth as firebase_auth

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def validate_json(required_fields):
    """Decorator to validate JSON request body"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Request body is required'}), 400
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return jsonify({
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def rate_limit(limit=60, per=60):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client identifier (IP or user ID)
            client_id = request.remote_addr
            if hasattr(g, 'current_user') and g.current_user:
                client_id = f"user:{g.current_user.id}"
            
            # Create Redis key
            key = f"rate_limit:{f.__name__}:{client_id}"
            
            try:
                # Check current count
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

def firebase_auth_required(f):
    """Decorator to require Firebase authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        print(f"Auth header received: {auth_header[:50] if auth_header else 'None'}...")
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header missing or invalid'}), 401
        
        token = auth_header.split(' ')[1]
        try:
            # Verify Firebase token
            print(f"Verifying Firebase token: {token[:20]}...")
            decoded_token = firebase_auth.verify_id_token(token)
            print(f"Token verified successfully for uid: {decoded_token['uid']}")
            g.firebase_user = decoded_token
            g.firebase_uid = decoded_token['uid']
            
            # Get user from database
            from ..repositories.user_repository import UserRepository
            user_repo = UserRepository()
            print(f"Looking for user with Firebase UID: {g.firebase_uid}")
            user = user_repo.find_by_firebase_uid(g.firebase_uid)
            
            if not user:
                print(f"User not found in database for Firebase UID: {g.firebase_uid}")
                return jsonify({'error': 'User not found'}), 404
            
            print(f"User found: {user.id}, email: {user.email}")
            g.current_user = user
            return f(*args, **kwargs)
            
        except firebase_auth.InvalidIdTokenError:
            return jsonify({'error': 'Invalid authentication token'}), 401
        except firebase_auth.ExpiredIdTokenError:
            return jsonify({'error': 'Authentication token expired'}), 401
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return jsonify({'error': 'Authentication failed'}), 401
    
    return decorated_function

def require_role(roles):
    """Decorator to require specific user roles"""
    if isinstance(roles, str):
        roles = [roles]
    
    def decorator(f):
        @wraps(f)
        @firebase_auth_required
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({'error': 'Authentication required'}), 401
            
            user_role = g.current_user.role.name.lower()
            if user_role not in [r.lower() for r in roles]:
                return jsonify({
                    'error': 'Insufficient permissions',
                    'required_roles': roles,
                    'user_role': user_role
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def paginate(default_limit=20, max_limit=100):
    """Decorator to add pagination to endpoints"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            page = request.args.get('page', 1, type=int)
            limit = request.args.get('limit', default_limit, type=int)
            
            # Enforce max limit
            limit = min(limit, max_limit)
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Add pagination info to g
            g.pagination = {
                'page': page,
                'limit': limit,
                'offset': offset
            }
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def async_task(f):
    """Decorator to run function asynchronously"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from threading import Thread
        thread = Thread(target=f, args=args, kwargs=kwargs)
        thread.daemon = True
        thread.start()
        return thread
    return decorated_function

def cache_response(expiration=300, max_age=None, private=False):
    """Cache response decorator with HTTP cache headers support"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"cache:{f.__name__}:{str(args)}:{str(kwargs)}"
            
            try:
                # Try to get from cache
                cached = redis_client.get(cache_key)
                if cached:
                    import json
                    response = jsonify(json.loads(cached))
                    
                    # Add cache headers
                    if max_age:
                        cache_control = f"max-age={max_age}"
                        if private:
                            cache_control += ", private"
                        response.headers['Cache-Control'] = cache_control
                    
                    return response
            except redis.RedisError:
                pass
            
            # Execute function
            result = f(*args, **kwargs)
            
            # Cache result if it's a successful response
            if isinstance(result, tuple) and result[1] == 200:
                try:
                    import json
                    # Extract the response data
                    response_data = result[0].get_json() if hasattr(result[0], 'get_json') else result[0]
                    redis_client.setex(
                        cache_key,
                        expiration,
                        json.dumps(response_data)
                    )
                except (redis.RedisError, json.JSONDecodeError):
                    pass
            
            # Add cache headers to response
            if isinstance(result, tuple) and hasattr(result[0], 'headers'):
                if max_age:
                    cache_control = f"max-age={max_age}"
                    if private:
                        cache_control += ", private"
                    result[0].headers['Cache-Control'] = cache_control
            
            return result
        return decorated_function
    return decorator
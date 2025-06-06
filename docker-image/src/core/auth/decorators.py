"""
Authentication Decorators for Supabase
Clean, reusable decorators for protecting endpoints
"""
from functools import wraps
from typing import List, Optional, Callable
from flask import request, g, jsonify, current_app
import logging

from services.auth.supabase_auth_service import get_auth_service, AuthUser
from core.exceptions import AuthenticationError, AuthorizationError

logger = logging.getLogger(__name__)


def extract_token_from_request() -> Optional[str]:
    """
    Extract JWT token from request headers
    Supports both 'Authorization: Bearer <token>' and 'X-Auth-Token: <token>'
    """
    # Check Authorization header first
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]  # Remove 'Bearer ' prefix
    
    # Check custom header
    token = request.headers.get('X-Auth-Token')
    if token:
        return token
    
    # Check query parameter (for WebSocket upgrades)
    if request.args.get('token'):
        return request.args.get('token')
    
    return None


def require_auth(f: Callable) -> Callable:
    """
    Decorator to require authentication for an endpoint
    
    Usage:
        @app.route('/protected')
        @require_auth
        def protected_route():
            user = g.current_user  # Automatically available
            return jsonify({'user_id': user.id})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract token
        token = extract_token_from_request()
        if not token:
            logger.info("No authentication token provided")
            return jsonify({
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED'
            }), 401
        
        # Verify token
        auth_service = get_auth_service()
        user = auth_service.verify_token(token)
        
        if not user:
            logger.info("Invalid or expired token")
            return jsonify({
                'error': 'Invalid or expired token',
                'code': 'INVALID_TOKEN'
            }), 401
        
        # Store user in request context
        g.current_user = user
        g.auth_token = token
        
        # Log the authenticated request
        logger.debug(f"Authenticated request from user {user.id} ({user.email})")
        
        # Call the wrapped function
        return f(*args, **kwargs)
    
    return decorated_function


def require_role(*allowed_roles: str) -> Callable:
    """
    Decorator to require specific roles for an endpoint
    
    Usage:
        @app.route('/admin')
        @require_role('admin')
        def admin_route():
            return jsonify({'message': 'Admin only'})
        
        @app.route('/teaching')
        @require_role('instructor', 'admin')
        def teaching_route():
            return jsonify({'message': 'Instructors and admins'})
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        @require_auth  # Always require auth first
        def decorated_function(*args, **kwargs):
            user: AuthUser = g.current_user
            
            if user.role not in allowed_roles:
                logger.warning(f"User {user.id} with role '{user.role}' attempted to access endpoint requiring roles: {allowed_roles}")
                return jsonify({
                    'error': 'Insufficient permissions',
                    'code': 'FORBIDDEN',
                    'required_roles': list(allowed_roles),
                    'user_role': user.role
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


def require_verified_email(f: Callable) -> Callable:
    """
    Decorator to require verified email
    
    Usage:
        @app.route('/verified-only')
        @require_verified_email
        def verified_route():
            return jsonify({'message': 'Verified users only'})
    """
    @wraps(f)
    @require_auth
    def decorated_function(*args, **kwargs):
        user: AuthUser = g.current_user
        
        if not user.email_verified:
            return jsonify({
                'error': 'Email verification required',
                'code': 'EMAIL_NOT_VERIFIED'
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_auth(f: Callable) -> Callable:
    """
    Decorator to optionally authenticate a user
    User will be available in g.current_user if authenticated, None otherwise
    
    Usage:
        @app.route('/public')
        @optional_auth
        def public_route():
            if g.current_user:
                return jsonify({'message': f'Hello {g.current_user.email}'})
            return jsonify({'message': 'Hello anonymous'})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Initialize as None
        g.current_user = None
        g.auth_token = None
        
        # Try to extract and verify token
        token = extract_token_from_request()
        if token:
            auth_service = get_auth_service()
            user = auth_service.verify_token(token)
            if user:
                g.current_user = user
                g.auth_token = token
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_ownership(resource_getter: Callable) -> Callable:
    """
    Decorator to require ownership of a resource
    
    Args:
        resource_getter: Function that takes the request args/kwargs and returns
                        a resource with an 'owner_id' or 'user_id' attribute
    
    Usage:
        def get_course(course_id):
            return Course.query.get(course_id)
        
        @app.route('/courses/<course_id>', methods=['PUT'])
        @require_ownership(get_course)
        def update_course(course_id):
            # Only the course owner can update
            return jsonify({'message': 'Updated'})
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            user: AuthUser = g.current_user
            
            # Get the resource
            resource = resource_getter(*args, **kwargs)
            if not resource:
                return jsonify({
                    'error': 'Resource not found',
                    'code': 'NOT_FOUND'
                }), 404
            
            # Check ownership
            owner_id = getattr(resource, 'owner_id', None) or getattr(resource, 'user_id', None)
            if not owner_id:
                logger.error(f"Resource {resource} has no owner_id or user_id attribute")
                return jsonify({
                    'error': 'Internal server error',
                    'code': 'INTERNAL_ERROR'
                }), 500
            
            # Allow admins to bypass ownership check
            if user.role != 'admin' and str(owner_id) != user.id:
                return jsonify({
                    'error': 'You do not have permission to access this resource',
                    'code': 'FORBIDDEN'
                }), 403
            
            # Store resource in context for reuse
            g.resource = resource
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


def rate_limit(max_requests: int = 100, window_seconds: int = 3600) -> Callable:
    """
    Simple rate limiting decorator (integrates with existing rate limiter)
    
    Usage:
        @app.route('/api/expensive')
        @rate_limit(max_requests=10, window_seconds=60)
        @require_auth
        def expensive_operation():
            return jsonify({'result': 'success'})
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # This would integrate with your existing rate limiting service
            # For now, just pass through
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


# Convenience aliases
auth_required = require_auth
role_required = require_role
verified_required = require_verified_email
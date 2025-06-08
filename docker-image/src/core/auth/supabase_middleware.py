"""
Centralized Supabase Authentication Middleware
Single source of truth for backend authentication
"""
import os
import logging
from functools import wraps
from typing import Optional, Dict, Any
from flask import request, jsonify, g, current_app
import jwt
from sqlalchemy import text
from services.auth.simple_auth_service import SimpleAuthService
from core.exceptions import AuthenticationError

from core.database_supabase import db_manager

logger = logging.getLogger(__name__)


class SimpleUser:
    """Simple user object to maintain compatibility with existing code"""
    def __init__(self, user_info: Dict[str, Any]):
        self.id = user_info.get('id')
        self.email = user_info.get('email')
        self.role = user_info.get('role', 'authenticated')
        self.aud = user_info.get('aud')
        self.exp = user_info.get('exp')
        self.iat = user_info.get('iat')
        
        # Set role_type for compatibility
        self.role_type = self.role


class SupabaseAuth:
    """Centralized authentication handler"""
    
    def __init__(self):
        self.jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
        if not self.jwt_secret:
            logger.error("SUPABASE_JWT_SECRET not configured!")
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify a Supabase JWT token
        Returns user data if valid, None otherwise
        """
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode the JWT with Supabase-specific settings
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=['HS256'],
                audience='authenticated',  # Supabase uses 'authenticated' as audience
                options={
                    "verify_exp": True,
                    "verify_aud": True,   # Verify audience for Supabase
                    "verify_iss": False,  # Don't verify issuer
                }
            )
            
            # Extract user info
            user_id = payload.get('sub')
            if not user_id:
                return None
            
            return {
                'id': user_id,
                'email': payload.get('email'),
                'role': payload.get('role', 'authenticated')
            }
            
        except jwt.ExpiredSignatureError:
            logger.debug("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.debug(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from database"""
        try:
            with db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT u.id, u.email, u.role, u.is_active,
                               sp.name, sp.onboarding_completed
                        FROM users u
                        LEFT JOIN student_profiles sp ON u.id = sp.user_id
                        WHERE u.id = :user_id
                    """),
                    {"user_id": user_id}
                ).fetchone()
                
                if not result:
                    return None
                
                return {
                    'id': result[0],
                    'email': result[1],
                    'role': result[2],
                    'is_active': result[3],
                    'name': result[4],
                    'onboarding_completed': result[5] if result[5] is not None else True
                }
                
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return None


# Global instance
auth = SupabaseAuth()


def require_auth(f):
    """
    Decorator that requires valid JWT authentication.
    Extracts user info from JWT token and makes it available via g.current_user
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            current_app.logger.warning("No Authorization header provided")
            return jsonify({'error': 'Authentication required', 'message': 'No authorization header'}), 401
        
        try:
            # Initialize auth service
            auth_service = SimpleAuthService()
            
            # Verify token and get user info
            user_info = auth_service.get_user_from_token(auth_header)
            
            # Create a simple user object for compatibility
            user_obj = SimpleUser(user_info)
            
            # Store user object in Flask's g object for use in the request
            g.current_user = user_obj
            g.user_id = user_obj.id
            
            current_app.logger.info(f"Authentication successful for user: {g.user_id}")
            
            return f(*args, **kwargs)
            
        except AuthenticationError as e:
            current_app.logger.warning(f"Authentication failed: {str(e)}")
            return jsonify({'error': 'Authentication required', 'message': str(e)}), 401
        except Exception as e:
            current_app.logger.error(f"Unexpected authentication error: {str(e)}")
            return jsonify({'error': 'Authentication required', 'message': 'Authentication failed'}), 401
    
    return decorated_function


def require_role(role: str):
    """
    Decorator to require a specific role
    Usage: @require_role('professor')
    """
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            if g.user.get('role') != role:
                return jsonify({
                    'status': 'error',
                    'message': f'Requires {role} role'
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def optional_auth(f):
    """
    Decorator for routes where auth is optional
    Usage: @optional_auth
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            # Try to verify token
            token_data = auth.verify_token(auth_header)
            if token_data:
                # Get user profile if token is valid
                user_profile = auth.get_user_profile(token_data['id'])
                if user_profile and user_profile.get('is_active'):
                    g.user = user_profile
                    g.token = auth_header
                else:
                    g.user = None
                    g.token = None
            else:
                g.user = None
                g.token = None
        else:
            g.user = None
            g.token = None
        
        return f(*args, **kwargs)
    
    return decorated_function


def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Extract user information from JWT token.
    This is a standalone function for cases where you need to verify a token
    without using the decorator.
    """
    try:
        auth_service = SimpleAuthService()
        return auth_service.get_user_from_token(token)
    except AuthenticationError:
        return None
    except Exception as e:
        logger.error(f"Error extracting user from token: {str(e)}")
        return None
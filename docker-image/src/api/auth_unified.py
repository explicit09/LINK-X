"""
Unified Authentication API
Supports both v1 (legacy) and v2 (modern) authentication flows
"""

from flask import Blueprint, request, jsonify, g, make_response
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt, current_user
)
from datetime import datetime, timedelta
import logging

from services.auth_service_unified import UnifiedAuthService
from core.decorators_unified import auth_required, rate_limit
from core.exceptions import ValidationError, AuthenticationError, NotFoundError

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('auth', __name__)

# Initialize service (will be properly injected later)
auth_service = UnifiedAuthService()


def get_api_version():
    """Get API version from request headers or path"""
    # Check header first
    version = request.headers.get('X-API-Version', 'v1')
    
    # Check if path contains version
    if '/api/v2/' in request.path:
        version = 'v2'
    elif '/api/v1/' in request.path:
        version = 'v1'
        
    return version


@bp.route('/login', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=60)
def login():
    """
    Unified login endpoint supporting both v1 and v2 flows
    
    v1: Returns JWT in response body
    v2: Returns access token + sets refresh token in HTTP-only cookie
    """
    try:
        data = request.get_json()
        version = get_api_version()
        
        # Validate request data
        if not data:
            raise ValidationError("Request body is required")
            
        # Firebase authentication (both versions)
        if 'idToken' in data or 'id_token' in data:
            token = data.get('idToken') or data.get('id_token')
            result = auth_service.authenticate_firebase(token, version=version)
        
        # Email/password authentication (v1 compatibility)
        elif 'email' in data and 'password' in data:
            if version == 'v2':
                raise ValidationError("Email/password login not supported in v2")
            result = auth_service.authenticate_email_password(
                data['email'], 
                data['password']
            )
        else:
            raise ValidationError("Invalid credentials provided")
        
        # Handle response based on version
        if version == 'v2':
            # Modern OAuth2-style response
            response = make_response(jsonify({
                'access_token': result['access_token'],
                'token_type': 'Bearer',
                'expires_in': 1800,  # 30 minutes
                'user': result['user']
            }))
            
            # Set refresh token in HTTP-only cookie
            if 'refresh_token' in result:
                response.set_cookie(
                    'refresh_token',
                    result['refresh_token'],
                    httponly=True,
                    secure=True,
                    samesite='Lax',
                    max_age=30*24*60*60  # 30 days
                )
                
            return response
        else:
            # Legacy v1 response
            return jsonify({
                'token': result['jwt_token'],
                'user': result['user']
            })
            
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except AuthenticationError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@bp.route('/register', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=300)
def register():
    """
    Unified registration endpoint
    
    v1: Supports role in URL path
    v2: Role specified in request body
    """
    try:
        data = request.get_json()
        version = get_api_version()
        
        if not data:
            raise ValidationError("Request body is required")
            
        # Extract role based on version
        if version == 'v1':
            # Check if role is in path (legacy endpoints)
            role = request.view_args.get('role', data.get('role', 'student'))
        else:
            # v2 requires role in body
            role = data.get('role')
            if not role:
                raise ValidationError("Role is required")
                
        # Validate role
        if role not in ['student', 'instructor', 'admin']:
            raise ValidationError(f"Invalid role: {role}")
            
        # Create user
        result = auth_service.create_user(
            email=data.get('email'),
            password=data.get('password'),
            role=role,
            firebase_uid=data.get('firebase_uid'),
            name=data.get('name'),
            version=version
        )
        
        return jsonify(result), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@bp.route('/register/<role>', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=300)
def register_with_role(role):
    """Legacy v1 endpoint for backward compatibility"""
    request.view_args['role'] = role
    return register()


@bp.route('/refresh', methods=['POST'])
def refresh_token():
    """
    Refresh access token (v2 only)
    """
    version = get_api_version()
    if version != 'v2':
        return jsonify({'error': 'Endpoint not available in v1'}), 404
        
    try:
        # Get refresh token from cookie or body
        refresh_token = request.cookies.get('refresh_token')
        if not refresh_token:
            data = request.get_json() or {}
            refresh_token = data.get('refresh_token')
            
        if not refresh_token:
            raise AuthenticationError("Refresh token required")
            
        result = auth_service.refresh_access_token(refresh_token)
        
        return jsonify({
            'access_token': result['access_token'],
            'token_type': 'Bearer',
            'expires_in': 1800
        })
        
    except AuthenticationError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@bp.route('/logout', methods=['POST'])
@auth_required(version_aware=True)
def logout():
    """
    Logout endpoint
    
    v1: Clears JWT from client
    v2: Blacklists tokens and clears session
    """
    try:
        version = get_api_version()
        user_id = g.current_user.user_id
        
        if version == 'v2':
            # Get tokens to blacklist
            access_token = get_jwt()
            refresh_token = request.cookies.get('refresh_token')
            
            auth_service.logout(
                user_id=user_id,
                access_token_jti=access_token.get('jti'),
                refresh_token=refresh_token
            )
            
            # Clear refresh token cookie
            response = make_response(jsonify({'message': 'Logged out successfully'}))
            response.set_cookie('refresh_token', '', expires=0)
            return response
        else:
            # v1 just returns success (client handles token removal)
            return jsonify({'message': 'Logged out successfully'})
            
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@bp.route('/me', methods=['GET'])
@auth_required(version_aware=True)
def get_current_user():
    """Get current user profile"""
    try:
        user = g.current_user
        return jsonify({
            'user_id': user.user_id,
            'email': user.email,
            'role': user.role_type,
            'name': user.name,
            'created_at': user.created_at.isoformat() if user.created_at else None
        })
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@bp.route('/verify', methods=['POST'])
def verify_token():
    """Verify token validity (both versions)"""
    try:
        data = request.get_json() or {}
        token = data.get('token')
        
        if not token:
            # Check Authorization header
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
                
        if not token:
            raise ValidationError("Token required")
            
        version = get_api_version()
        result = auth_service.verify_token(token, version=version)
        
        return jsonify({
            'valid': result['valid'],
            'user': result.get('user')
        })
        
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({'valid': False, 'error': str(e)}), 200


# Legacy v1 endpoints for backward compatibility
@bp.route('/student/register', methods=['POST'])
def register_student():
    """Legacy student registration endpoint"""
    request.view_args['role'] = 'student'
    return register()


@bp.route('/instructor/register', methods=['POST']) 
def register_instructor():
    """Legacy instructor registration endpoint"""
    request.view_args['role'] = 'instructor'
    return register()


# Health check
@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'auth'})
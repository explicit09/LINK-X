"""
Enhanced Authentication API V2
Implements proper OAuth2/JWT flow with Firebase integration
"""
from flask import Blueprint, request, jsonify, make_response, g
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import firebase_admin.auth as firebase_auth

from ..core.decorators import validate_json, rate_limit
from ..services.auth_service_v2 import AuthServiceV2
from ..core.exceptions import AuthenticationError, ValidationError

bp = Blueprint('auth_v2', __name__)
auth_service = AuthServiceV2()

@bp.route('/login', methods=['POST'])
@validate_json(['idToken'])
@rate_limit(limit=10, per=60)
def login():
    """
    Login with Firebase ID token
    Returns JWT access and refresh tokens
    """
    data = request.get_json()
    
    try:
        user_data, access_token, refresh_token = auth_service.authenticate_firebase(
            data['idToken']
        )
        
        response = jsonify({
            'success': True,
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token
        })
        
        # Set secure HTTP-only cookie for refresh token
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=30*24*60*60,  # 30 days
            httponly=True,
            secure=request.is_secure,
            samesite='Lax',
            path='/api/v2/auth'
        )
        
        return response, 200
        
    except AuthenticationError as e:
        if hasattr(e, 'code') and e.code == 'USER_NOT_REGISTERED':
            return jsonify({
                'error': str(e),
                'code': 'USER_NOT_REGISTERED',
                'requires_registration': True
            }), 404
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        return jsonify({'error': 'Authentication failed'}), 500

@bp.route('/register', methods=['POST'])
@validate_json(['idToken', 'role', 'profile'])
@rate_limit(limit=5, per=300)
def register():
    """
    Register new user with Firebase authentication
    """
    data = request.get_json()
    
    try:
        result = auth_service.register_with_firebase(
            id_token=data['idToken'],
            role=data['role'],
            profile_data=data['profile']
        )
        
        response = jsonify({
            'success': True,
            'user': {
                'id': result['id'],
                'email': result['email'],
                'role': result['role']
            },
            'access_token': result['access_token'],
            'refresh_token': result['refresh_token']
        })
        
        # Set secure HTTP-only cookie for refresh token
        response.set_cookie(
            'refresh_token',
            result['refresh_token'],
            max_age=30*24*60*60,  # 30 days
            httponly=True,
            secure=request.is_secure,
            samesite='Lax',
            path='/api/v2/auth'
        )
        
        return response, 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Registration failed'}), 500

@bp.route('/refresh', methods=['POST'])
def refresh():
    """
    Refresh access token using refresh token
    """
    # Try to get refresh token from cookie first, then from body
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        data = request.get_json() or {}
        refresh_token = data.get('refresh_token')
    
    if not refresh_token:
        return jsonify({'error': 'Refresh token required'}), 400
    
    try:
        new_access_token, new_refresh_token = auth_service.refresh_access_token(
            refresh_token
        )
        
        response = jsonify({
            'access_token': new_access_token
        })
        
        # If refresh token was rotated, update cookie
        if new_refresh_token:
            response.set_cookie(
                'refresh_token',
                new_refresh_token,
                max_age=30*24*60*60,  # 30 days
                httponly=True,
                secure=request.is_secure,
                samesite='Lax',
                path='/api/v2/auth'
            )
        
        return response, 200
        
    except AuthenticationError as e:
        return jsonify({'error': str(e)}), 401

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout user by blacklisting tokens
    """
    try:
        # Get access token from JWT
        access_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        # Get refresh token from cookie or body
        refresh_token = request.cookies.get('refresh_token')
        if not refresh_token:
            data = request.get_json() or {}
            refresh_token = data.get('refresh_token')
        
        auth_service.logout(access_token, refresh_token)
        
        response = jsonify({'message': 'Logout successful'})
        
        # Clear refresh token cookie
        response.set_cookie(
            'refresh_token',
            '',
            max_age=0,
            httponly=True,
            secure=request.is_secure,
            samesite='Lax',
            path='/api/v2/auth'
        )
        
        return response, 200
        
    except Exception as e:
        return jsonify({'error': 'Logout failed'}), 500

@bp.route('/session', methods=['POST'])
@validate_json(['idToken'])
def establish_session():
    """
    Establish session for existing user
    Used after Firebase authentication to create backend session
    """
    data = request.get_json()
    
    try:
        user_data, access_token, refresh_token = auth_service.authenticate_firebase(
            data['idToken']
        )
        
        response = jsonify({
            'success': True,
            'user': user_data,
            'access_token': access_token
        })
        
        # Set both access and refresh tokens as cookies for session
        response.set_cookie(
            'access_token',
            access_token,
            max_age=15*60,  # 15 minutes
            httponly=True,
            secure=request.is_secure,
            samesite='Lax',
            path='/'
        )
        
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=30*24*60*60,  # 30 days
            httponly=True,
            secure=request.is_secure,
            samesite='Lax',
            path='/api/v2/auth'
        )
        
        return response, 200
        
    except AuthenticationError as e:
        if hasattr(e, 'code') and e.code == 'USER_NOT_REGISTERED':
            return jsonify({
                'error': str(e),
                'code': 'USER_NOT_REGISTERED',
                'requires_registration': True
            }), 404
        return jsonify({'error': str(e)}), 401

@bp.route('/verify', methods=['GET'])
def verify_token():
    """
    Verify current authentication status
    """
    # Check Authorization header first
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    else:
        # Check cookie
        token = request.cookies.get('access_token')
    
    if not token:
        return jsonify({
            'authenticated': False,
            'error': 'No authentication token'
        }), 401
    
    try:
        user_data = auth_service.verify_session_token(token)
        return jsonify({
            'authenticated': True,
            'user': user_data
        }), 200
    except AuthenticationError as e:
        return jsonify({
            'authenticated': False,
            'error': str(e)
        }), 401

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Get current user profile
    """
    try:
        user_id = get_jwt_identity()
        claims = get_jwt()
        
        # Get fresh user data from database
        from ..repositories.user_repository import UserRepository
        user_repo = UserRepository()
        user = user_repo.get_by_id(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get profile based on role
        profile_data = None
        if user.role.name == 'student' and user.student_profile:
            profile = user.student_profile
            profile_data = {
                'name': profile.name,
                'grade_level': profile.grade_level,
                'learning_style': profile.learning_style,
                'onboard_answers': profile.onboard_answers,
                'want_quizzes': profile.want_quizzes,
                'model_preference': profile.model_preference
            }
        elif user.role.name == 'instructor' and user.instructor_profile:
            profile = user.instructor_profile
            profile_data = {
                'name': profile.name,
                'university': profile.university,
                'department': profile.department,
                'bio': profile.bio
            }
        elif user.role.name == 'admin' and user.admin_profile:
            profile = user.admin_profile
            profile_data = {
                'name': profile.name
            }
        
        return jsonify({
            'id': str(user.id),
            'email': user.email,
            'role': user.role.name,
            'profile': profile_data,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login': user.last_login.isoformat() if user.last_login else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get user profile'}), 500

@bp.route('/me', methods=['PATCH'])
@jwt_required()
@validate_json([])
def update_current_user():
    """
    Update current user profile
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        from ..repositories.user_repository import UserRepository
        user_repo = UserRepository()
        
        # Update email if provided
        if 'email' in data:
            user_repo.update(user_id, email=data['email'])
        
        # Update profile fields
        user = user_repo.get_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update profile based on role
        profile_updates = {}
        if user.role.name == 'student':
            allowed_fields = ['name', 'grade_level', 'learning_style', 
                            'onboard_answers', 'want_quizzes', 'model_preference']
        elif user.role.name == 'instructor':
            allowed_fields = ['name', 'university', 'department', 'bio']
        elif user.role.name == 'admin':
            allowed_fields = ['name']
        else:
            allowed_fields = []
        
        for field in allowed_fields:
            if field in data:
                profile_updates[field] = data[field]
        
        if profile_updates:
            user_repo.update_profile(user_id, user.role.name, **profile_updates)
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to update profile'}), 500

# Health check endpoint
@bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check for auth service
    """
    return jsonify({
        'status': 'healthy',
        'service': 'auth_v2'
    }), 200
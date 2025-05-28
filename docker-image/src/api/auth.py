from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash
import firebase_admin.auth as firebase_auth

from ..core.decorators import validate_json, rate_limit, firebase_auth_required
from ..core.exceptions import AuthenticationError, ValidationError
from ..core.cache import cache_response
from ..services.auth_service import AuthService
from ..repositories.user_repository import UserRepository

bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['POST'])
@validate_json(['idToken'])
@rate_limit(limit=5, per=60)  # 5 requests per minute
def login():
    """Firebase authentication login endpoint"""
    data = request.get_json()
    
    try:
        # Verify Firebase token
        decoded_token = firebase_auth.verify_id_token(data['idToken'])
        firebase_uid = decoded_token['uid']
        
        # Get or create user
        user_repo = UserRepository()
        user = user_repo.find_by_firebase_uid(firebase_uid)
        
        if not user:
            # Create new user from Firebase data
            email = decoded_token.get('email', '')
            user = AuthService.create_firebase_user(
                firebase_uid=firebase_uid,
                email=email,
                name=decoded_token.get('name', email.split('@')[0])
            )
        
        # Create JWT token for internal use
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'success': True,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': user.role.value,
                'profile': user.get_profile()
            },
            'access_token': access_token
        }), 200
        
    except firebase_auth.InvalidIdTokenError:
        return jsonify({'error': 'Invalid authentication token'}), 401
    except firebase_auth.ExpiredIdTokenError:
        return jsonify({'error': 'Authentication token expired'}), 401
    except Exception as e:
        return jsonify({'error': 'Authentication failed'}), 500

@bp.route('/refresh', methods=['POST'])
@firebase_auth_required
def refresh_token():
    """Refresh authentication tokens"""
    try:
        user = g.current_user
        
        # Create new JWT token
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'email': user.email,
                'role': user.role.role_type if user.role else 'student'
            }
        )
        
        return jsonify({
            'access_token': access_token,
            'expires_in': 3600,  # 1 hour
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': user.role.role_type if user.role else 'student'
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Token refresh failed'}), 500

@bp.route('/sessionLogin', methods=['POST'])
@validate_json(['idToken'])
def session_login():
    """Session login endpoint for cookie-based authentication"""
    from flask import make_response
    data = request.get_json()
    
    try:
        # Verify Firebase token
        decoded_token = firebase_auth.verify_id_token(data['idToken'])
        firebase_uid = decoded_token['uid']
        
        # Get or create user
        user_repo = UserRepository()
        user = user_repo.find_by_firebase_uid(firebase_uid)
        
        if not user:
            # Don't auto-create user, return 404 to indicate registration needed
            email = decoded_token.get('email', '')
            return jsonify({
                'error': 'User not found. Please complete registration.',
                'needs_registration': True,
                'firebase_uid': firebase_uid,
                'email': email
            }), 404
        else:
            # Extract user data - need to get it all before session closes
            user_id = str(user.id)
            user_email = user.email
            
            # Get role and profile data in one place to avoid session issues
            role_value = 'student'  # default
            profile_data = None
            
            try:
                # Access all attributes while potentially in session
                if user.role:
                    role_value = user.role.role_type
                
                if role_value == 'student' and user.student_profile:
                    profile = user.student_profile
                    profile_data = {
                        'name': profile.name,
                        'grade_level': getattr(profile, 'grade_level', None)
                    }
                elif role_value == 'instructor' and user.instructor_profile:
                    profile = user.instructor_profile
                    profile_data = {
                        'name': profile.name,
                        'department': getattr(profile, 'department', None)
                    }
            except Exception as e:
                print(f"Error accessing user relationships: {e}")
                # If we can't access relationships, user still exists so continue
                pass
            
            user_data = {
                'id': user_id,
                'email': user_email,
                'role': role_value
            }
            
            if profile_data:
                user_data['profile'] = profile_data
        
        # Create JWT token for internal use
        access_token = create_access_token(identity=user_id)
        
        # Create response with session cookie
        response_data = {
            'success': True,
            'user': user_data,
            'access_token': access_token
        }
        
        response = make_response(jsonify(response_data), 200)
        
        # Set session cookie for persistent authentication
        response.set_cookie(
            'session_token',
            access_token,
            max_age=24*60*60,  # 24 hours
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite='Lax',
            path='/'  # Ensure cookie is available for all paths
        )
        
        print(f"Session cookie set for user {user_id}")
        print(f"Cookie domain: default (should be localhost)")
        
        return response
        
    except firebase_auth.InvalidIdTokenError:
        return jsonify({'error': 'Invalid authentication token'}), 401
    except firebase_auth.ExpiredIdTokenError:
        return jsonify({'error': 'Authentication token expired'}), 401
    except Exception as e:
        import traceback
        print(f"Session login error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Session login failed: {str(e)}'}), 500

@bp.route('/register/<role>', methods=['POST'])
@validate_json(['email', 'password', 'name'])
def register(role):
    """User registration endpoint"""
    if role not in ['student', 'instructor']:
        return jsonify({'error': 'Invalid role'}), 400
    
    data = request.get_json()
    
    try:
        user = AuthService.register(
            role=role,
            email=data['email'],
            password=data['password'],
            name=data['name'],
            additional_info=data.get('additionalInfo', {})
        )
        
        return jsonify({
            'message': 'Registration successful',
            'user_id': str(user.id)
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Registration failed'}), 500


@bp.route('/verify', methods=['GET'])
def verify_token():
    """Verify authentication token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    
    token = auth_header.split(' ')[1]
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return jsonify({
            'valid': True,
            'uid': decoded_token['uid']
        }), 200
    except:
        return jsonify({'valid': False}), 401

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({'access_token': access_token}), 200

@bp.route('/forgot-password', methods=['POST'])
@validate_json(['email'])
@rate_limit(limit=3, per=300)  # 3 requests per 5 minutes
def forgot_password():
    """Send password reset email"""
    data = request.get_json()
    
    try:
        AuthService.send_password_reset(data['email'])
        return jsonify({
            'message': 'Password reset email sent if account exists'
        }), 200
    except Exception as e:
        # Don't reveal whether email exists
        return jsonify({
            'message': 'Password reset email sent if account exists'
        }), 200

@bp.route('/logout', methods=['POST'])
@firebase_auth_required
def logout():
    """Logout endpoint"""
    try:
        response = make_response(jsonify({'message': 'Logged out successfully'}), 200)
        
        # Clear session cookie
        response.set_cookie(
            'session_token',
            '',
            max_age=0,
            httponly=True,
            secure=False,
            samesite='Lax',
            path='/'
        )
        
        return response
    except Exception as e:
        return jsonify({'error': 'Logout failed'}), 500

@bp.route('/reset-password', methods=['POST'])
@validate_json(['token', 'password'])
def reset_password():
    """Reset password with token"""
    data = request.get_json()
    
    try:
        AuthService.reset_password(
            token=data['token'],
            new_password=data['password']
        )
        return jsonify({'message': 'Password reset successful'}), 200
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Password reset failed'}), 500

# Migrated endpoints from monolithic app.py

@bp.route('/me', methods=['GET'])
@firebase_auth_required
@cache_response(expiration=60)
def get_current_user():
    """Get current user profile"""
    user = g.current_user
    
    # Get profile based on role
    profile_data = None
    role_value = user.role.role_type if user.role else 'student'
    
    if role_value == 'instructor':
        profile = user.instructor_profile
        if profile:
            profile_data = {
                'user_id': str(profile.user_id),
                'name': profile.name,
                'university': getattr(profile, 'university', None)
            }
    elif role_value == 'student':
        profile = user.student_profile
        if profile:
            profile_data = {
                'user_id': str(profile.user_id),
                'name': profile.name,
                'onboard_answers': getattr(profile, 'onboard_answers', None),
                'want_quizzes': getattr(profile, 'want_quizzes', None),
                'model_preference': getattr(profile, 'model_preference', None)
            }
    elif role_value == 'admin':
        profile = user.admin_profile
        if profile:
            profile_data = {
                'user_id': str(profile.user_id),
                'name': profile.name
            }
    
    return jsonify({
        'id': str(user.id),
        'email': user.email,
        'role': role_value,
        'profile': profile_data
    }), 200

@bp.route('/me', methods=['PATCH'])
@firebase_auth_required
@validate_json([])
def update_current_user():
    """Update current user profile"""
    user = g.current_user
    data = request.get_json()
    
    try:
        # Update user fields
        if 'email' in data:
            user = AuthService.update_email(user.id, data['email'])
        
        # Update profile based on role
        profile_updates = {}
        if user.role.value == 'student':
            allowed_fields = ['name', 'onboard_answers', 'want_quizzes', 'model_preference']
        elif user.role.value == 'instructor':
            allowed_fields = ['name', 'university']
        elif user.role.value == 'admin':
            allowed_fields = ['name']
        else:
            allowed_fields = []
        
        for field in allowed_fields:
            if field in data:
                profile_updates[field] = data[field]
        
        if profile_updates:
            AuthService.update_profile(user.id, user.role.value, **profile_updates)
        
        return jsonify({
            'id': str(user.id),
            'email': user.email,
            'role': user.role.value
        }), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/me', methods=['DELETE'])
@firebase_auth_required
def delete_current_user():
    """Delete current user account"""
    user = g.current_user
    
    try:
        AuthService.delete_user(user.id)
        
        resp = jsonify({'message': 'Account deleted'})
        # Clear any session cookies
        resp.set_cookie('session', '', max_age=0, httponly=True, samesite='Lax')
        return resp, 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to delete account'}), 500

# Update register endpoints to match old API structure
@bp.route('/register/instructor', methods=['POST'])
@validate_json(['idToken', 'email', 'password', 'name'])
def register_instructor():
    """Register new instructor - Firebase version"""
    data = request.get_json()
    
    try:
        # Verify Firebase token
        decoded_token = firebase_auth.verify_id_token(data['idToken'])
        firebase_uid = decoded_token['uid']
        
        user = AuthService.register(
            role='instructor',
            email=data['email'],
            password=data['password'],
            name=data['name'],
            additional_info={
                'university': data.get('university'),
                'firebase_uid': firebase_uid
            }
        )
        
        return jsonify({
            'id': str(user.id),
            'email': user.email
        }), 201
        
    except firebase_auth.InvalidIdTokenError:
        return jsonify({'error': 'Invalid ID token'}), 401
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Registration failed'}), 500

@bp.route('/register/student', methods=['POST'])
@validate_json(['idToken', 'email', 'password'])
def register_student():
    """Register new student - Firebase version"""
    data = request.get_json()
    
    try:
        # Verify Firebase token
        decoded_token = firebase_auth.verify_id_token(data['idToken'])
        firebase_uid = decoded_token['uid']
        
        user = AuthService.register(
            role='student',
            email=data['email'],
            password=data['password'],
            name=data.get('name', data['email'].split('@')[0]),
            additional_info={
                'firebase_uid': firebase_uid
            }
        )
        
        return jsonify({
            'id': str(user.id),
            'email': user.email
        }), 201
        
    except firebase_auth.InvalidIdTokenError:
        return jsonify({'error': 'Invalid ID token'}), 401
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Registration failed'}), 500
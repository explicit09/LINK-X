"""
API v2 Authentication Endpoints
"""
from flask import Blueprint, request, g
from datetime import datetime
import logging

from core.decorators_unified import firebase_auth_required, firebase_token_required
from core.exceptions import ValidationError, NotFoundError, UnauthorizedError, AuthenticationError
from services.auth_service_unified import UnifiedAuthService as AuthService
from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from repositories.enrollment_repository import EnrollmentRepository
from core.database import db, db_manager
from db.schema import Enrollment, Course, PersonalizedFile

from .utils import success_response, error_response

logger = logging.getLogger(__name__)

# Create auth blueprint
auth_bp = Blueprint('api_v2_auth', __name__)

# Initialize services with proper session factory
def get_auth_service():
    """Get auth service instance with proper session factory"""
    user_repo = UserRepository(db_manager.session_factory)
    return AuthService(user_repo=user_repo)


@auth_bp.route('/login', methods=['POST'])
def login_v2():
    """Enhanced login with better error handling and response structure"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
        
        id_token = data.get('idToken')
        if not id_token:
            return error_response("ID token is required", errors={'idToken': 'This field is required'}, status_code=400)
        
        # Use auth service for login
        auth_service = get_auth_service()
        result = auth_service.authenticate_with_firebase(id_token, version='v2')
        
        # Enhanced response with user details
        user_data = result['user']  # This is already a dict from auth service
        
        # Get display name - use name if available, otherwise fallback to email
        display_name = user_data.get('name') or user_data['email'].split('@')[0]
        
        response_data = {
            'user': {
                'id': str(user_data['user_id']),
                'email': user_data['email'],
                'display_name': display_name,
                'role': user_data.get('role'),
                'firebase_uid': user_data.get('firebase_uid'),
                'created_at': None  # Not available in current response
            },
            'tokens': {
                'access_token': result['access_token'],
                'refresh_token': result.get('refresh_token'),
                'expires_in': 3600  # 1 hour
            }
        }
        
        return success_response(response_data, "Login successful")
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except AuthenticationError as e:
        return error_response(str(e), status_code=401)
    except UnauthorizedError as e:
        return error_response(str(e), status_code=401)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return error_response("An error occurred during login", status_code=500)


@auth_bp.route('/logout', methods=['POST'])
@firebase_auth_required
def logout_v2():
    """Enhanced logout with token invalidation"""
    try:
        # Get JWT token for blacklisting
        from flask_jwt_extended import get_jwt
        token = get_jwt()
        
        # Blacklist the token
        from services.jwt_blacklist import jwt_blacklist
        from datetime import datetime
        exp_timestamp = token.get('exp', 0)
        exp_datetime = datetime.utcfromtimestamp(exp_timestamp) if exp_timestamp else datetime.utcnow()
        jwt_blacklist.blacklist_token(token['jti'], exp_datetime, token.get('sub'))
        
        return success_response(message="Logout successful")
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return error_response("An error occurred during logout", status_code=500)


@auth_bp.route('/check-registration', methods=['GET'])
@firebase_token_required(allow_unregistered=True)
def check_registration_v2():
    """Check if a Firebase-authenticated user is registered in the system"""
    try:
        # Check if user exists in database
        if hasattr(g, 'current_user') and g.current_user:
            # User is registered
            user = g.current_user
            return success_response({
                'registered': True,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role.role_type if user.role else None,
                    'firebase_uid': user.firebase_uid
                }
            })
        else:
            # User is not registered but has valid Firebase auth
            firebase_user = g.get('firebase_user', {})
            return success_response({
                'registered': False,
                'firebase_user': {
                    'uid': firebase_user.get('uid'),
                    'email': firebase_user.get('email'),
                    'name': firebase_user.get('name')
                }
            })
            
    except Exception as e:
        logger.error(f"Check registration error: {str(e)}")
        return error_response("An error occurred checking registration status", status_code=500)


@auth_bp.route('/register', methods=['POST'])
@firebase_token_required(allow_unregistered=True)
def register_v2():
    """Register a new user with Firebase authentication"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
        
        # Get Firebase user info
        firebase_user = g.get('firebase_user', {})
        if not firebase_user:
            return error_response("Firebase authentication required", status_code=401)
        
        # Extract required fields
        role = data.get('role', 'student')
        if role not in ['student', 'instructor']:
            return error_response("Invalid role. Must be 'student' or 'instructor'", status_code=400)
        
        # Prepare registration data
        registration_data = {
            'email': firebase_user.get('email'),
            'firebase_uid': firebase_user.get('uid'),
            'role': role,
            'name': data.get('name') or firebase_user.get('name'),
            'version': 'v2'
        }
        
        # Add role-specific data
        if role == 'student':
            registration_data.update({
                'onboard_answers': data.get('onboard_answers', {}),
                'want_quizzes': data.get('want_quizzes', False)
            })
        elif role == 'instructor':
            registration_data.update({
                'university': data.get('university'),
                'department': data.get('department')
            })
        
        # Use auth service to register
        auth_service = get_auth_service()
        result = auth_service.register_user(**registration_data)
        
        return success_response(result, "Registration successful", status_code=201)
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return error_response("An error occurred during registration", status_code=500)


@auth_bp.route('/me', methods=['GET'])
@firebase_auth_required
def get_profile_v2():
    """Get current user profile with enhanced data"""
    try:
        user = g.current_user
        user_repo = UserRepository(db_manager.session_factory)
        
        # Refresh user data from database
        fresh_user = user_repo.get_by_id(user.id)
        if not fresh_user:
            return error_response("User not found", status_code=404)
        
        # Build comprehensive profile
        profile_data = {
            'id': str(fresh_user.id),
            'email': fresh_user.email,
            'role': fresh_user.role.role_type if fresh_user.role else 'student',
            'verified': getattr(fresh_user, 'verified', True),
            'created_at': fresh_user.created_at.isoformat() if hasattr(fresh_user, 'created_at') else None,
            'profile': {}
        }
        
        # Add role-specific profile data
        if fresh_user.student_profile:
            profile_data['profile'] = {
                'name': fresh_user.student_profile.name,
                'onboard_answers': fresh_user.student_profile.onboard_answers,
                'want_quizzes': fresh_user.student_profile.want_quizzes
            }
        elif fresh_user.instructor_profile:
            profile_data['profile'] = {
                'name': fresh_user.instructor_profile.name,
                'university': fresh_user.instructor_profile.university,
                'department': fresh_user.instructor_profile.department
            }
        elif fresh_user.admin_profile:
            profile_data['profile'] = {
                'name': fresh_user.admin_profile.name
            }
        
        # Add statistics
        stats = {}
        if fresh_user.role and fresh_user.role.role_type == 'student':
            # Get student statistics
            enrollments = db.session.query(Enrollment).filter_by(user_id=fresh_user.id).all()
            stats['enrolled_courses'] = len(enrollments)
            stats['completed_courses'] = sum(1 for e in enrollments if getattr(e, 'completed', False))
            stats['total_files_viewed'] = 0  # TODO: Implement file view tracking
        elif fresh_user.role and fresh_user.role.role_type == 'instructor':
            # Get instructor statistics
            course_repo = CourseRepository()
            courses = course_repo.get_by_instructor(fresh_user.id)
            stats['total_courses'] = len(courses)
            stats['total_students'] = sum(course_repo.get_student_count(c.id) for c in courses)
        
        profile_data['stats'] = stats
        
        return success_response(profile_data)
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        return error_response("An error occurred fetching profile", status_code=500)


@auth_bp.route('/me', methods=['PATCH'])
@firebase_auth_required
def update_profile_v2():
    """Update current user profile"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        user_repo = UserRepository(db_manager.session_factory)
        
        # Update user email if provided (requires Firebase update too)
        if 'email' in data and data['email'] != user.email:
            # TODO: Implement Firebase email update
            return error_response("Email update not yet implemented")
        
        # Update role-specific profile
        if user.student_profile and 'profile' in data:
            profile_updates = data['profile']
            for key in ['name', 'onboard_answers', 'want_quizzes']:
                if key in profile_updates:
                    setattr(user.student_profile, key, profile_updates[key])
        elif user.instructor_profile and 'profile' in data:
            profile_updates = data['profile']
            for key in ['name', 'university', 'department']:
                if key in profile_updates:
                    setattr(user.instructor_profile, key, profile_updates[key])
        
        # Commit changes
        db.session.commit()
        
        # Return updated profile
        return get_profile_v2()
        
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        db.session.rollback()
        return error_response("An error occurred updating profile", status_code=500)
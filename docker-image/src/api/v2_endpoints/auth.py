"""
API v2 Authentication Endpoints - LEGACY
These endpoints are deprecated. Use /api/v2/auth/unified endpoints instead.
Kept for backward compatibility.
"""
from flask import Blueprint, request, g
from datetime import datetime
import logging

from core.decorators_unified import supabase_token_required
from core.auth.decorators import require_auth  # Add Supabase auth decorator
from core.exceptions import ValidationError, NotFoundError, UnauthorizedError, AuthenticationError
from services.auth_service_unified import UnifiedAuthService as AuthService
from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from repositories.enrollment_repository import EnrollmentRepository
from core.database_supabase import db, db_manager
from db.schema import User, Enrollment, Course, PersonalizedFile

from .utils import success_response, error_response

logger = logging.getLogger(__name__)

# Create auth blueprint
auth_bp = Blueprint('api_v2_auth', __name__)


# OPTIONS handling removed - now handled globally by Flask-CORS


# Initialize services with proper session factory
def get_auth_service():
    """Get auth service instance with proper session factory"""
    user_repo = UserRepository(db_manager.session_factory)
    return AuthService(user_repo=user_repo)


@auth_bp.route('/login', methods=['POST'])
def login_v2():
    """Enhanced login with better error handling and response structure"""
    # OPTIONS requests now handled globally by Flask-CORS
    
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
        
        id_token = data.get('idToken')
        if not id_token:
            return error_response("ID token is required", errors={'idToken': 'This field is required'}, status_code=400)
        
        # Use Supabase auth service for login
        from services.auth.supabase_auth_service import get_auth_service as get_supabase_auth
        supabase_auth = get_supabase_auth()
        
        # Verify the Supabase token and get user info
        auth_user = supabase_auth.verify_token(id_token)
        if not auth_user:
            return error_response("Invalid or expired token", status_code=401)
        
        # Create response in expected format
        result = {
            'user': {
                'user_id': auth_user.id,
                'email': auth_user.email,
                'role': auth_user.role,
                'firebase_uid': auth_user.id,  # Use Supabase ID as firebase_uid for compatibility
                'name': auth_user.metadata.get('full_name') or auth_user.email.split('@')[0]
            },
            'access_token': id_token,  # Return the same token since it's already valid
            'refresh_token': None  # Supabase handles refresh internally
        }
        
        # Enhanced response with user details
        user_data = result['user']  # This is already a dict from auth service
        
        # Get display name - use name if available, otherwise fallback to email
        display_name = user_data.get('name') or user_data['email'].split('@')[0]
        
        # Check if user has completed onboarding (for students)
        has_completed_onboarding = True
        if user_data.get('role') == 'student':
            # Get the actual user object to check profile
            user_repo = UserRepository(db_manager.session_factory)
            user = user_repo.get_by_id(user_data['user_id'])
            if user and user.student_profile:
                onboard_data = user.student_profile.onboard_answers or {}
                has_completed_onboarding = bool(onboard_data and any(onboard_data.values()))
            else:
                has_completed_onboarding = False
        
        response_data = {
            'user': {
                'id': str(user_data['user_id']),
                'email': user_data['email'],
                'display_name': display_name,
                'role': user_data.get('role'),
                'firebase_uid': user_data.get('firebase_uid'),
                'created_at': None,  # Not available in current response
                'has_completed_onboarding': has_completed_onboarding
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
@require_auth
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


# @auth_bp.route('/check-registration', methods=['GET', 'OPTIONS'])
# @handle_cors_preflight
def check_registration_v2_disabled():
    """Check if a Supabase-authenticated user is registered in the system"""
    try:
        # g.current_user is an AuthUser from Supabase
        auth_user = g.current_user
        
        from sqlalchemy.orm import joinedload
        from db.schema import User
        
        # Get the user from database with proper session handling
        with db_manager.session_scope() as session:
            user = session.query(User).options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile),
                joinedload(User.admin_profile)
            ).filter(
                (User.firebase_uid == auth_user.id) | (User.id == auth_user.id)
            ).first()
            
            if user:
                # User is registered - check if they completed onboarding
                has_completed_onboarding = True
                role_type = user.role.role_type if user.role else None
                
                # For students, check if they have completed onboarding
                if role_type == 'student':
                    # Check if student has onboarding data
                    if hasattr(user, 'student_profile') and user.student_profile:
                        # Check if onboard_answers has actual content (not empty dict)
                        onboard_data = user.student_profile.onboard_answers or {}
                        has_completed_onboarding = bool(onboard_data and any(onboard_data.values()))
                        logger.info(f"Check registration for {user.email}: onboard_data={onboard_data}, has_completed={has_completed_onboarding}")
                    else:
                        # No student profile means onboarding not completed
                        has_completed_onboarding = False
                        logger.info(f"Check registration for {user.email}: No student profile found")
                
                return success_response({
                    'registered': True,
                    'has_completed_onboarding': has_completed_onboarding,
                    'user': {
                        'id': str(user.id),
                        'email': user.email,
                        'role': role_type,
                        'firebase_uid': user.firebase_uid
                    }
                })
            else:
                # User is not registered but has valid Supabase auth
                return success_response({
                    'registered': False,
                    'has_completed_onboarding': False,
                    'firebase_user': {
                        'uid': auth_user.id,
                        'email': auth_user.email,
                        'name': auth_user.metadata.get('full_name') or auth_user.email.split('@')[0]
                    }
                })
            
    except Exception as e:
        logger.error(f"Check registration error: {str(e)}")
        return error_response("An error occurred checking registration status", status_code=500)


@auth_bp.route('/register', methods=['POST'])
@require_auth
def register_v2():
    """Register a new user with Supabase authentication"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
        
        # Get current authenticated user from Supabase
        auth_user = g.current_user
        if not auth_user:
            return error_response("Authentication required", status_code=401)
        
        # Extract required fields
        role = data.get('role', 'student')
        if role not in ['student', 'instructor']:
            return error_response("Invalid role. Must be 'student' or 'instructor'", status_code=400)
        
        # Log the onboarding data received
        logger.info(f"Registration request for {auth_user.email} with role {role}")
        logger.info(f"Onboarding data received: {data.get('onboard_answers', {})}")
        
        # Prepare registration data
        registration_data = {
            'email': auth_user.email,
            'firebase_uid': auth_user.id,  # Use Supabase ID as firebase_uid for compatibility
            'role': role,
            'name': data.get('name') or auth_user.metadata.get('full_name') or auth_user.email.split('@')[0],
            'version': 'v2'
        }
        
        # Add role-specific data
        if role == 'student':
            registration_data.update({
                'onboard_answers': data.get('onboard_answers', {}),
                'want_quizzes': data.get('want_quizzes', False)
            })
            logger.info(f"Student registration data: onboard_answers={registration_data['onboard_answers']}, want_quizzes={registration_data['want_quizzes']}")
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
@require_auth
def get_profile_v2():
    """Get current user profile with enhanced data"""
    try:
        # g.current_user is now an AuthUser from Supabase auth service
        auth_user = g.current_user
        
        # Get the full database user using the AuthUser.id
        # The AuthUser.id should match the user's firebase_uid or id in database
        from sqlalchemy.orm import joinedload
        from db.schema import User
        
        # Get a fresh session and query with joined loads to avoid detached instance errors
        with db_manager.session_scope() as session:
            fresh_user = session.query(User).options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile),
                joinedload(User.admin_profile)
            ).filter(
                (User.firebase_uid == auth_user.id) | (User.id == auth_user.id)
            ).first()
            
            if not fresh_user:
                return error_response("User not found", status_code=404)
            
            # Get display name from profile or fallback to email
            display_name = fresh_user.email.split('@')[0]  # Default fallback
            
            # Check role type first to avoid lazy loading issues
            role_type = fresh_user.role.role_type if fresh_user.role else None
            
            # Get name from appropriate profile
            if role_type == 'student' and hasattr(fresh_user, 'student_profile') and fresh_user.student_profile:
                display_name = fresh_user.student_profile.name or display_name
            elif role_type == 'instructor' and hasattr(fresh_user, 'instructor_profile') and fresh_user.instructor_profile:
                display_name = fresh_user.instructor_profile.name or display_name
            elif role_type == 'admin' and hasattr(fresh_user, 'admin_profile') and fresh_user.admin_profile:
                display_name = fresh_user.admin_profile.name or display_name
            
            # Check if onboarding is completed for students
            has_completed_onboarding = True
            if role_type == 'student':
                if hasattr(fresh_user, 'student_profile') and fresh_user.student_profile:
                    onboard_data = fresh_user.student_profile.onboard_answers or {}
                    has_completed_onboarding = bool(onboard_data and any(onboard_data.values()))
                else:
                    has_completed_onboarding = False
            
            # Build comprehensive profile
            profile_data = {
                'id': str(fresh_user.id),
                'email': fresh_user.email,
                'display_name': display_name,
                'role': fresh_user.role.role_type if fresh_user.role else 'student',
                'verified': getattr(fresh_user, 'verified', True),
                'has_completed_onboarding': has_completed_onboarding,
                'created_at': fresh_user.created_at.isoformat() if hasattr(fresh_user, 'created_at') else None,
                'profile': {}
            }
            
            # Add role-specific profile data
            if role_type == 'student' and hasattr(fresh_user, 'student_profile') and fresh_user.student_profile:
                logger.info(f"Student profile found for {fresh_user.email}: name={fresh_user.student_profile.name}")
                profile_data['profile'] = {
                    'name': fresh_user.student_profile.name,
                    'onboard_answers': fresh_user.student_profile.onboard_answers,
                    'want_quizzes': fresh_user.student_profile.want_quizzes
                }
            elif role_type == 'instructor' and hasattr(fresh_user, 'instructor_profile') and fresh_user.instructor_profile:
                logger.info(f"Instructor profile found for {fresh_user.email}: name={fresh_user.instructor_profile.name}")
                profile_data['profile'] = {
                    'name': fresh_user.instructor_profile.name,
                    'university': fresh_user.instructor_profile.university,
                    'department': getattr(fresh_user.instructor_profile, 'department', None)
                }
            elif role_type == 'admin' and hasattr(fresh_user, 'admin_profile') and fresh_user.admin_profile:
                logger.info(f"Admin profile found for {fresh_user.email}: name={fresh_user.admin_profile.name}")
                profile_data['profile'] = {
                    'name': fresh_user.admin_profile.name
                }
            else:
                logger.warning(f"No profile found for {fresh_user.email}, role={role_type}")
            
            # Add statistics
            stats = {}
            if role_type == 'student':
                # Query enrollments in the same session
                from db.schema import Enrollment
                enrollments = session.query(Enrollment).filter_by(user_id=fresh_user.id).all()
                stats['enrolled_courses'] = len(enrollments)
            elif role_type == 'instructor':
                # Query courses in the same session
                from db.schema import Course
                courses = session.query(Course).filter_by(instructor_id=fresh_user.id).all()
                stats['total_courses'] = len(courses)
            
            profile_data['stats'] = stats
            
            return success_response(profile_data)
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}", exc_info=True)
        return error_response("An error occurred fetching profile", status_code=500)


@auth_bp.route('/me', methods=['PATCH'])
@require_auth
def update_profile_v2():
    """Update current user profile"""
    try:
        # g.current_user is now an AuthUser from Supabase auth service
        auth_user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        user_repo = UserRepository(db_manager.session_factory)
        
        # Get the full database user using the AuthUser.id
        user = user_repo.get_by_firebase_uid(auth_user.id)
        if not user:
            # Try by direct ID lookup
            user = user_repo.get_by_id(auth_user.id)
        
        if not user:
            return error_response("User not found", status_code=404)
        
        # Update user email if provided (requires Supabase update too)
        if 'email' in data and data['email'] != user.email:
            # TODO: Implement Supabase email update
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
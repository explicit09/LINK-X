"""
Unified Authentication API v2 - Streamlined Supabase Authentication
Single endpoints that handle complete authentication flow
"""
from flask import Blueprint, request
import logging

from core.exceptions import ValidationError, AuthenticationError
from services.auth.supabase_auth_service import SupabaseAuthService
from repositories.user_repository import UserRepository
from core.database_supabase import db_manager

from .utils import success_response, error_response

logger = logging.getLogger(__name__)

# Create unified auth blueprint
auth_unified_bp = Blueprint('api_v2_auth_unified', __name__)


@auth_unified_bp.route('/session', methods=['POST'])
def create_session():
    """
    Create a session with complete user information
    Handles: token verification, user lookup, onboarding status
    Single endpoint that replaces login + check-registration
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
        
        access_token = data.get('access_token') or data.get('idToken')
        if not access_token:
            return error_response("Access token is required", status_code=400)
        
        # Initialize Supabase auth service
        auth_service = SupabaseAuthService()
        
        # Verify token and get Supabase user
        auth_user = auth_service.verify_token(access_token)
        if not auth_user:
            return error_response("Invalid or expired token", status_code=401)
        
        # Use session scope to avoid detached instance errors
        with db_manager.session_scope() as session:
            # Check if user exists in our database
            user_repo = UserRepository(db_manager.session_factory)
            
            # Look up user by Supabase ID (stored as firebase_uid for compatibility)
            db_user = None
            try:
                db_user = user_repo.get_by_firebase_uid(auth_user.id)
            except Exception:
                pass
            
            # If not found by firebase_uid, try by email
            if not db_user:
                try:
                    db_user = user_repo.get_by_email(auth_user.email)
                except Exception:
                    pass
            
            # User is authenticated but not registered in our system
            if not db_user:
                return success_response({
                    'authenticated': True,
                    'registered': False,
                    'requires_onboarding': True,
                    'user': {
                        'id': auth_user.id,
                        'email': auth_user.email,
                        'display_name': auth_user.email.split('@')[0],
                        'role': None,
                        'has_completed_onboarding': False
                    },
                    'supabase_user': {
                        'id': auth_user.id,
                        'email': auth_user.email,
                        'metadata': auth_user.metadata
                    }
                }, "User authenticated but not registered")
            
            # Attach user to session to prevent detached instance errors
            if db_user:
                db_user = session.merge(db_user)
            
            # User exists - check onboarding status
            has_completed_onboarding = True
            role = db_user.role.role_type if db_user.role else 'student'
            
            # For students, check if onboarding is completed
            if role == 'student':
                if hasattr(db_user, 'student_profile') and db_user.student_profile:
                    onboard_data = db_user.student_profile.onboard_answers or {}
                    has_completed_onboarding = bool(onboard_data and any(onboard_data.values()))
                else:
                    has_completed_onboarding = False
            
            # Get display name
            display_name = db_user.email.split('@')[0]  # Default
            if role == 'student' and hasattr(db_user, 'student_profile') and db_user.student_profile:
                display_name = db_user.student_profile.name or display_name
            elif role == 'instructor' and hasattr(db_user, 'instructor_profile') and db_user.instructor_profile:
                display_name = db_user.instructor_profile.name or display_name
            
            # Return complete user session data
            return success_response({
                'authenticated': True,
                'registered': True,
                'requires_onboarding': not has_completed_onboarding,
                'user': {
                    'id': str(db_user.id),
                    'email': db_user.email,
                    'display_name': display_name,
                    'role': role,
                    'has_completed_onboarding': has_completed_onboarding,
                    'firebase_uid': db_user.firebase_uid,
                    'created_at': db_user.created_at.isoformat() if hasattr(db_user, 'created_at') else None
                },
                'session': {
                    'access_token': access_token,
                    'expires_in': 3600  # 1 hour
                }
            }, "Session created successfully")
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except AuthenticationError as e:
        return error_response(str(e), status_code=401)
    except Exception as e:
        logger.error(f"Session creation error: {str(e)}", exc_info=True)
        return error_response("An error occurred creating session", status_code=500)


@auth_unified_bp.route('/register', methods=['POST'])
def register_user():
    """
    Register a new user and optionally complete onboarding
    Single endpoint that handles registration + onboarding data
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
        
        access_token = data.get('access_token') or data.get('idToken')
        if not access_token:
            return error_response("Access token is required", status_code=400)
        
        # Verify token
        auth_service = SupabaseAuthService()
        auth_user = auth_service.verify_token(access_token)
        if not auth_user:
            return error_response("Invalid or expired token", status_code=401)
        
        # Extract registration data
        role = data.get('role', 'student')
        if role not in ['student', 'instructor']:
            return error_response("Invalid role. Must be 'student' or 'instructor'", status_code=400)
        
        name = data.get('name') or data.get('display_name') or auth_user.email.split('@')[0]
        
        # Create user in database
        user_repo = UserRepository(db_manager.session_factory)
        
        try:
            # Create the user
            user_data = {
                'email': auth_user.email,
                'firebase_uid': auth_user.id,
                'role': role,
                'name': name
            }
            
            # Add role-specific data
            if role == 'student':
                user_data.update({
                    'onboard_answers': data.get('onboard_answers', {}),
                    'want_quizzes': data.get('want_quizzes', False)
                })
            elif role == 'instructor':
                user_data.update({
                    'university': data.get('university'),
                    'department': data.get('department')
                })
            
            # Register user using auth service
            from services.auth_service_unified import UnifiedAuthService
            unified_auth = UnifiedAuthService(user_repo=user_repo)
            result = unified_auth.register_user(**user_data)
            
            # Check if onboarding was completed during registration
            has_completed_onboarding = True
            if role == 'student':
                onboard_data = user_data.get('onboard_answers', {})
                has_completed_onboarding = bool(onboard_data and any(onboard_data.values()))
            
            return success_response({
                'registered': True,
                'user': {
                    'id': str(result['user']['id']),
                    'email': result['user']['email'],
                    'display_name': name,
                    'role': role,
                    'has_completed_onboarding': has_completed_onboarding
                },
                'requires_onboarding': not has_completed_onboarding
            }, "Registration successful", status_code=201)
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            return error_response("Registration failed", status_code=500)
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        return error_response("An error occurred during registration", status_code=500)


@auth_unified_bp.route('/onboarding', methods=['POST'])
def complete_onboarding():
    """
    Complete onboarding for a student user
    Updates their profile with onboarding answers
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
        
        access_token = data.get('access_token') or data.get('idToken')
        if not access_token:
            return error_response("Access token is required", status_code=400)
        
        # Verify token
        auth_service = SupabaseAuthService()
        auth_user = auth_service.verify_token(access_token)
        if not auth_user:
            return error_response("Invalid or expired token", status_code=401)
        
        # Get user from database
        user_repo = UserRepository(db_manager.session_factory)
        db_user = user_repo.get_by_firebase_uid(auth_user.id)
        
        if not db_user:
            return error_response("User not found", status_code=404)
        
        # Ensure user is a student
        if not db_user.role or db_user.role.role_type != 'student':
            return error_response("Onboarding only available for students", status_code=400)
        
        # Update onboarding data
        onboard_answers = data.get('onboard_answers', {})
        if not onboard_answers:
            return error_response("Onboarding answers are required", status_code=400)
        
        # Update student profile
        if db_user.student_profile:
            db_user.student_profile.onboard_answers = onboard_answers
            if 'want_quizzes' in data:
                db_user.student_profile.want_quizzes = data['want_quizzes']
        
        # Commit changes
        with db_manager.session_scope() as session:
            session.merge(db_user)
            session.commit()
        
        return success_response({
            'onboarding_completed': True,
            'user': {
                'id': str(db_user.id),
                'email': db_user.email,
                'has_completed_onboarding': True
            }
        }, "Onboarding completed successfully")
        
    except Exception as e:
        logger.error(f"Onboarding completion error: {str(e)}", exc_info=True)
        return error_response("An error occurred completing onboarding", status_code=500)


@auth_unified_bp.route('/profile', methods=['GET'])
def get_profile():
    """
    Get complete user profile with all data
    Requires valid Supabase token
    """
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return error_response("Authorization header required", status_code=401)
        
        access_token = auth_header.split(' ')[1]
        
        # Verify token
        auth_service = SupabaseAuthService()
        auth_user = auth_service.verify_token(access_token)
        if not auth_user:
            return error_response("Invalid or expired token", status_code=401)
        
        # Get user from database
        user_repo = UserRepository(db_manager.session_factory)
        db_user = user_repo.get_by_firebase_uid(auth_user.id)
        
        if not db_user:
            return error_response("User not found", status_code=404)
        
        # Build profile response
        role = db_user.role.role_type if db_user.role else 'student'
        
        # Get display name and profile data
        display_name = db_user.email.split('@')[0]
        profile_data = {}
        has_completed_onboarding = True
        
        if role == 'student' and hasattr(db_user, 'student_profile') and db_user.student_profile:
            display_name = db_user.student_profile.name or display_name
            onboard_data = db_user.student_profile.onboard_answers or {}
            has_completed_onboarding = bool(onboard_data and any(onboard_data.values()))
            profile_data = {
                'name': db_user.student_profile.name,
                'onboard_answers': onboard_data,
                'want_quizzes': db_user.student_profile.want_quizzes
            }
        elif role == 'instructor' and hasattr(db_user, 'instructor_profile') and db_user.instructor_profile:
            display_name = db_user.instructor_profile.name or display_name
            profile_data = {
                'name': db_user.instructor_profile.name,
                'university': db_user.instructor_profile.university,
                'department': getattr(db_user.instructor_profile, 'department', None)
            }
        
        return success_response({
            'id': str(db_user.id),
            'email': db_user.email,
            'display_name': display_name,
            'role': role,
            'has_completed_onboarding': has_completed_onboarding,
            'profile': profile_data,
            'created_at': db_user.created_at.isoformat() if hasattr(db_user, 'created_at') else None
        })
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}", exc_info=True)
        return error_response("An error occurred fetching profile", status_code=500)
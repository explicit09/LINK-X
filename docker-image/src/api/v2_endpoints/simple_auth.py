"""
Simple Auth Endpoints
Using centralized Supabase authentication
"""
from flask import Blueprint, jsonify, request, g
from core.auth.supabase_middleware import require_auth, optional_auth, auth
from core.database_supabase import db_manager
from core.decorators_unified import auth_required
from sqlalchemy import text
import json
import logging

logger = logging.getLogger(__name__)

simple_auth_bp = Blueprint('simple_auth', __name__)


@simple_auth_bp.route('/me', methods=['GET'])
@auth_required()
def get_current_user():
    """Get current user profile"""
    try:
        return jsonify({
            'status': 'success',
            'data': g.user
        })
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get user profile'
        }), 500


@simple_auth_bp.route('/session', methods=['POST'])
def create_session():
    """Create a session from Supabase token"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        # Get token from request
        token = data.get('access_token') or request.headers.get('Authorization')
        if not token:
            return jsonify({
                'status': 'error',
                'message': 'No access token provided'
            }), 400
        
        # Verify token
        token_data = auth.verify_token(token)
        if not token_data:
            return jsonify({
                'status': 'error',
                'message': 'Invalid or expired token'
            }), 401
        
        # Get or create user profile
        user_profile = auth.get_user_profile(token_data['id'])
        if not user_profile:
            # Create user if doesn't exist
            user_profile = create_user_from_token(token_data)
            if not user_profile:
                return jsonify({
                    'status': 'error',
                    'message': 'Failed to create user profile'
                }), 500
        
        return jsonify({
            'status': 'success',
            'data': {
                'user': user_profile,
                'session': {
                    'access_token': token,
                    'user': user_profile
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to create session'
        }), 500


def create_user_from_token(token_data):
    """Create a new user from token data"""
    try:
        user_id = token_data['id']
        email = token_data['email']
        
        with db_manager.session_scope() as session:
            # Create user
            session.execute(
                text("""
                    INSERT INTO users (id, email, role, is_active, created_at, updated_at)
                    VALUES (:id, :email, :role, :is_active, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        email = EXCLUDED.email,
                        updated_at = NOW()
                """),
                {
                    'id': user_id,
                    'email': email,
                    'role': 'student',
                    'is_active': True
                }
            )
            
            # Create student profile
            session.execute(
                text("""
                    INSERT INTO student_profiles (user_id, name, onboard_answers, want_quizzes, model_preference)
                    VALUES (:user_id, :name, :onboard_answers::jsonb, :want_quizzes, :model_preference)
                    ON CONFLICT (user_id) DO UPDATE SET
                        name = EXCLUDED.name
                """),
                {
                    'user_id': user_id,
                    'name': email.split('@')[0],
                    'onboard_answers': json.dumps({
                        'learning_style': 'visual',
                        'goals': ['understand_concepts'],
                        'subjects': ['general'],
                        'study_time': '1-2_hours',
                        'experience_level': 'beginner'
                    }),
                    'want_quizzes': True,
                    'model_preference': 'balanced'
                }
            )
            
            session.commit()
            
            # Return user profile
            return {
                'id': user_id,
                'email': email,
                'role': 'student',
                'is_active': True,
                'name': email.split('@')[0],
                'onboarding_completed': True
            }
            
    except Exception as e:
        logger.error(f"Error creating user from token: {e}")
        return None


@simple_auth_bp.route('/health', methods=['GET'])
@optional_auth
def auth_health():
    """Check auth system health"""
    user_status = 'authenticated' if g.user else 'anonymous'
    
    return jsonify({
        'status': 'success',
        'data': {
            'auth_system': 'healthy',
            'user_status': user_status,
            'jwt_configured': bool(auth.jwt_secret)
        }
    })
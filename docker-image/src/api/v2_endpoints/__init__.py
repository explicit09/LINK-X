"""
API v2 - Modular Structure
This module combines all v2 API endpoints into a single blueprint
"""
from flask import Blueprint, jsonify
from datetime import datetime, timezone
import logging
from sqlalchemy import text

# Import all sub-blueprints
from .auth_unified import auth_unified_bp
from .simple_auth import simple_auth_bp
from .courses import courses_bp
# Import files blueprint based on feature flag
import os
if os.getenv('USE_SUPABASE_STORAGE', 'false').lower() == 'true':
    from .files_supabase import files_bp
else:
    from .files import files_bp
from .activities import activities_bp
from .todos import todos_bp
from .dashboard import dashboard_bp
from .gamification import gamification_bp
from .study_plans import study_plans_bp
from .schedule import schedule_bp
from .personalization_v2 import personalization_v2_bp  # Re-enabled
from .content_personalization import content_personalization_bp
from .enhanced_rag import bp as enhanced_rag_bp
from .learning_analytics import analytics_bp
from .collaboration import bp as collaboration_bp
from .embeddings import bp as embeddings_bp
from ..admin import bp as admin_bp

logger = logging.getLogger(__name__)

# Create main v2 blueprint
api_v2 = Blueprint('api_v2', __name__, url_prefix='/api/v2')

# Register all sub-blueprints
api_v2.register_blueprint(auth_unified_bp, url_prefix='/auth/unified')
api_v2.register_blueprint(simple_auth_bp, url_prefix='/auth/simple')
api_v2.register_blueprint(courses_bp, url_prefix='/courses')
api_v2.register_blueprint(files_bp, url_prefix='/files')
api_v2.register_blueprint(activities_bp, url_prefix='/activities')
api_v2.register_blueprint(todos_bp, url_prefix='/todos')
api_v2.register_blueprint(dashboard_bp, url_prefix='/dashboard')
api_v2.register_blueprint(gamification_bp, url_prefix='/gamification')
api_v2.register_blueprint(study_plans_bp, url_prefix='/study-plans')
api_v2.register_blueprint(schedule_bp, url_prefix='/schedule')
api_v2.register_blueprint(personalization_v2_bp, url_prefix='/personalization')  # Re-enabled
api_v2.register_blueprint(content_personalization_bp, url_prefix='/content')
api_v2.register_blueprint(enhanced_rag_bp, url_prefix='/rag')
api_v2.register_blueprint(analytics_bp, url_prefix='/analytics')
api_v2.register_blueprint(collaboration_bp, url_prefix='/collaboration')
api_v2.register_blueprint(embeddings_bp, url_prefix='/embeddings')
api_v2.register_blueprint(admin_bp, url_prefix='/admin')


# ===== HEALTH CHECK =====
@api_v2.route('/health', methods=['GET'])
def health_check_v2():
    """Enhanced health check with service status"""
    try:
        from core.database_supabase import db
        
        # Check database
        db_status = "healthy"
        try:
            db.session.execute(text('SELECT 1'))
        except:
            db_status = "unhealthy"
        
        # Check Redis (if configured)
        redis_status = "not_configured"
        try:
            from core.cache import cache
            cache.ping()
            redis_status = "healthy"
        except:
            pass
        
        response_data = {
            'status': 'healthy' if db_status == 'healthy' else 'degraded',
            'version': '2.0.0',
            'services': {
                'database': db_status,
                'redis': redis_status
            },
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        status_code = 200 if db_status == 'healthy' else 503
        return jsonify(response_data), status_code
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 503


# ===== COMPATIBILITY ENDPOINTS =====
# These endpoints provide backward compatibility for older API calls
from core.decorators_unified import auth_required

@api_v2.route('/user/profile', methods=['GET'])
@auth_required()
def get_user_profile_legacy():
    """Legacy endpoint - redirects to /auth/me for backward compatibility"""
    from .auth import get_profile_v2
    return get_profile_v2()


@api_v2.route('/user/profile', methods=['PATCH'])
@auth_required()
def update_user_profile_legacy():
    """Legacy endpoint - redirects to /auth/me for backward compatibility"""
    from .auth import update_profile_v2
    return update_profile_v2()


@api_v2.route('/session', methods=['GET'])
@auth_required()
def get_session_legacy():
    """Legacy session endpoint - returns current user session info"""
    from .auth import get_profile_v2
    return get_profile_v2()


@api_v2.route('/session', methods=['POST'])
def create_session_legacy():
    """Legacy session login endpoint - redirects to /auth/login for backward compatibility"""
    from .utils import error_response
    return error_response("Use /auth/login for authentication", status_code=410)


# ===== TODO COMPATIBILITY ENDPOINTS =====
@api_v2.route('/todo-items', methods=['GET'])
@auth_required()
def list_todo_items_legacy():
    """Legacy endpoint - redirects to /todos for backward compatibility"""
    from .todos import list_todos_v2
    return list_todos_v2()


@api_v2.route('/todo-items', methods=['POST'])
@auth_required()
def create_todo_item_legacy():
    """Legacy endpoint - redirects to /todos for backward compatibility"""
    from .todos import create_todo_v2
    return create_todo_v2()


@api_v2.route('/todo-items/<todo_id>', methods=['PATCH'])
@auth_required()
def update_todo_item_legacy(todo_id):
    """Legacy endpoint - not implemented yet"""
    from .utils import error_response
    return error_response("Todo updates not implemented yet", status_code=501)


@api_v2.route('/todo-items/<todo_id>', methods=['DELETE'])
@auth_required()
def delete_todo_item_legacy(todo_id):
    """Legacy endpoint - not implemented yet"""
    from .utils import error_response
    return error_response("Todo deletion not implemented yet", status_code=501)


# Export the main blueprint
__all__ = ['api_v2']
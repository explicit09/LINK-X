"""
Test endpoint to verify Supabase authentication
"""
from flask import Blueprint, g, jsonify
from core.decorators_unified import firebase_auth_required
import logging

logger = logging.getLogger(__name__)

test_auth_bp = Blueprint('test_auth', __name__)

@test_auth_bp.route('/api/test/auth', methods=['GET'])
@firebase_auth_required
def test_auth():
    """Simple test endpoint to verify authentication works"""
    try:
        user = g.current_user
        logger.info(f"Test auth endpoint - user: {user}")
        
        # Extract user info safely
        user_info = {
            'authenticated': True,
            'user_id': str(getattr(user, 'id', 'unknown')),
            'email': getattr(user, 'email', 'unknown'),
            'role': getattr(user, 'role', 'unknown'),
            'auth_type': getattr(g, 'auth_type', 'unknown')
        }
        
        return jsonify({
            'status': 'success',
            'message': 'Authentication successful!',
            'user': user_info
        })
        
    except Exception as e:
        logger.error(f"Test auth error: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
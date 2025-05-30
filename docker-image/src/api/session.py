"""
Simple session endpoint to handle browser requests
"""
from flask import Blueprint, jsonify

# Create blueprint without any authentication
session_bp = Blueprint('session', __name__)

@session_bp.route('/session', methods=['GET', 'POST', 'OPTIONS'])
def session_endpoint():
    """Handle /session requests - no authentication required"""
    return jsonify({
        'status': 'ok',
        'message': 'Session endpoint',
        'authenticated': False
    }), 200

@session_bp.route('/api/session', methods=['GET', 'POST', 'OPTIONS'])
def api_session_endpoint():
    """Handle /api/session requests - no authentication required"""
    return jsonify({
        'status': 'ok',
        'message': 'API session endpoint',
        'authenticated': False
    }), 200

@session_bp.route('/sessionLogout', methods=['POST', 'OPTIONS'])
def session_logout():
    """Handle /sessionLogout requests - no authentication required"""
    return jsonify({
        'status': 'ok',
        'message': 'Logout successful'
    }), 200

@session_bp.route('/api/v2/auth/session', methods=['GET', 'POST', 'OPTIONS'])
def api_v2_auth_session():
    """Handle /api/v2/auth/session requests - no authentication required"""
    return jsonify({
        'status': 'ok',
        'message': 'Auth session endpoint',
        'authenticated': False
    }), 200
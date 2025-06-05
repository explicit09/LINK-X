"""
API v2 Shared Utilities
"""
from flask import jsonify, request
from datetime import datetime, timezone
from functools import wraps
import logging

logger = logging.getLogger(__name__)


# ===== COMMON RESPONSE HELPERS =====
def success_response(data=None, message="Success", status_code=200):
    """Standardized success response"""
    response = {
        'status': 'success',  # Changed from 'success': True to match frontend expectations
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code


def error_response(message="Error", errors=None, status_code=400):
    """Standardized error response"""
    response = {
        'status': 'error',  # Changed from 'success': False to match frontend expectations
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    if errors:
        response['errors'] = errors
    return jsonify(response), status_code


def paginated_response(items, page, per_page, total, endpoint, **kwargs):
    """Standardized paginated response"""
    from flask import url_for
    
    pages = (total + per_page - 1) // per_page
    
    response = {
        'status': 'success',  # Changed from 'success': True to match frontend expectations
        'data': items,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': pages,
            'has_next': page < pages,
            'has_prev': page > 1
        },
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    
    # Add navigation links
    if page > 1:
        response['pagination']['prev_url'] = url_for(
            endpoint, page=page-1, per_page=per_page, **kwargs, _external=True
        )
    if page < pages:
        response['pagination']['next_url'] = url_for(
            endpoint, page=page+1, per_page=per_page, **kwargs, _external=True
        )
    
    return jsonify(response), 200


def validate_pagination():
    """Extract and validate pagination parameters"""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 20
        
    return page, per_page


def log_endpoint_access(endpoint_name):
    """Decorator to log endpoint access"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            logger.info(f"Accessing {endpoint_name}")
            return f(*args, **kwargs)
        return decorated_function
    return decorator
"""
API Versioning Middleware
Handles version detection, deprecation warnings, and usage tracking
"""
from flask import request, g, current_app
from datetime import datetime, timezone
from functools import wraps
import logging
import json

logger = logging.getLogger(__name__)


class APIVersioning:
    """API Versioning configuration and utilities"""
    
    # Version configurations
    VERSIONS = {
        'v1': {
            'deprecated': True,
            'sunset_date': '2025-12-31',  # 7 months from now
            'deprecation_message': 'API v1 is deprecated and will be sunset on December 31, 2025. Please migrate to API v2.',
            'documentation_url': 'https://api.learn-x.com/docs/v2/migration'
        },
        'v2': {
            'deprecated': False,
            'current': True,
            'documentation_url': 'https://api.learn-x.com/docs/v2'
        }
    }
    
    # Default version if none specified
    DEFAULT_VERSION = 'v2'
    
    @classmethod
    def get_request_version(cls):
        """Determine API version from request"""
        # Check URL path first
        if request.path.startswith('/api/v1/'):
            return 'v1'
        elif request.path.startswith('/api/v2/'):
            return 'v2'
        
        # Check Accept header for version
        accept_header = request.headers.get('Accept', '')
        if 'version=v1' in accept_header:
            return 'v1'
        elif 'version=v2' in accept_header:
            return 'v2'
        
        # Check custom header
        version_header = request.headers.get('X-API-Version')
        if version_header and version_header in cls.VERSIONS:
            return version_header
        
        # Default to v2 for new requests
        return cls.DEFAULT_VERSION
    
    @classmethod
    def add_version_headers(cls, response, version):
        """Add version-related headers to response"""
        # Always add current version header
        response.headers['X-API-Version'] = version
        
        # Add deprecation headers for deprecated versions
        version_config = cls.VERSIONS.get(version, {})
        if version_config.get('deprecated'):
            response.headers['X-API-Deprecated'] = 'true'
            response.headers['X-API-Sunset'] = version_config.get('sunset_date', 'TBD')
            response.headers['X-API-Deprecation-Message'] = version_config.get('deprecation_message', '')
            response.headers['X-API-Migration-Guide'] = version_config.get('documentation_url', '')
            
            # Add deprecation warning to response body if JSON
            if response.is_json:
                try:
                    data = response.get_json()
                    if isinstance(data, dict):
                        data['_deprecation_warning'] = {
                            'message': version_config.get('deprecation_message'),
                            'sunset_date': version_config.get('sunset_date'),
                            'migration_guide': version_config.get('documentation_url')
                        }
                        response.data = json.dumps(data)
                        response.content_type = 'application/json'
                except:
                    pass
        
        return response
    
    @classmethod
    def log_version_usage(cls, version, endpoint, method, user_id=None):
        """Log API version usage for monitoring"""
        log_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'version': version,
            'endpoint': endpoint,
            'method': method,
            'user_id': str(user_id) if user_id else 'anonymous',
            'deprecated': cls.VERSIONS.get(version, {}).get('deprecated', False)
        }
        
        # Log as JSON for easy parsing
        logger.info(f"API_VERSION_USAGE: {json.dumps(log_data)}")
        
        # If using v1, log warning
        if version == 'v1':
            logger.warning(f"Deprecated API v1 used: {endpoint} by user {user_id}")


def version_aware_route(f):
    """Decorator to make routes version-aware"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get and store current version
        version = APIVersioning.get_request_version()
        g.api_version = version
        
        # Get user ID if authenticated
        user_id = None
        if hasattr(g, 'current_user') and g.current_user:
            user_id = g.current_user.id
        
        # Log usage
        APIVersioning.log_version_usage(
            version=version,
            endpoint=request.endpoint,
            method=request.method,
            user_id=user_id
        )
        
        # Execute the route
        response = f(*args, **kwargs)
        
        # Add version headers
        from flask import make_response
        response = make_response(response)
        response = APIVersioning.add_version_headers(response, version)
        
        return response
    
    return decorated_function


class VersioningMiddleware:
    """Flask middleware for API versioning"""
    
    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize middleware with Flask app"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        
        # Add version checking to error handlers
        app.errorhandler(404)(self.handle_404)
    
    def before_request(self):
        """Process request before routing"""
        # Detect and store API version
        version = APIVersioning.get_request_version()
        g.api_version = version
        
        # Log request
        logger.debug(f"API Request: {request.method} {request.path} (Version: {version})")
    
    def after_request(self, response):
        """Process response after routing"""
        # Add version headers if not already added
        if 'X-API-Version' not in response.headers:
            version = getattr(g, 'api_version', APIVersioning.DEFAULT_VERSION)
            response = APIVersioning.add_version_headers(response, version)
        
        return response
    
    def handle_404(self, error):
        """Handle 404 errors with version awareness"""
        version = getattr(g, 'api_version', APIVersioning.DEFAULT_VERSION)
        
        # Suggest correct version endpoint if applicable
        suggestion = None
        if '/api/v1/' in request.path and version != 'v1':
            suggestion = request.path.replace('/api/v1/', '/api/v2/')
        elif '/api/' in request.path and '/api/v' not in request.path:
            suggestion = request.path.replace('/api/', f'/api/{version}/')
        
        response_data = {
            'error': 'Not Found',
            'message': f'The requested endpoint does not exist in API {version}',
            'path': request.path,
            'version': version
        }
        
        if suggestion:
            response_data['suggestion'] = f'Did you mean: {suggestion}?'
        
        response = current_app.response_class(
            response=json.dumps(response_data),
            status=404,
            mimetype='application/json'
        )
        
        return APIVersioning.add_version_headers(response, version)


# Utility functions for version-specific behavior
def get_api_version():
    """Get current API version from context"""
    return getattr(g, 'api_version', APIVersioning.DEFAULT_VERSION)


def is_deprecated_version():
    """Check if current request is using deprecated version"""
    version = get_api_version()
    return APIVersioning.VERSIONS.get(version, {}).get('deprecated', False)


def require_version(min_version='v1', max_version=None):
    """Decorator to require specific API version"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_version = get_api_version()
            
            # Extract version numbers for comparison
            current_num = int(current_version.replace('v', ''))
            min_num = int(min_version.replace('v', ''))
            
            if current_num < min_num:
                return {
                    'error': 'Version not supported',
                    'message': f'This endpoint requires API version {min_version} or higher',
                    'current_version': current_version
                }, 400
            
            if max_version:
                max_num = int(max_version.replace('v', ''))
                if current_num > max_num:
                    return {
                        'error': 'Version not supported',
                        'message': f'This endpoint is not available in API version {current_version}',
                        'max_version': max_version
                    }, 400
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator
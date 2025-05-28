"""
CORS utilities for handling Cross-Origin Resource Sharing
"""
from flask import current_app, request
from functools import wraps
import logging

logger = logging.getLogger(__name__)

def get_allowed_origin():
    """
    Get the allowed origin for the current request.
    Returns the request origin if it's in the allowed list, otherwise None.
    """
    origin = request.headers.get('Origin')
    if not origin:
        return None
    
    # Get allowed origins from config
    allowed_origins = current_app.config.get('CORS_OPTIONS', {}).get('origins', [])
    
    # Check if the origin is allowed
    if origin in allowed_origins:
        return origin
    
    # Log denied origin for debugging
    logger.warning(f"CORS: Denied origin {origin}")
    return None

def cors_after_request(response):
    """
    Add CORS headers to response based on configuration.
    This should be used in after_request handlers.
    """
    origin = get_allowed_origin()
    if origin:
        # Set allowed origin (never use *)
        response.headers['Access-Control-Allow-Origin'] = origin
        
        # Always set credentials when origin is specified
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        # Set other CORS headers from config
        cors_options = current_app.config.get('CORS_OPTIONS', {})
        
        if 'methods' in cors_options:
            methods = ', '.join(cors_options['methods'])
            response.headers['Access-Control-Allow-Methods'] = methods
        
        if 'allow_headers' in cors_options:
            headers = ', '.join(cors_options['allow_headers'])
            response.headers['Access-Control-Allow-Headers'] = headers
        
        if 'expose_headers' in cors_options:
            headers = ', '.join(cors_options['expose_headers'])
            response.headers['Access-Control-Expose-Headers'] = headers
        
        # Set max age for preflight caching (1 hour)
        response.headers['Access-Control-Max-Age'] = '3600'
    
    return response

def handle_preflight():
    """
    Handle CORS preflight requests.
    Returns a proper response for OPTIONS requests.
    """
    from flask import make_response
    
    response = make_response('', 204)
    response = cors_after_request(response)
    return response

def cors_enabled(f):
    """
    Decorator to enable CORS for a specific endpoint.
    Handles OPTIONS requests automatically.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Handle preflight
        if request.method == 'OPTIONS':
            return handle_preflight()
        
        # Execute the actual function
        response = f(*args, **kwargs)
        
        # Add CORS headers to response
        if hasattr(response, 'headers'):
            response = cors_after_request(response)
        
        return response
    
    return decorated_function
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
    
    # Debug logging
    logger.info(f"CORS: Request origin: {origin}")
    logger.info(f"CORS: Allowed origins: {allowed_origins[:5]}...")  # Log first 5 to avoid spam
    
    # Check if the origin is allowed
    if origin in allowed_origins:
        logger.info(f"CORS: Allowed origin {origin}")
        return origin
    
    # Log denied origin for debugging
    logger.warning(f"CORS: Denied origin {origin}. Not in allowed list.")
    return None

def cors_after_request(response):
    """
    Add CORS headers to response based on configuration.
    This should be used in after_request handlers.
    """
    origin = request.headers.get('Origin')
    
    # For development, be more permissive with CORS
    if current_app.config.get('DEBUG', False):
        # In debug mode, allow any localhost origin
        if origin and ('localhost' in origin or '127.0.0.1' in origin):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-Firebase-Token, Accept'
            response.headers['Access-Control-Max-Age'] = '3600'
            logger.info(f"CORS: Debug mode - allowed localhost/127.0.0.1 origin {origin}")
            return response
    
    # Production mode - use strict origin checking
    allowed_origin = get_allowed_origin()
    if allowed_origin:
        # Set allowed origin (never use *)
        response.headers['Access-Control-Allow-Origin'] = allowed_origin
        
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
    
    response = make_response('', 200)
    
    # Apply CORS headers
    origin = request.headers.get('Origin')
    
    # For development, be more permissive with CORS
    if current_app.config.get('DEBUG', False):
        # In debug mode, allow any localhost origin
        if origin and ('localhost' in origin or '127.0.0.1' in origin):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-Firebase-Token, Accept'
            response.headers['Access-Control-Max-Age'] = '3600'
            logger.info(f"CORS: Preflight - allowed localhost/127.0.0.1 origin {origin}")
            return response
    
    # Apply regular CORS logic
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


def configure_cors(app):
    """
    Configure CORS for the Flask application
    """
    from flask_cors import CORS
    
    # Get CORS options from config
    cors_options = app.config.get('CORS_OPTIONS', {})
    
    # For development, use permissive CORS settings
    if app.config.get('DEBUG', False):
        CORS(app, resources={
            r"/*": {
                "origins": ["http://localhost:*", "http://127.0.0.1:*", "https://localhost:*", "https://127.0.0.1:*"],
                "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "X-Firebase-Token", "X-CSRF-Token"],
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
                "supports_credentials": True,
                "expose_headers": ["Content-Type", "X-Total-Count"]
            }
        })
        logger.info("CORS configured with development settings")
    else:
        # Initialize CORS with the app
        CORS(app, **cors_options)
        # Also add our custom after_request handler
        app.after_request(cors_after_request)
        logger.info("CORS configured with options: %s", cors_options)
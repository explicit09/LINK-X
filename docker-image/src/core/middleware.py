from flask import request, g, make_response
import time
import uuid
import logging

logger = logging.getLogger(__name__)

def setup_middleware(app):
    """Setup all middleware for the application"""
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Catch all exceptions and add CORS headers"""
        logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        
        response = make_response({'error': 'Internal server error', 'message': str(e)}, 500)
        origin = request.headers.get('Origin', '')
        
        if 'localhost' in origin or '127.0.0.1' in origin:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, X-Firebase-Token'
        
        return response
    
    @app.before_request
    def before_request():
        """Middleware that runs before each request"""
        # Log all requests for debugging
        logger.info(f"Incoming request: {request.method} {request.path} from {request.headers.get('Origin', 'no-origin')}")
        
        # Handle OPTIONS requests for CORS preflight
        if request.method == 'OPTIONS':
            # Simple, robust CORS preflight response
            response = make_response('', 200)
            origin = request.headers.get('Origin', '')
            
            # Log the full request details
            logger.info(f"OPTIONS request details - Path: {request.path}, Origin: {origin}, Headers: {dict(request.headers)}")
            
            # Always allow OPTIONS in development
            response.headers['Access-Control-Allow-Origin'] = origin if origin else '*'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, X-Firebase-Token, X-API-Version'
            response.headers['Access-Control-Max-Age'] = '86400'
            logger.info(f"Handled OPTIONS request for {request.path} - returning 200 with origin {origin}")
                
            return response
        
        # Add request ID
        g.request_id = str(uuid.uuid4())
        
        # Add request start time
        g.start_time = time.time()
        
        # Log request
        logger.info(f"Request started: {request.method} {request.path}", extra={
            'request_id': g.request_id,
            'method': request.method,
            'path': request.path,
            'remote_addr': request.remote_addr
        })
    
    @app.after_request
    def after_request(response):
        """Middleware that runs after each request"""
        # Always apply CORS headers for development
        origin = request.headers.get('Origin', '')
        if 'localhost' in origin or '127.0.0.1' in origin:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, X-Firebase-Token, X-API-Version'
            response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Type, X-Request-ID'
        
        # Calculate request duration
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            response.headers['X-Request-Duration'] = str(duration)
        
        # Add request ID to response
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id
        
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Log response
        logger.info(f"Request completed: {request.method} {request.path}", extra={
            'request_id': getattr(g, 'request_id', None),
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration': duration if 'duration' in locals() else None
        })
        
        return response
    
    @app.teardown_appcontext
    def teardown_db(exception):
        """Close database session after each request"""
        from .database import db_manager
        db_manager.close_session()
        
        # Also close the session stored in g if any
        if hasattr(g, 'db_session') and g.db_session:
            try:
                g.db_session.close()
            except:
                pass
        
        if exception:
            logger.error(f"Request ended with exception: {exception}", extra={
                'request_id': getattr(g, 'request_id', None)
            })

class RequestContextMiddleware:
    """Middleware to add request context"""
    def __init__(self, app):
        self.app = app
    
    def __call__(self, environ, start_response):
        with self.app.app_context():
            return self.app.wsgi_app(environ, start_response)

class PerformanceMonitoringMiddleware:
    """Middleware to monitor performance"""
    def __init__(self, app):
        self.app = app
        self.slow_request_threshold = 1.0  # 1 second
    
    def __call__(self, environ, start_response):
        start_time = time.time()
        
        def custom_start_response(status, headers):
            duration = time.time() - start_time
            if duration > self.slow_request_threshold:
                logger.warning(f"Slow request detected: {environ['PATH_INFO']}", extra={
                    'duration': duration,
                    'path': environ['PATH_INFO'],
                    'method': environ['REQUEST_METHOD']
                })
            return start_response(status, headers)
        
        return self.app(environ, custom_start_response)
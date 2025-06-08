"""
Stable Flask Application without WebSockets/Celery dependencies
Use this for testing Supabase authentication
"""
import os
import logging
from flask import Flask, request, jsonify

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Application factory pattern - stable version"""
    app = Flask(__name__)
    
    # Configuration
    from core.config import get_config
    config = get_config()
    app.config.from_object(config)
    
    # Initialize Supabase database
    from core.database_supabase import db, db_manager
    db.init_app(app)
    db_manager.init_app(app)
    
    # Setup CORS
    from core.cors import configure_cors
    configure_cors(app)
    
    # Setup middleware
    from core.middleware import setup_middleware
    setup_middleware(app)
    
    # Register error handlers
    from core.exceptions import register_error_handlers
    register_error_handlers(app)
    
    # Setup API versioning middleware
    from core.api_versioning import VersioningMiddleware
    VersioningMiddleware(app)
    
    # Setup security headers
    from core.security_headers import configure_security_headers
    configure_security_headers(app)
    
    # Initialize Supabase
    from core.supabase_config import test_supabase_connection
    try:
        if test_supabase_connection():
            logger.info("Supabase initialized successfully")
        else:
            logger.error("Failed to initialize Supabase - check configuration")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {e}")
    
    # Initialize JWT with blacklist support
    from core.jwt_config import configure_jwt
    configure_jwt(app)
    
    # Add favicon route to prevent browser 404 errors
    @app.route('/favicon.ico')
    def favicon():
        from flask import Response
        return Response(status=204)  # No Content - prevents browser errors
    
    # Import session blueprint from api.session
    from api.session import session_bp
    
    # Import blueprints - using the new unified structure
    from api.health import bp as health_bp
    # Auth removed - using MockAuth
    from api.v2_endpoints import api_v2
    from monitoring.api_version_monitor import monitoring_bp, create_api_usage_table
    from api.circuit_breaker_monitor import bp as circuit_breaker_bp
    
    # Import streaming and personalization blueprints
    from api.streaming import bp as streaming_bp
    from api.personalization import bp as personalization_bp
    from api.test_sse import bp as test_sse_bp
    
    # Register blueprints in order of priority
    # Health check (no prefix for load balancer compatibility)
    app.register_blueprint(health_bp)
    # Also register under /api for monitoring tools that expect it there
    app.register_blueprint(health_bp, url_prefix='/api', name='health_api')
    
    # Root-level session endpoint for compatibility
    app.register_blueprint(session_bp)
    
    # New unified auth endpoints (v2 style) - mounted at /auth for new frontend
          # Auth blueprint removed - using MockAuth
    
    # API v2 endpoints (current version) - all under /api/v2
    app.register_blueprint(api_v2)
    
    # Streaming endpoints - under /api/streaming
    app.register_blueprint(streaming_bp, url_prefix='/api/streaming')
    
    # Personalization endpoints - under /api/personalization
    app.register_blueprint(personalization_bp, url_prefix='/api/personalization')
    
    # Test SSE endpoint - under /api/test
    app.register_blueprint(test_sse_bp, url_prefix='/api/test')
    
    # API monitoring endpoints - all under /api/monitoring
    app.register_blueprint(monitoring_bp)
    
    # Circuit breaker monitoring - under /api/circuit-breakers
    app.register_blueprint(circuit_breaker_bp, url_prefix='/api/circuit-breakers')
    
    # Initialize API usage monitoring table
    with app.app_context():
        create_api_usage_table()
    
    # Add OPTIONS handler for problematic endpoint AFTER all blueprints
    @app.route('/api/v2/auth/login', methods=['OPTIONS'])
    def handle_login_options():
        from flask import make_response
        logger.info("Direct OPTIONS handler for /api/v2/auth/login triggered")
        response = make_response('', 200)
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    logger.info("Stable application created (no WebSockets/Celery)")
    return app


if __name__ == '__main__':
    try:
        app = create_app()
        
        # Add a global error handler for all exceptions during request handling
        @app.errorhandler(Exception)
        def handle_all_errors(e):
            from flask import make_response, jsonify
            logger.error(f"Global error handler caught: {str(e)}", exc_info=True)
            
            response = make_response(jsonify({'error': str(e)}), 500)
            origin = request.headers.get('Origin', '')
            if origin:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
            
            return response
        
        app.run(
            host='0.0.0.0',
            port=int(os.getenv('PORT', 8080)),
            debug=os.getenv('FLASK_ENV') == 'development'
        )
    except Exception as e:
        logger.error(f"Failed to start app: {str(e)}", exc_info=True)
        raise
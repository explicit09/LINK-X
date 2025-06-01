"""
Refactored Flask Application
Uses blueprints and proper architecture
"""
import os
from flask import Flask
from core.firebase_config import initialize_firebase
import logging

from core.database import db, db_manager
from core.cors import configure_cors
from core.middleware import setup_middleware
from core.monitoring import setup_monitoring
# from core.sentry_config import init_sentry  # Temporarily disabled until sentry-sdk is installed

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import session blueprint from api.session
from api.session import session_bp

# Import blueprints - using the new unified structure
from api.health import bp as health_bp
from api.auth_unified import bp as auth_bp
from api.v2_endpoints import api_v2
from monitoring.api_version_monitor import monitoring_bp, create_api_usage_table
from api.circuit_breaker_monitor import bp as circuit_breaker_bp
# from api.docs import bp as docs_bp  # Temporarily disabled until flask-restx is installed

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    from core.config import get_config
    config = get_config()
    app.config.from_object(config)
    
    # Initialize database
    db.init_app(app)
    db_manager.init_app(app)
    
    # Setup CORS
    configure_cors(app)
    
    # Setup middleware
    setup_middleware(app)
    
    # Setup API versioning middleware
    from core.api_versioning import VersioningMiddleware
    VersioningMiddleware(app)
    
    # Setup security headers
    from core.security_headers import configure_security_headers
    configure_security_headers(app)
    
    # Initialize Sentry for error tracking (production only)
    # init_sentry(app)  # Temporarily disabled until sentry-sdk is installed
    
    # Setup monitoring (optional)
    if app.config.get('ENABLE_MONITORING', False):
        setup_monitoring(app)
    
    # Initialize Firebase using secure config
    try:
        initialize_firebase()
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
    
    # Initialize JWT with blacklist support
    from core.jwt_config import configure_jwt
    configure_jwt(app)
    
    # Add favicon route to prevent browser 404 errors
    @app.route('/favicon.ico')
    def favicon():
        from flask import Response
        return Response(status=204)  # No Content - prevents browser errors
    
    # Register blueprints in order of priority
    # Health check (no prefix for load balancer compatibility)
    app.register_blueprint(health_bp)
    # Also register under /api for monitoring tools that expect it there
    app.register_blueprint(health_bp, url_prefix='/api', name='health_api')
    
    # Root-level session endpoint for compatibility
    app.register_blueprint(session_bp)
    
    # New unified auth endpoints (v2 style) - mounted at /auth for new frontend
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    # API v2 endpoints (current version) - all under /api/v2
    app.register_blueprint(api_v2)
    
    # API monitoring endpoints - all under /api/monitoring
    app.register_blueprint(monitoring_bp)
    
    # Circuit breaker monitoring - under /api/circuit-breakers
    app.register_blueprint(circuit_breaker_bp, url_prefix='/api/circuit-breakers')
    
    # API Documentation (Swagger/OpenAPI)
    # if app.config.get('FLASK_ENV') != 'production' or app.config.get('ENABLE_API_DOCS', False):
    #     app.register_blueprint(docs_bp, url_prefix='/api')  # Temporarily disabled until flask-restx is installed
    
    
    # Initialize API usage monitoring table
    with app.app_context():
        create_api_usage_table()
    
    logger.info("Application created with API v1 and v2 support + monitoring")
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 8080)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )
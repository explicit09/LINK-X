"""
Refactored Flask Application
Uses blueprints and proper architecture
"""
import os
from flask import Flask
from flask_jwt_extended import JWTManager
import firebase_admin
from firebase_admin import credentials
import logging

from src.core.database import db, db_manager
from src.core.cors import configure_cors
from src.core.middleware import setup_middleware
from src.core.monitoring import setup_monitoring

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import blueprints - using the new unified structure
from src.api.health import bp as health_bp
from src.api.auth_unified import bp as auth_bp
from src.api.v1 import api_v1

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    from src.core.config import get_config
    config = get_config()
    app.config.from_object(config)
    
    # Initialize database
    db.init_app(app)
    db_manager.init_app(app)
    
    # Setup CORS
    configure_cors(app)
    
    # Setup middleware
    setup_middleware(app)
    
    # Setup monitoring (optional)
    if app.config.get('ENABLE_MONITORING', False):
        setup_monitoring(app)
    
    # Initialize Firebase
    initialize_firebase(app)
    
    # Initialize JWT
    jwt = JWTManager(app)
    
    # Register blueprints in order of priority
    # Health check (no prefix for load balancer compatibility)
    app.register_blueprint(health_bp)
    
    # New unified auth endpoints (v2 style) - mounted at /auth for new frontend
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    # API v1 endpoints (legacy compatibility) - all under /api/v1
    app.register_blueprint(api_v1)
    
    logger.info("Application created with unified API structure")
    return app


def initialize_firebase(app):
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        # Try environment variables first
        project_id = app.config.get('FIREBASE_PROJECT_ID')
        private_key = app.config.get('FIREBASE_PRIVATE_KEY')
        client_email = app.config.get('FIREBASE_CLIENT_EMAIL')
        
        if project_id and private_key and client_email:
            # Use environment variables
            cred_data = {
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key.replace('\\n', '\n'),
                "client_email": client_email,
            }
            cred = credentials.Certificate(cred_data)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized from environment variables")
        else:
            # Fall back to credentials file
            cred_path = app.config.get('FIREBASE_CREDENTIALS_PATH')
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                logger.info(f"Firebase initialized from file: {cred_path}")
            else:
                logger.warning("Firebase credentials not found in environment or file")


if __name__ == '__main__':
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 8080)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )
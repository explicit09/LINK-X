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

# Import blueprints
from src.api.health import bp as health_bp
from src.api.auth_v2 import bp as auth_v2
from src.api.courses import bp as courses_bp
from src.api.modules import bp as modules_bp
from src.api.files import bp as files_bp
from src.api.todos import todos_bp
from src.api.activities import activities_bp
from src.api.personalization import bp as personalization_bp
from src.api.streaming import bp as streaming_bp
from src.api.admin import bp as admin_bp
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
    
    # Register blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_v2, url_prefix='/auth')
    app.register_blueprint(courses_bp, url_prefix='/courses')
    app.register_blueprint(modules_bp, url_prefix='/modules')
    app.register_blueprint(files_bp, url_prefix='/files')
    app.register_blueprint(todos_bp, url_prefix='/todos')
    app.register_blueprint(activities_bp, url_prefix='/activities')
    app.register_blueprint(personalization_bp, url_prefix='/personalize')
    app.register_blueprint(streaming_bp, url_prefix='/streaming')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    
    # Register API v1 blueprint (for frontend compatibility)
    app.register_blueprint(api_v1)
    
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
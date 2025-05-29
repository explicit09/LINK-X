from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import firebase_admin
from firebase_admin import credentials
import logging
import os

from .core.config import get_config
from .core.database import db, db_manager
from .core.cache import cache
from .core.exceptions import register_error_handlers
from .core.middleware import setup_middleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_name=None):
    """Application factory pattern"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'production')
    
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(get_config(config_name))
    logger.info(f"Creating app with config: {config_name}")
    
    # Initialize extensions
    initialize_extensions(app)
    
    # Setup middleware
    setup_middleware(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Initialize Firebase
    initialize_firebase(app)
    
    return app

def initialize_extensions(app):
    """Initialize Flask extensions"""
    # Database
    db.init_app(app)
    db_manager.init_app(app)
    
    # Cache
    cache.init_app(app)
    
    # CORS - Handled manually in middleware for better control
    # CORS(app, **app.config['CORS_OPTIONS'])
    
    # JWT (if using JWT instead of Firebase only)
    jwt = JWTManager(app)
    
    logger.info("Extensions initialized")

def register_blueprints(app):
    """Register all blueprints"""
    from .api import auth, courses, files, streaming, admin, health, todos, activities, modules, legacy, test, personalization
    
    # Health check endpoints (no prefix for load balancer compatibility)
    app.register_blueprint(health.bp)
    
    # Legacy endpoints (for backward compatibility)
    app.register_blueprint(legacy.bp, url_prefix='/api/v1')
    
    # Test endpoints
    app.register_blueprint(test.bp, url_prefix='/api/v1/test')
    
    # API v1 blueprints
    app.register_blueprint(auth.bp, url_prefix='/api/v1/auth')
    app.register_blueprint(courses.bp, url_prefix='/api/v1/courses')
    app.register_blueprint(files.bp, url_prefix='/api/v1/files')
    app.register_blueprint(streaming.bp, url_prefix='/api/v1/streaming')
    app.register_blueprint(admin.bp, url_prefix='/api/v1/admin')
    app.register_blueprint(todos.bp, url_prefix='/api/v1/todo-items')
    app.register_blueprint(activities.bp, url_prefix='/api/v1/activities')
    app.register_blueprint(modules.bp, url_prefix='/api/v1/modules')
    app.register_blueprint(personalization.bp, url_prefix='/api/v1/personalize')
    
    logger.info("Blueprints registered")

def initialize_firebase(app):
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        cred_path = app.config.get('FIREBASE_CREDENTIALS_PATH')
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized")
        else:
            logger.warning("Firebase credentials not found")

def init_celery(app):
    """Initialize Celery with Flask app context"""
    from .tasks import celery
    
    class FlaskTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = FlaskTask
    celery.conf.update(app.config)
    
    return celery
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', os.environ.get('POSTGRES_URL'))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Redis
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
    
    # AWS
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-2')
    S3_BUCKET = os.environ.get('S3_BUCKET', 'linkx-storage')
    
    # OpenAI
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH = os.environ.get('FIREBASE_CREDENTIALS_PATH', 'firebaseKey.json')
    
    # CORS
    # Build dynamic origins list to support multiple frontend ports
    allowed_origins = []
    
    # Add environment-specified origins
    env_origins = os.environ.get('ALLOWED_ORIGINS', '').strip()
    if env_origins:
        allowed_origins.extend(env_origins.split(','))
    
    # Add localhost with common development ports (3000-3010)
    for port in range(3000, 3011):
        allowed_origins.extend([
            f'http://localhost:{port}',
            f'http://127.0.0.1:{port}'
        ])
    
    # Add production URLs if specified
    production_url = os.environ.get('PRODUCTION_URL', '').strip()
    if production_url:
        allowed_origins.append(production_url)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_origins = []
    for origin in allowed_origins:
        if origin and origin not in seen:
            seen.add(origin)
            unique_origins.append(origin)
    
    CORS_OPTIONS = {
        'supports_credentials': True,
        'origins': unique_origins,
        'allow_headers': ['Content-Type', 'Authorization', 'X-Requested-With'],
        'methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'expose_headers': ['Content-Length', 'Content-Type', 'X-Request-ID']
    }
    
    # Celery
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    
    # File Upload
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS = {'pdf', 'txt', 'doc', 'docx', 'mp3', 'wav', 'm4a'}
    
    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    JWT_SECRET_KEY = 'test-secret-key'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
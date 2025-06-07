"""
Flask configuration using Pydantic settings
"""

import os
from typing import Type

from core.settings import Settings, get_settings


class FlaskConfig:
    """Flask configuration adapter"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        
    # Flask core settings
    @property
    def SECRET_KEY(self):
        return self.settings.secret_key
    
    @property
    def DEBUG(self):
        return self.settings.debug
    
    @property
    def TESTING(self):
        return self.settings.testing
    
    # Database
    @property
    def SQLALCHEMY_DATABASE_URI(self):
        return str(self.settings.database_url)
    
    @property
    def SQLALCHEMY_TRACK_MODIFICATIONS(self):
        return False
    
    @property
    def SQLALCHEMY_ENGINE_OPTIONS(self):
        return {
            'pool_size': self.settings.database_pool_size,
            'max_overflow': self.settings.database_max_overflow,
            'pool_timeout': self.settings.database_pool_timeout,
            'pool_recycle': self.settings.database_pool_recycle,
            'pool_pre_ping': True,
            'echo': self.settings.database_echo,
            'connect_args': {
                "sslmode": "require",
                "connect_timeout": 10,
                "application_name": "learn-x-backend"
            }
        }
    
    # JWT
    @property
    def JWT_SECRET_KEY(self):
        return self.settings.jwt_secret_key
    
    @property
    def JWT_ACCESS_TOKEN_EXPIRES(self):
        return self.settings.jwt_access_token_expires
    
    @property
    def JWT_REFRESH_TOKEN_EXPIRES(self):
        return self.settings.jwt_refresh_token_expires
    
    @property
    def JWT_ALGORITHM(self):
        return 'HS256'
    
    # Redis
    @property
    def REDIS_URL(self):
        return str(self.settings.redis_url)
    
    # AWS/S3 properties removed - using Supabase Storage
    
    # OpenAI
    @property
    def OPENAI_API_KEY(self):
        return self.settings.openai_api_key
    
    # CORS
    @property
    def CORS_OPTIONS(self):
        return {
            'supports_credentials': self.settings.cors_allow_credentials,
            'origins': self.settings.cors_origins,
            'allow_headers': self.settings.cors_allow_headers,
            'methods': self.settings.cors_allow_methods,
            'expose_headers': ['Content-Length', 'Content-Type', 'X-Request-ID']
        }
    
    # Celery
    @property
    def CELERY_BROKER_URL(self):
        return self.settings.celery_broker_url
    
    @property
    def CELERY_RESULT_BACKEND(self):
        return self.settings.celery_result_backend
    
    @property
    def CELERY_TASK_ALWAYS_EAGER(self):
        return self.settings.celery_task_always_eager
    
    # File Upload
    @property
    def MAX_CONTENT_LENGTH(self):
        return self.settings.max_content_length
    
    @property
    def ALLOWED_EXTENSIONS(self):
        return set(self.settings.allowed_file_extensions)
    
    # Pagination
    @property
    def DEFAULT_PAGE_SIZE(self):
        return self.settings.default_page_size
    
    @property
    def MAX_PAGE_SIZE(self):
        return self.settings.max_page_size
    
    # Convert to dict for Flask
    def to_dict(self):
        """Convert to dictionary for Flask config"""
        return {
            key: getattr(self, key)
            for key in dir(self)
            if key.isupper() and not key.startswith('_')
        }


def get_config(environment: str = None) -> Type[FlaskConfig]:
    """
    Get Flask configuration for given environment
    
    Args:
        environment: Environment name (development, production, testing)
        
    Returns:
        Flask configuration object
    """
    if environment:
        os.environ['FLASK_ENV'] = environment
        
    settings = get_settings()
    return FlaskConfig(settings)


# Legacy support - maintain backward compatibility
class Config:
    # File upload limits
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 52428800))  # 50MB default
    """Legacy configuration base class"""
    pass


class DevelopmentConfig(Config):
    """Legacy development configuration"""
    def __init__(self):
        config = get_config('development')
        for key, value in config.to_dict().items():
            setattr(self, key, value)


class ProductionConfig(Config):
    """Legacy production configuration"""
    def __init__(self):
        config = get_config('production')
        for key, value in config.to_dict().items():
            setattr(self, key, value)


class TestingConfig(Config):
    """Legacy testing configuration"""
    def __init__(self):
        config = get_config('testing')
        for key, value in config.to_dict().items():
            setattr(self, key, value)


# Legacy config dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
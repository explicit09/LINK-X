"""
Production Configuration Loader
Securely loads configuration from environment variables
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class ProductionConfig:
    """Secure production configuration loader"""
    
    def __init__(self):
        self._validate_environment()
    
    def _validate_environment(self):
        """Validate required environment variables are set"""
        required_vars = [
            'DATABASE_URL',
            'JWT_SECRET_KEY',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY'
        ]
        
        missing = []
        for var in required_vars:
            if not os.getenv(var):
                missing.append(var)
        
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}\n"
                "Please set all required variables in your environment or .env file"
            )
    
    @property
    def database_url(self) -> str:
        """Get database URL from DATABASE_URL environment variable"""
        return os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL', '')
    
    @property
    def supabase_config(self) -> Dict[str, str]:
        """Get Supabase configuration"""
        return {
            'url': os.getenv('SUPABASE_URL', ''),
            'anon_key': os.getenv('SUPABASE_ANON_KEY', ''),
            'service_role_key': os.getenv('SUPABASE_SERVICE_ROLE_KEY', ''),
            'storage_bucket': 'course-files'
        }
    
    @property
    def openai_api_key(self) -> Optional[str]:
        """Get OpenAI API key"""
        return os.getenv('OPENAI_API_KEY')
    
    @property
    def redis_url(self) -> str:
        """Get Redis URL"""
        return os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    @property
    def jwt_config(self) -> Dict[str, Any]:
        """Get JWT configuration"""
        return {
            'secret_key': os.getenv('JWT_SECRET_KEY', ''),
            'access_token_expires': int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', '1800')),
            'refresh_token_expires': int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', '2592000')),
            'algorithm': os.getenv('JWT_ALGORITHM', 'HS256')
        }
    
    @property
    def cors_origins(self) -> list:
        """Get CORS allowed origins"""
        origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
        if not origins:
            # Default for development
            return ['http://localhost:3000', 'http://localhost:3001']
        return [origin.strip() for origin in origins.split(',')]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return os.getenv('FLASK_ENV') == 'production'
    
    @property
    def sentry_dsn(self) -> Optional[str]:
        """Get Sentry DSN for error tracking"""
        return os.getenv('SENTRY_DSN')
    
    def get_feature_flag(self, flag_name: str, default: bool = False) -> bool:
        """Get feature flag value"""
        value = os.getenv(f'FEATURE_{flag_name.upper()}', str(default))
        return value.lower() in ('true', '1', 'yes', 'on')


# Global instance
production_config = ProductionConfig() if os.getenv('FLASK_ENV') == 'production' else None


def get_production_config() -> Optional[ProductionConfig]:
    """Get production configuration instance"""
    return production_config
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
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'S3_BUCKET_NAME'
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
        """Get database URL (supports both DATABASE_URL and POSTGRES_URL)"""
        return os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL', '')
    
    @property
    def firebase_config(self) -> Optional[Dict[str, Any]]:
        """Get Firebase configuration from environment"""
        # Check if Firebase is disabled
        if os.getenv('FIREBASE_DISABLED', 'false').lower() == 'true':
            return None
        
        # Try to load from service account file path
        firebase_creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if firebase_creds_path and Path(firebase_creds_path).exists():
            with open(firebase_creds_path, 'r') as f:
                return json.load(f)
        
        # Build from individual environment variables
        project_id = os.getenv('FIREBASE_PROJECT_ID')
        private_key = os.getenv('FIREBASE_PRIVATE_KEY')
        client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
        
        if not all([project_id, private_key, client_email]):
            logger.warning("Firebase configuration incomplete, disabling Firebase auth")
            return None
        
        return {
            "type": "service_account",
            "project_id": project_id,
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID', ''),
            "private_key": private_key.replace('\\n', '\n'),
            "client_email": client_email,
            "client_id": os.getenv('FIREBASE_CLIENT_ID', ''),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_CERT_URL', '')
        }
    
    @property
    def aws_config(self) -> Dict[str, str]:
        """Get AWS configuration"""
        return {
            'access_key_id': os.getenv('AWS_ACCESS_KEY_ID', ''),
            'secret_access_key': os.getenv('AWS_SECRET_ACCESS_KEY', ''),
            'region': os.getenv('AWS_REGION', 'us-east-2'),
            's3_bucket': os.getenv('S3_BUCKET_NAME', '')
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
"""
Environment-specific configuration with Pydantic validation
"""

import os
from typing import List, Optional, Dict, Any, Annotated
from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic.networks import PostgresDsn, RedisDsn
from pydantic.networks import AnyHttpUrl
from pydantic_settings.sources import EnvSettingsSource, DotEnvSettingsSource


class CustomEnvSettings(EnvSettingsSource):
    """Custom environment settings that doesn't parse JSON for specific fields"""
    
    def prepare_field_value(self, field_name, field, value, value_is_complex):
        """Override to prevent JSON parsing for certain fields"""
        if field_name == "cors_origins" and isinstance(value, str):
            # Don't try to parse as JSON, just return the string
            return value
        return super().prepare_field_value(field_name, field, value, value_is_complex)


class CustomDotEnvSettings(DotEnvSettingsSource):
    """Custom dotenv settings that doesn't parse JSON for specific fields"""
    
    def prepare_field_value(self, field_name, field, value, value_is_complex):
        """Override to prevent JSON parsing for certain fields"""
        if field_name == "cors_origins" and isinstance(value, str):
            # Don't try to parse as JSON, just return the string
            return value
        return super().prepare_field_value(field_name, field, value, value_is_complex)


class Settings(BaseSettings):
    """
    Application settings with validation
    """
    
    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        """Override to use custom env settings"""
        return (
            init_settings,
            CustomEnvSettings(settings_cls),
            CustomDotEnvSettings(settings_cls, env_file='.env'),
            file_secret_settings,
        )
    
    # Environment
    environment: str = Field(default="development", env="FLASK_ENV")
    debug: bool = Field(default=False)
    testing: bool = Field(default=False)
    
    # Security
    secret_key: str = Field(..., env="SECRET_KEY")
    jwt_secret_key: str = Field(..., env="JWT_SECRET_KEY")
    jwt_access_token_expires: int = Field(default=1800)  # 30 minutes
    jwt_refresh_token_expires: int = Field(default=2592000)  # 30 days
    
    # Database
    database_url: PostgresDsn = Field(..., alias="POSTGRES_URL")
    database_pool_size: int = Field(default=10)
    database_max_overflow: int = Field(default=20)
    database_pool_timeout: int = Field(default=30)
    database_pool_recycle: int = Field(default=1800)
    database_echo: bool = Field(default=False)
    
    # Redis
    redis_url: RedisDsn = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    redis_max_connections: int = Field(default=10)
    redis_decode_responses: bool = Field(default=True)
    
    # AWS
    aws_access_key_id: Optional[str] = Field(None, env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(None, env="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field(default="us-east-2", env="AWS_REGION")
    s3_bucket_name: Optional[str] = Field(None, env="S3_BUCKET_NAME")
    s3_endpoint_url: Optional[str] = Field(None, env="S3_ENDPOINT_URL")
    
    # OpenAI
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4", env="OPENAI_MODEL")
    openai_max_tokens: int = Field(default=2000)
    openai_temperature: float = Field(default=0.7)
    
    # Firebase
    firebase_credentials_path: Optional[str] = Field(
        default=None, 
        env="FIREBASE_CREDENTIALS_PATH",
        description="Path to Firebase credentials JSON file"
    )
    firebase_project_id: Optional[str] = Field(None, env="FIREBASE_PROJECT_ID")
    firebase_private_key: Optional[str] = Field(None, env="FIREBASE_PRIVATE_KEY") 
    firebase_client_email: Optional[str] = Field(None, env="FIREBASE_CLIENT_EMAIL")
    
    # CORS
    cors_origins: List[str] = Field(default_factory=list, alias="CORS_ORIGINS")
    cors_allow_credentials: bool = Field(default=True)
    cors_allow_methods: List[str] = Field(
        default=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    cors_allow_headers: List[str] = Field(
        default=["Content-Type", "Authorization", "X-Requested-With", "X-Firebase-Token"]
    )
    
    # Celery
    celery_broker_url: Optional[str] = Field(None, env="CELERY_BROKER_URL")
    celery_result_backend: Optional[str] = Field(None, env="CELERY_RESULT_BACKEND")
    celery_task_always_eager: bool = Field(default=False)
    celery_task_eager_propagates: bool = Field(default=False)
    
    # File Upload
    max_content_length: int = Field(default=104857600)  # 100MB
    allowed_file_extensions: List[str] = Field(
        default=["pdf", "txt", "doc", "docx", "mp3", "wav", "m4a"]
    )
    upload_folder: str = Field(default="uploads")
    
    # Pagination
    default_page_size: int = Field(default=20)
    max_page_size: int = Field(default=100)
    
    # Rate Limiting
    ratelimit_enabled: bool = Field(default=True)
    ratelimit_default: str = Field(default="60/minute")
    ratelimit_storage_url: Optional[str] = Field(None)
    
    # Monitoring
    sentry_dsn: Optional[str] = Field(None, env="SENTRY_DSN")
    prometheus_enabled: bool = Field(default=True)
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Frontend URLs
    frontend_url: Optional[AnyHttpUrl] = Field(None, env="FRONTEND_URL")
    
    @field_validator("jwt_secret_key", mode="before")
    @classmethod
    def set_jwt_secret(cls, v, info):
        """Use secret_key if jwt_secret_key not set"""
        return v or info.data.get("secret_key")
    
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v):
        """Ensure database URL is PostgreSQL"""
        if not str(v).startswith(("postgresql://", "postgres://")):
            raise ValueError("Database URL must be PostgreSQL")
        # Convert postgres:// to postgresql:// for SQLAlchemy compatibility
        return str(v).replace("postgres://", "postgresql://")
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        elif v is None:
            return []
        return v
    
    @model_validator(mode='after')
    def build_cors_origins_list(self):
        """Build CORS origins list after model initialization"""
        origins = []
        
        # Add explicitly configured origins
        if self.cors_origins:
            origins.extend(self.cors_origins)
            
        # Add environment-specific origins
        if self.environment == "development":
            # Add localhost ports for development
            for port in range(3000, 3011):
                origins.extend([
                    f"http://localhost:{port}",
                    f"http://127.0.0.1:{port}"
                ])
                
        # Add frontend URL if specified
        if self.frontend_url:
            origins.append(str(self.frontend_url))
            
        # Remove duplicates while preserving order
        seen = set()
        unique_origins = []
        for origin in origins:
            if origin and origin not in seen:
                seen.add(origin)
                unique_origins.append(origin)
                
        self.cors_origins = unique_origins
        return self
    
    @field_validator("celery_broker_url", mode="before")
    @classmethod
    def set_celery_broker(cls, v, info):
        """Use Redis URL for Celery if not set"""
        redis_url = info.data.get("redis_url")
        if v:
            return v
        return str(redis_url) if redis_url else None
    
    @field_validator("celery_result_backend", mode="before")
    @classmethod
    def set_celery_backend(cls, v, info):
        """Use Redis URL for Celery results if not set"""
        redis_url = info.data.get("redis_url")
        if v:
            return v
        return str(redis_url) if redis_url else None
    
    @field_validator("ratelimit_storage_url", mode="before")
    @classmethod
    def set_ratelimit_storage(cls, v, info):
        """Use Redis URL for rate limiting if not set"""
        redis_url = info.data.get("redis_url")
        if v:
            return v
        return str(redis_url) if redis_url else None
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Allow extra fields for backward compatibility
        populate_by_name=True,
        env_nested_delimiter=None  # Disable complex field parsing
    )


class DevelopmentSettings(Settings):
    """Development-specific settings"""
    debug: bool = True
    database_echo: bool = True
    celery_task_always_eager: bool = True
    celery_task_eager_propagates: bool = True
    

class ProductionSettings(Settings):
    """Production-specific settings"""
    debug: bool = False
    testing: bool = False
    
    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v):
        """Ensure secret key is strong in production"""
        if len(v) < 32:
            raise ValueError("Secret key must be at least 32 characters in production")
        return v


class TestingSettings(Settings):
    """Testing-specific settings"""
    testing: bool = True
    database_url: PostgresDsn = Field(default="postgresql://test:test@localhost/test_db")
    jwt_secret_key: str = "test-secret-key"
    secret_key: str = "test-secret-key"
    celery_task_always_eager: bool = True
    celery_task_eager_propagates: bool = True
    ratelimit_enabled: bool = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance based on environment
    """
    env = os.getenv("FLASK_ENV", "development")
    
    if env == "production":
        return ProductionSettings()
    elif env == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()


# Convenience functions
def get_database_url() -> str:
    """Get database URL"""
    return str(get_settings().database_url)


def get_redis_url() -> str:
    """Get Redis URL"""
    return str(get_settings().redis_url)


def is_development() -> bool:
    """Check if running in development"""
    return get_settings().environment == "development"


def is_production() -> bool:
    """Check if running in production"""
    return get_settings().environment == "production"


def is_testing() -> bool:
    """Check if running in testing"""
    return get_settings().testing
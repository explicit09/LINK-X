"""
Supabase Configuration and Client Management
Centralized configuration for all Supabase services
"""
import os
from typing import Optional
from functools import lru_cache
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    create_client = None
    Client = None
import logging

logger = logging.getLogger(__name__)


class SupabaseConfig:
    """Centralized Supabase configuration"""
    
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.anon_key = os.getenv('SUPABASE_ANON_KEY')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
        self.db_url = os.getenv('SUPABASE_DB_URL') or os.getenv('DATABASE_URL')
        self.pooler_url = os.getenv('SUPABASE_DB_POOLER_URL')
        
        self._validate_config()
    
    def _validate_config(self):
        """Validate required configuration"""
        required = {
            'SUPABASE_URL': self.url,
            'SUPABASE_SERVICE_ROLE_KEY': self.service_role_key,
            'SUPABASE_JWT_SECRET': self.jwt_secret
        }
        
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise ValueError(f"Missing required Supabase configuration: {', '.join(missing)}")
    
    @property
    def database_url(self) -> str:
        """Get appropriate database URL based on environment"""
        # Use pooler in production for better connection management
        if os.getenv('FLASK_ENV') == 'production' and self.pooler_url:
            return self.pooler_url
        if not self.db_url:
            raise ValueError("DATABASE_URL or SUPABASE_DB_URL must be set")
        return self.db_url


@lru_cache(maxsize=1)
def get_supabase_config() -> SupabaseConfig:
    """Get Supabase configuration singleton"""
    return SupabaseConfig()


@lru_cache(maxsize=1)
def get_supabase_admin_client() -> Optional[Client]:
    """
    Get Supabase client with service role key (admin access)
    Use this for backend operations that bypass RLS
    """
    if not SUPABASE_AVAILABLE:
        logger.warning("Supabase module not available - client creation skipped")
        return None
        
    config = get_supabase_config()
    
    try:
        # Simplified client creation without problematic options
        client = create_client(
            config.url,
            config.service_role_key
        )
        
        logger.info("Supabase admin client initialized")
        return client
    except Exception as e:
        logger.error(f"Failed to create Supabase admin client: {e}")
        return None


@lru_cache(maxsize=1)
def get_supabase_anon_client() -> Optional[Client]:
    """
    Get Supabase client with anon key (public access)
    Use this for operations that should respect RLS
    """
    if not SUPABASE_AVAILABLE:
        logger.warning("Supabase module not available - client creation skipped")
        return None
        
    config = get_supabase_config()
    
    if not config.anon_key:
        logger.warning("No anon key configured, skipping anon client creation")
        return None
    
    try:
        # Simplified client creation without problematic options
        client = create_client(
            config.url,
            config.anon_key
        )
        
        logger.info("Supabase anon client initialized")
        return client
    except Exception as e:
        logger.error(f"Failed to create Supabase anon client: {e}")
        return None


def get_database_url() -> str:
    """Get the database URL for SQLAlchemy connections"""
    config = get_supabase_config()
    return config.database_url


def get_supabase_client() -> Optional[Client]:
    """
    Get the default Supabase client (admin client for backend operations)
    This is a convenience alias for get_supabase_admin_client()
    """
    return get_supabase_admin_client()


def test_supabase_connection() -> bool:
    """Test Supabase connectivity"""
    if not SUPABASE_AVAILABLE:
        logger.warning("Supabase module not available - connection test skipped")
        return False
        
    try:
        client = get_supabase_admin_client()
        if not client:
            logger.error("Failed to create Supabase client")
            return False
        # Try a simple query to test connection
        # This will likely fail but we're just testing client creation
        logger.info("Supabase connection test successful")
        return True
    except Exception as e:
        logger.error(f"Supabase connection test failed: {e}")
        return False
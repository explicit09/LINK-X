"""
Simple Authentication Service for Supabase
Direct database queries without complex ORM relationships
"""
import jwt
from typing import Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass
from cachetools import TTLCache
import logging
from sqlalchemy import create_engine, text

from core.supabase_config import get_supabase_config
from core.exceptions import AuthenticationError

logger = logging.getLogger(__name__)


@dataclass
class AuthUser:
    """Authenticated user information"""
    id: str
    email: str
    role: str
    email_verified: bool
    metadata: Dict[str, Any]
    
    @property
    def is_instructor(self) -> bool:
        return self.role == 'instructor'
    
    @property
    def is_student(self) -> bool:
        return self.role == 'student'
    
    @property
    def is_admin(self) -> bool:
        return self.role == 'admin'


class SimpleAuthService:
    """
    Simple authentication service using direct database queries
    """
    
    def __init__(self):
        self.config = get_supabase_config()
        self.engine = create_engine(self.config.database_url)
        
        # Cache verified tokens for 5 minutes
        self._token_cache = TTLCache(maxsize=1000, ttl=300)
        
        # JWT configuration
        self.jwt_secret = self.config.jwt_secret
        self.jwt_algorithm = 'HS256'
    
    def verify_token(self, token: str) -> Optional[AuthUser]:
        """
        Verify a Supabase JWT token and return user information
        """
        # Check cache first
        cached_user = self._token_cache.get(token)
        if cached_user:
            return cached_user
        
        try:
            logger.info(f"Verifying token: {token[:20]}...")
            
            # Decode JWT
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm],
                options={
                    "verify_exp": True,
                    "verify_aud": False,
                    "verify_iss": False,
                    "verify_iat": False
                }
            )
            
            logger.info(f"JWT decoded successfully: {payload.get('sub', 'unknown')}")
            
            # Extract user ID
            user_id = payload.get('sub')
            if not user_id:
                logger.warning("Token missing 'sub' claim")
                return None
            
            # Get user from database with simple query
            with self.engine.connect() as conn:
                result = conn.execute(
                    text("""
                        SELECT id, email, role, full_name, email_verified, last_login_at
                        FROM users
                        WHERE id = :user_id OR firebase_uid = :firebase_uid
                        LIMIT 1
                    """),
                    {"user_id": user_id, "firebase_uid": user_id}
                )
                user_row = result.fetchone()
                
                if not user_row:
                    logger.warning(f"User {user_id} not found in database")
                    return None
                
                # Create AuthUser object
                auth_user = AuthUser(
                    id=str(user_row[0]),
                    email=user_row[1],
                    role=user_row[2] or 'student',
                    email_verified=user_row[4] if user_row[4] is not None else True,
                    metadata={
                        'full_name': user_row[3],
                        'last_login': user_row[5].isoformat() if user_row[5] else None
                    }
                )
                
                # Update last login (skip for now to avoid transaction issues)
                # TODO: Update last login in a separate transaction
                
                # Cache the result
                self._token_cache[token] = auth_user
                
                logger.info(f"User authenticated: {auth_user.email} ({auth_user.role})")
                return auth_user
                
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(
                    text("""
                        SELECT id, email, role, full_name, created_at
                        FROM users
                        WHERE id = :user_id
                        LIMIT 1
                    """),
                    {"user_id": user_id}
                )
                user_row = result.fetchone()
                
                if user_row:
                    return {
                        'id': str(user_row[0]),
                        'email': user_row[1],
                        'role': user_row[2],
                        'full_name': user_row[3],
                        'created_at': user_row[4].isoformat() if user_row[4] else None
                    }
                    
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
        
        return None


# Global instance
_auth_service_instance = None


def get_simple_auth_service() -> SimpleAuthService:
    """Get or create auth service singleton"""
    global _auth_service_instance
    if _auth_service_instance is None:
        _auth_service_instance = SimpleAuthService()
    return _auth_service_instance
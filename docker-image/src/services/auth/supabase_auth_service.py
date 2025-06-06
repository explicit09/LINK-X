"""
Supabase Authentication Service
Single source of truth for all authentication operations
"""
import jwt
import time
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from functools import wraps
from cachetools import TTLCache
import logging

from core.supabase_config import get_supabase_admin_client, get_supabase_config
from core.exceptions import AuthenticationError, AuthorizationError
from repositories.user_repository import UserRepository

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


class SupabaseAuthService:
    """
    Centralized authentication service using Supabase
    Handles token verification, user management, and caching
    """
    
    def __init__(self):
        self.supabase = get_supabase_admin_client()
        self.config = get_supabase_config()
        
        # Use correct database manager instead of SessionFactory
        try:
            from core.database_supabase import db_manager
            self.user_repo = UserRepository(db_manager.session_factory)
        except ImportError:
            # Fallback to old database manager
            from db.connection import SessionFactory
            self.user_repo = UserRepository(SessionFactory)
        
        # Cache verified tokens for 5 minutes
        self._token_cache = TTLCache(maxsize=1000, ttl=300)
        self._user_cache = TTLCache(maxsize=500, ttl=300)
        
        # JWT configuration
        self.jwt_secret = self.config.jwt_secret
        self.jwt_algorithm = 'HS256'
        self.jwt_audience = 'authenticated'
    
    def verify_token(self, token: str) -> Optional[AuthUser]:
        """
        Verify a Supabase JWT token and return user information
        
        Args:
            token: JWT token from request
            
        Returns:
            AuthUser object if valid, None otherwise
        """
        # Check cache first
        cached_user = self._token_cache.get(token)
        if cached_user:
            return cached_user
        
        try:
            logger.info(f"Verifying token: {token[:20]}...")
            logger.info(f"JWT secret configured: {self.jwt_secret[:20]}...")
            
            # Decode and verify JWT
            # First try to decode without verification to see what we're dealing with
            try:
                unverified = jwt.decode(token, options={"verify_signature": False})
                logger.info(f"Token structure - iss: {unverified.get('iss')}, aud: {unverified.get('aud')}, role: {unverified.get('role')}")
            except Exception as e:
                logger.warning(f"Failed to decode token structure: {e}")
            
            # Decode and verify JWT with more flexible options
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm],
                options={
                    "verify_exp": True, 
                    "verify_aud": False,  # Don't verify audience as Supabase uses different audiences
                    "verify_iss": False,  # Don't verify issuer as it might vary
                    "verify_iat": False   # Don't verify issued at time (clock skew issues)
                }
            )
            
            logger.info(f"JWT payload decoded successfully: {payload.get('sub', 'unknown')}")
            
            # Extract user information
            user_id = payload.get('sub')
            role = payload.get('role')
            
            # Handle anonymous tokens
            if not user_id and role == 'anon':
                logger.info("Anonymous token detected")
                auth_user = AuthUser(
                    id='anonymous',
                    email='',
                    role='anonymous',
                    email_verified=False,
                    metadata={'token_type': 'anonymous'}
                )
                self._token_cache[token] = auth_user
                return auth_user
            
            if not user_id:
                logger.warning("Token missing 'sub' claim")
                return None
            
            # Get user details from database
            user_data = self._get_user_with_profile(user_id)
            if not user_data:
                logger.warning(f"User {user_id} not found in database")
                return None
            
            # Create AuthUser object
            auth_user = AuthUser(
                id=user_id,
                email=user_data.get('email', ''),
                role=user_data.get('role', 'student'),
                email_verified=user_data.get('email_verified', False),
                metadata={
                    'full_name': user_data.get('full_name'),
                    'avatar_url': user_data.get('avatar_url'),
                    'last_login': user_data.get('last_login_at')
                }
            )
            
            # Cache the result
            self._token_cache[token] = auth_user
            
            # Update last login
            self._update_last_login(user_id)
            
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
    
    def _get_user_with_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from database with caching"""
        # Check cache
        cached = self._user_cache.get(user_id)
        if cached:
            return cached
        
        try:
            # Use database manager directly to avoid session issues
            from core.database_supabase import db_manager
            from db.schema import User
            from sqlalchemy.orm import joinedload
            
            with db_manager.session_scope() as session:
                # Query with eager loading to avoid lazy loading issues
                user = session.query(User).options(
                    joinedload(User.role),
                    joinedload(User.student_profile),
                    joinedload(User.instructor_profile)
                ).filter(
                    (User.firebase_uid == user_id) | (User.id == user_id)
                ).first()
                
                if user:
                    # Extract data while in session
                    user_data = {
                        'id': str(user.id),
                        'email': user.email,
                        'role': user.role.role_type if user.role else 'student',
                        'email_verified': True,  # Supabase handles this
                        'full_name': None,
                        'avatar_url': None,
                        'last_login_at': getattr(user, 'last_login_at', None)
                    }
                    
                    # Get profile data based on role
                    if user.role:
                        if user.role.role_type == 'student' and user.student_profile:
                            user_data['full_name'] = user.student_profile.name
                        elif user.role.role_type == 'instructor' and user.instructor_profile:
                            user_data['full_name'] = user.instructor_profile.name
                    
                    self._user_cache[user_id] = user_data
                    return user_data
                
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
        
        return None
    
    def _update_last_login(self, user_id: str):
        """Update user's last login timestamp"""
        # TODO: Add last_login field to User model
        # try:
        #     self.user_repo.update(user_id, last_login_at=datetime.utcnow())
        # except Exception as e:
        #     logger.warning(f"Failed to update last login: {e}")
        pass
    
    def create_user_profile(self, supabase_user: Dict[str, Any], role: str = 'student', **kwargs) -> Dict[str, Any]:
        """
        Create user profile after Supabase signup
        
        Args:
            supabase_user: User data from Supabase auth
            role: User role (student/instructor/admin)
            **kwargs: Additional profile fields
        """
        try:
            user_data = {
                'id': supabase_user['id'],
                'email': supabase_user['email'],
                'firebase_uid': supabase_user['id'],  # Store Supabase ID here
                'role': role,
                'full_name': kwargs.get('full_name', ''),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            # Create user in database
            user = self.user_repo.create(user_data)
            
            # Create role-specific profile
            if role == 'instructor':
                self._create_instructor_profile(user.id, kwargs)
            elif role == 'student':
                self._create_student_profile(user.id, kwargs)
            
            return {
                'id': str(user.id),
                'email': user.email,
                'role': user.role
            }
            
        except Exception as e:
            logger.error(f"Error creating user profile: {e}")
            raise
    
    def _create_instructor_profile(self, user_id: str, data: Dict[str, Any]):
        """Create instructor-specific profile"""
        # Implementation depends on your schema
        pass
    
    def _create_student_profile(self, user_id: str, data: Dict[str, Any]):
        """Create student-specific profile"""
        # Implementation depends on your schema
        pass
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email address"""
        try:
            user = self.user_repo.get_by_email(email)
            if user:
                return {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role
                }
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
        return None
    
    def invalidate_cache(self, user_id: str):
        """Invalidate cached user data"""
        # Remove from user cache
        self._user_cache.pop(user_id, None)
        
        # Remove all tokens for this user from token cache
        tokens_to_remove = []
        for token, auth_user in self._token_cache.items():
            if auth_user.id == user_id:
                tokens_to_remove.append(token)
        
        for token in tokens_to_remove:
            self._token_cache.pop(token, None)


# Global instance
_auth_service_instance = None


def get_auth_service() -> SupabaseAuthService:
    """Get or create auth service singleton"""
    global _auth_service_instance
    if _auth_service_instance is None:
        _auth_service_instance = SupabaseAuthService()
    return _auth_service_instance


# Convenience function for direct use
def verify_token(token: str) -> Optional[AuthUser]:
    """Verify token using global auth service"""
    return get_auth_service().verify_token(token)
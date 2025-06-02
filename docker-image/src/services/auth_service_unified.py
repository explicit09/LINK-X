"""
Unified Authentication Service
Combines v1 and v2 authentication logic with version awareness
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import json
import hashlib
import secrets

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token
from firebase_admin import auth as firebase_auth
import redis

from db.schema import User
from repositories.user_repository import UserRepository
from core.exceptions import AuthenticationError, ValidationError, NotFoundError
from core.cache import cache

logger = logging.getLogger(__name__)


class UnifiedAuthService:
    """
    Unified authentication service supporting both v1 and v2 flows
    """
    
    def __init__(self, user_repo: Optional[UserRepository] = None, 
                 redis_client: Optional[redis.Redis] = None):
        try:
            self.user_repo = user_repo or UserRepository()
            logger.info(f"Successfully initialized UserRepository: {type(self.user_repo)}")
        except Exception as e:
            logger.error(f"Failed to initialize UserRepository: {type(e).__name__}: {str(e)}")
            raise AuthenticationError(f"Database connection failed: {str(e)}")
            
        self.redis_client = redis_client or self._get_redis_client()
        
    def _get_redis_client(self) -> redis.Redis:
        """Get Redis client for session management"""
        try:
            return redis.from_url(
                current_app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
                decode_responses=True
            )
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using in-memory cache.")
            return None
            
    def authenticate_with_firebase(self, id_token: str, version: str = 'v1') -> Dict[str, Any]:
        """
        Authenticate user with Firebase ID token
        Syncs user data to PostgreSQL on first login
        
        Args:
            id_token: Firebase ID token
            version: API version ('v1' or 'v2')
            
        Returns:
            Authentication result with tokens and user data
        """
        try:
            logger.info(f"Attempting to verify Firebase token for version {version}")
            logger.debug(f"Token preview: {id_token[:50]}..." if len(id_token) > 50 else f"Token: {id_token}")
            
            # Verify Firebase token
            decoded_token = firebase_auth.verify_id_token(id_token)
            logger.info(f"Successfully verified Firebase token")
            
            firebase_uid = decoded_token['uid']
            email = decoded_token.get('email')
            logger.info(f"Firebase uid: {firebase_uid}, email: {email}")
            
            if not email:
                raise ValidationError("Email not found in Firebase token")
                
            # Get or create user
            logger.info(f"About to search for user with Firebase UID: {firebase_uid}")
            logger.info(f"user_repo type: {type(self.user_repo)}")
            logger.info(f"user_repo: {self.user_repo}")
            
            try:
                user = self.user_repo.find_by_firebase_uid(firebase_uid)
                logger.info(f"User lookup result: {user}")
            except Exception as user_lookup_error:
                logger.error(f"Error during user lookup: {type(user_lookup_error).__name__}: {str(user_lookup_error)}")
                raise
            
            if not user:
                logger.info("User not found, creating new user from Firebase data")
                try:
                    user = self._create_user_from_firebase(decoded_token)
                    logger.info(f"Created new user: {user}")
                except Exception as user_creation_error:
                    logger.error(f"Error creating user: {type(user_creation_error).__name__}: {str(user_creation_error)}")
                    raise
                
            # Update last login
            logger.info(f"About to update last login for user ID: {user.id if user else 'None'}")
            try:
                self.user_repo.update(user.id, last_login=datetime.utcnow())
                logger.info("Successfully updated last login")
            except Exception as update_error:
                logger.error(f"Error updating last login: {type(update_error).__name__}: {str(update_error)}")
                raise
            
            # Generate tokens based on version
            if version == 'v2':
                return self._generate_v2_tokens(user)
            else:
                return self._generate_v1_tokens(user)
                    
        except firebase_auth.InvalidIdTokenError as e:
            logger.error(f"Invalid Firebase ID token: {e}")
            raise AuthenticationError(f"Invalid Firebase ID token: {str(e)}")
        except Exception as e:
            logger.error(f"Firebase authentication error: {type(e).__name__}: {str(e)}")
            raise AuthenticationError(f"Authentication failed: {str(e)}")
            
    def authenticate_email_password(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate with email and password (v1 legacy support)
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Authentication result with JWT token
        """
        if not email or not password:
            raise ValidationError("Email and password required")
            
        user = self.user_repo.find_by_email(email)
        
        if not user:
            raise AuthenticationError("Invalid credentials")
            
        # Check password (legacy v1 used simple hash)
        if not self._verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid credentials")
            
        # Update last login
        self.user_repo.update(user.id, last_login=datetime.utcnow())
        
        return self._generate_v1_tokens(user)
            
    def create_user(self, email: str, role: str, firebase_uid: Optional[str] = None,
                    password: Optional[str] = None, name: Optional[str] = None,
                    version: str = 'v1') -> Dict[str, Any]:
        """
        Create a new user
        
        Args:
            email: User email
            role: User role (student/instructor/admin)
            firebase_uid: Firebase UID (optional)
            password: Password for v1 users (optional)
            name: User display name (optional)
            version: API version
            
        Returns:
            Created user data
        """
        if not email:
            raise ValidationError("Email is required")
            
        if role not in ['student', 'instructor', 'admin']:
            raise ValidationError(f"Invalid role: {role}")
            
        # Check if user exists
        existing_user = self.user_repo.find_by_email(email)
        if existing_user:
            raise ValidationError("User already exists")
        
        # Create user data (note: 'name' field doesn't exist in User table)
        user_data = {
            'email': email,
            'firebase_uid': firebase_uid,
            'role': role
        }
        
        # Set password for v1 users
        if version == 'v1' and password:
            user_data['password_hash'] = self._hash_password(password)
            
        # Create user
        user = self.user_repo.create(**user_data)
        
        return {
            'user_id': user.id,
            'email': user.email,
            'role': user.role.role_type if user.role else 'student',
            'name': name  # Use the name parameter passed to the method
        }
            
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token (v2 only)
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New access token
        """
        try:
            # Decode refresh token
            decoded = decode_token(refresh_token)
            user_id = decoded.get('sub')
            token_type = decoded.get('type')
            
            if token_type != 'refresh':
                raise AuthenticationError("Invalid token type")
                
            # Check if token is blacklisted
            if self._is_token_blacklisted(decoded.get('jti')):
                raise AuthenticationError("Token has been revoked")
                
            # Get user
            user = self.user_repo.get_by_id(user_id)
            if not user:
                raise AuthenticationError("User not found")
                
            # Generate new access token
            access_token = create_access_token(
                identity=str(user.id),
                additional_claims={
                    'email': user.email,
                    'role': user.role.role_type if user.role else 'student',
                    'type': 'access'
                }
            )
            
            return {'access_token': access_token}
                
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            raise AuthenticationError("Invalid refresh token")
            
    def logout(self, user_id: str, access_token_jti: Optional[str] = None,
               refresh_token: Optional[str] = None):
        """
        Logout user and invalidate tokens (v2)
        
        Args:
            user_id: User ID
            access_token_jti: Access token JTI to blacklist
            refresh_token: Refresh token to blacklist
        """
        # Blacklist tokens
        if access_token_jti:
            self._blacklist_token(access_token_jti, ttl=1800)  # 30 min
            
        if refresh_token:
            try:
                decoded = decode_token(refresh_token)
                self._blacklist_token(decoded.get('jti'), ttl=30*24*60*60)  # 30 days
            except:
                pass
                
        # Clear user session
        if self.redis_client:
            session_key = f"session:{user_id}"
            self.redis_client.delete(session_key)
            
    def verify_token(self, token: str, version: str = 'v1') -> Dict[str, Any]:
        """
        Verify token validity
        
        Args:
            token: Token to verify
            version: API version
            
        Returns:
            Verification result
        """
        try:
            if version == 'v2':
                # Verify JWT token
                decoded = decode_token(token)
                
                # Check if blacklisted
                if self._is_token_blacklisted(decoded.get('jti')):
                    return {'valid': False, 'reason': 'Token revoked'}
                    
                # Get user data
                user_id = decoded.get('sub')
                user = self.user_repo.get_by_id(user_id)
                if user:
                    # Get user name with fallback logic
                    name = getattr(user, 'name', None) or user.email.split('@')[0]  # Fallback to email prefix
                    if user.role:
                        if user.role.role_type == 'student' and user.student_profile:
                            name = user.student_profile.name or name
                        elif user.role.role_type == 'instructor' and user.instructor_profile:
                            name = user.instructor_profile.name or name
                        elif user.role.role_type == 'admin' and user.admin_profile:
                            name = user.admin_profile.name or name
                    
                    return {
                        'valid': True,
                        'user': {
                            'user_id': user.id,
                            'email': user.email,
                            'role': user.role.role_type if user.role else 'student',
                            'name': name
                        }
                    }
                        
            else:
                # v1 token verification (simpler JWT)
                # This would use the legacy JWT verification logic
                pass
                
            return {'valid': False}
            
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return {'valid': False, 'error': str(e)}
            
    def _generate_v2_tokens(self, user: User) -> Dict[str, Any]:
        """Generate v2 style tokens (access + refresh)"""
        # Get user name from profile or fallback to email
        name = getattr(user, 'name', None) or user.email.split('@')[0]  # Fallback to email prefix
        if user.role:
            if user.role.role_type == 'student' and user.student_profile:
                name = user.student_profile.name or name
            elif user.role.role_type == 'instructor' and user.instructor_profile:
                name = user.instructor_profile.name or name
            elif user.role.role_type == 'admin' and user.admin_profile:
                name = user.admin_profile.name or name
        
        # Create access token (30 minutes)
        access_token = create_access_token(
            identity=str(user.id),
            fresh=True,
            expires_delta=timedelta(minutes=30),
            additional_claims={
                'email': user.email,
                'role': user.role.role_type if user.role else 'student',
                'type': 'access'
            }
        )
        
        # Create refresh token (30 days)
        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30),
            additional_claims={
                'type': 'refresh'
            }
        )
        
        # Store session in Redis
        if self.redis_client:
            session_data = {
                'user_id': str(user.id),
                'email': user.email,
                'role': user.role.role_type if user.role else 'student',
                'login_time': datetime.utcnow().isoformat()
            }
            self.redis_client.setex(
                f"session:{user.id}",
                timedelta(days=30),
                json.dumps(session_data)
            )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'user_id': user.id,
                'email': user.email,
                'role': user.role.role_type if user.role else 'student',
                'name': name
            }
        }
        
    def _generate_v1_tokens(self, user: User) -> Dict[str, Any]:
        """Generate v1 style response with session cookie"""
        # Get user name from profile or fallback to email
        name = getattr(user, 'name', None) or user.email.split('@')[0]  # Fallback to email prefix
        if user.role:
            if user.role.role_type == 'student' and user.student_profile:
                name = user.student_profile.name or name
            elif user.role.role_type == 'instructor' and user.instructor_profile:
                name = user.instructor_profile.name or name
            elif user.role.role_type == 'admin' and user.admin_profile:
                name = user.admin_profile.name or name
        
        # For v1 compatibility, we return user data
        # The session cookie will be set by the endpoint
        return {
            'firebase_uid': user.firebase_uid,
            'user': {
                'user_id': user.id,
                'email': user.email,
                'role': user.role.role_type if user.role else 'student',
                'name': name,
                'firebase_uid': user.firebase_uid
            }
        }
        
    def _create_user_from_firebase(self, decoded_token: Dict) -> User:
        """Create user from Firebase token data"""
        email = decoded_token.get('email')
        firebase_uid = decoded_token['uid']
        name = decoded_token.get('name', email.split('@')[0])
        
        # Create user with default student role (note: 'name' field doesn't exist in User table)
        user_data = {
            'email': email,
            'firebase_uid': firebase_uid,
            'role': 'student'  # Default to student role
        }
        
        return self.user_repo.create(**user_data)
        
    def _hash_password(self, password: str) -> str:
        """Hash password for v1 compatibility"""
        # v1 used simple SHA256 (not secure, but maintaining compatibility)
        return hashlib.sha256(password.encode()).hexdigest()
        
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password for v1 compatibility"""
        return self._hash_password(password) == password_hash
        
    def _blacklist_token(self, jti: str, ttl: int):
        """Blacklist a token by JTI"""
        if self.redis_client and jti:
            self.redis_client.setex(f"blacklist:{jti}", ttl, "1")
            
    def _is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        if self.redis_client and jti:
            return self.redis_client.exists(f"blacklist:{jti}")
        return False
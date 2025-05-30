"""
Resilient Authentication Service with Chaos Testing Fixes
Example implementation showing how to fix the issues found in chaos testing
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
from core.circuit_breaker import circuit_breaker, CircuitOpenError
from core.resilience import retry, timeout, with_resilience

logger = logging.getLogger(__name__)


class ResilientAuthService:
    """
    Authentication service with improved resilience and chaos handling
    """
    
    def __init__(self, user_repo: Optional[UserRepository] = None, 
                 redis_client: Optional[redis.Redis] = None):
        self.user_repo = user_repo or UserRepository()
        self.redis_client = redis_client
        self._init_redis_with_retry()
        
    def _init_redis_with_retry(self):
        """Initialize Redis with retry logic"""
        @retry(max_attempts=3, delay=1.0)
        def _connect():
            try:
                client = redis.from_url(
                    current_app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                client.ping()
                return client
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
                return None
        
        if not self.redis_client:
            self.redis_client = _connect()
            
    def authenticate_with_firebase(self, id_token: str, version: str = 'v1') -> Dict[str, Any]:
        """
        Authenticate user with Firebase ID token - with circuit breaker
        """
        try:
            logger.info(f"Attempting to verify Firebase token for version {version}")
            
            # Verify Firebase token with circuit breaker and timeout
            @circuit_breaker(
                name="firebase_auth",
                failure_threshold=3,
                recovery_timeout=30,
                fallback=self._firebase_auth_fallback
            )
            @timeout(10.0, "Firebase authentication timed out")
            def verify_token():
                return firebase_auth.verify_id_token(id_token)
            
            try:
                decoded_token = verify_token()
            except CircuitOpenError:
                # Circuit is open, use fallback
                logger.warning("Firebase circuit breaker open, using fallback")
                return self._handle_degraded_auth(id_token, version)
                
            firebase_uid = decoded_token['uid']
            email = decoded_token.get('email')
            
            if not email:
                raise ValidationError("Email not found in Firebase token")
                
            # Get or create user with retry
            user = self._get_or_create_user_with_retry(firebase_uid, decoded_token)
            
            # Update last login with retry
            self._update_last_login_with_retry(user.id)
            
            # Generate tokens based on version
            if version == 'v2':
                return self._generate_v2_tokens_resilient(user)
            else:
                return self._generate_v1_tokens_resilient(user)
                    
        except firebase_auth.InvalidIdTokenError as e:
            logger.error(f"Invalid Firebase ID token: {e}")
            raise AuthenticationError(f"Invalid Firebase ID token: {str(e)}")
        except TimeoutError:
            logger.error("Firebase authentication timed out")
            # Try degraded mode
            return self._handle_degraded_auth(id_token, version)
        except Exception as e:
            logger.error(f"Firebase authentication error: {type(e).__name__}: {str(e)}")
            raise AuthenticationError(f"Authentication failed: {str(e)}")
    
    def _firebase_auth_fallback(self, *args, **kwargs):
        """Fallback when Firebase is down"""
        # Could check a local cache of recently valid tokens
        # For now, we'll fail safely
        raise AuthenticationError("Authentication service temporarily unavailable")
    
    def _handle_degraded_auth(self, id_token: str, version: str) -> Dict[str, Any]:
        """Handle authentication in degraded mode when Firebase is down"""
        # Check if we have a cached valid session for this token
        token_hash = hashlib.sha256(id_token.encode()).hexdigest()
        cache_key = f"degraded_auth:{token_hash}"
        
        if self.redis_client:
            try:
                cached_data = self.redis_client.get(cache_key)
                if cached_data:
                    user_data = json.loads(cached_data)
                    logger.info("Using cached authentication data")
                    return user_data
            except Exception as e:
                logger.error(f"Failed to check auth cache: {e}")
        
        # No cached data available
        raise AuthenticationError("Authentication service temporarily unavailable. Please try again later.")
    
    def _get_or_create_user_with_retry(self, firebase_uid: str, decoded_token: Dict) -> User:
        """Get or create user with retry logic"""
        @retry(max_attempts=3, delay=0.5)
        def _get_user():
            return self.user_repo.find_by_firebase_uid(firebase_uid)
        
        user = _get_user()
        
        if not user:
            # Auto-create user from Firebase
            user = self._create_user_from_firebase(decoded_token)
            
        return user
    
    def _update_last_login_with_retry(self, user_id: str):
        """Update last login with retry"""
        @retry(max_attempts=3, delay=0.5, exceptions=(Exception,))
        def _update():
            self.user_repo.update(user_id, last_login=datetime.utcnow())
        
        try:
            _update()
        except Exception as e:
            # Log but don't fail authentication
            logger.error(f"Failed to update last login: {e}")
    
    def _generate_v2_tokens_resilient(self, user: User) -> Dict[str, Any]:
        """Generate v2 tokens with resilience"""
        # Get user name from profile
        name = self._get_user_name(user)
        
        # Create tokens
        access_token = create_access_token(
            identity=str(user.id),
            fresh=True,
            expires_delta=timedelta(minutes=30),
            additional_claims={
                'email': user.email,
                'role': user.role.role_type if user.role else 'student',
                'type': 'access',
                'jti': str(secrets.token_urlsafe(16))  # Unique ID for blacklisting
            }
        )
        
        refresh_token = create_refresh_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30),
            additional_claims={
                'type': 'refresh',
                'jti': str(secrets.token_urlsafe(16))
            }
        )
        
        # Store session in Redis with fallback
        self._store_session_with_fallback(user, access_token)
        
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
    
    def _store_session_with_fallback(self, user: User, token: str):
        """Store session with fallback if Redis is down"""
        if self.redis_client:
            try:
                session_data = {
                    'user_id': str(user.id),
                    'email': user.email,
                    'role': user.role.role_type if user.role else 'student',
                    'login_time': datetime.utcnow().isoformat()
                }
                
                # Store with retry
                @retry(max_attempts=2, delay=0.5)
                def _store():
                    self.redis_client.setex(
                        f"session:{user.id}",
                        timedelta(days=30),
                        json.dumps(session_data)
                    )
                
                _store()
                
                # Also cache for degraded mode
                token_hash = hashlib.sha256(token.encode()).hexdigest()
                self.redis_client.setex(
                    f"degraded_auth:{token_hash}",
                    timedelta(hours=1),
                    json.dumps(self._generate_v2_tokens_resilient(user))
                )
                
            except Exception as e:
                logger.error(f"Failed to store session in Redis: {e}")
                # Continue without session storage
    
    def logout(self, user_id: str, access_token_jti: Optional[str] = None,
               refresh_token: Optional[str] = None):
        """Logout with graceful degradation"""
        # Blacklist tokens with fallback
        if access_token_jti:
            self._blacklist_token_safe(access_token_jti, ttl=1800)  # 30 min
            
        if refresh_token:
            try:
                decoded = decode_token(refresh_token)
                self._blacklist_token_safe(decoded.get('jti'), ttl=30*24*60*60)  # 30 days
            except:
                pass
                
        # Clear user session with fallback
        if self.redis_client:
            try:
                session_key = f"session:{user_id}"
                self.redis_client.delete(session_key)
            except Exception as e:
                logger.error(f"Failed to clear session: {e}")
    
    def _blacklist_token_safe(self, jti: str, ttl: int):
        """Blacklist token with safe fallback"""
        if not jti:
            return
            
        if self.redis_client:
            try:
                self.redis_client.setex(f"blacklist:{jti}", ttl, "1")
            except Exception as e:
                logger.error(f"Failed to blacklist token: {e}")
                # In production, might want to use a database fallback
    
    def _is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted with proper error handling"""
        if not jti:
            return True  # No JTI = invalid token
            
        if self.redis_client:
            try:
                return bool(self.redis_client.exists(f"blacklist:{jti}"))
            except Exception as e:
                logger.error(f"Failed to check token blacklist: {e}")
                # On Redis failure, we need to make a decision:
                # Option 1: Fail open (security risk)
                # Option 2: Fail closed (availability risk)
                # Option 3: Check alternative source (database)
                
                # For this example, we'll fail open with logging
                # In production, consider checking a database fallback
                logger.critical("TOKEN BLACKLIST CHECK FAILED - FAILING OPEN")
                return False
        
        # No Redis available
        logger.warning("No Redis available for blacklist check")
        return False
    
    def _get_user_name(self, user: User) -> Optional[str]:
        """Get user name with error handling"""
        try:
            if user.role:
                if user.role.role_type == 'student' and user.student_profile:
                    return user.student_profile.name
                elif user.role.role_type == 'instructor' and user.instructor_profile:
                    return user.instructor_profile.name
                elif user.role.role_type == 'admin' and user.admin_profile:
                    return user.admin_profile.name
        except Exception as e:
            logger.error(f"Failed to get user name: {e}")
        
        return None
    
    def _generate_v1_tokens_resilient(self, user: User) -> Dict[str, Any]:
        """Generate v1 tokens with resilience"""
        name = self._get_user_name(user)
        
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
        """Create user from Firebase token data with retry"""
        email = decoded_token.get('email')
        firebase_uid = decoded_token['uid']
        name = decoded_token.get('name', email.split('@')[0] if email else 'User')
        
        @retry(max_attempts=3, delay=0.5)
        def _create():
            return self.user_repo.create(
                email=email,
                firebase_uid=firebase_uid,
                name=name,
                role='student'  # Default to student role
            )
        
        return _create()


# Health check for auth service
def create_auth_health_check():
    """Create health check for auth service"""
    from core.resilience import HealthCheck
    
    def check():
        try:
            # Check Redis
            service = ResilientAuthService()
            if service.redis_client:
                service.redis_client.ping()
            
            # Check database
            service.user_repo.get_by_id("test")  # Will fail but tests connection
            
            return True
        except:
            return False
    
    return HealthCheck("auth_service", check, timeout_seconds=5.0)
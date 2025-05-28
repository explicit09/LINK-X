"""
Enhanced Authentication Service V2
Implements proper OAuth2/JWT flow with Firebase integration
Fixes session management and 401 error issues
"""
from typing import Optional, Dict, Tuple
from datetime import datetime, timedelta
import secrets
import jwt
from werkzeug.security import check_password_hash, generate_password_hash
import firebase_admin.auth as firebase_auth
from flask_jwt_extended import create_access_token, create_refresh_token
from sqlalchemy.exc import SQLAlchemyError
import redis
from contextlib import contextmanager

from ..repositories.user_repository import UserRepository
from ..core.exceptions import AuthenticationError, ValidationError
from ..db.connection import get_db_session
from ..db.schema import User, Role
from ..config import Config

class AuthServiceV2:
    """Enhanced authentication service with proper session management"""
    
    # Token configuration
    ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    SESSION_TOKEN_EXPIRES = timedelta(hours=24)
    
    def __init__(self):
        self.user_repo = UserRepository()
        self.redis_client = redis.Redis(
            host=Config.REDIS_HOST,
            port=Config.REDIS_PORT,
            db=0,
            decode_responses=True
        )
    
    @contextmanager
    def get_session(self):
        """Context manager for database sessions"""
        session = get_db_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def authenticate_firebase(self, id_token: str) -> Tuple[Dict, str, str]:
        """
        Authenticate with Firebase and return user data with tokens
        Returns: (user_data, access_token, refresh_token)
        """
        try:
            # Verify Firebase token
            decoded_token = firebase_auth.verify_id_token(id_token)
            firebase_uid = decoded_token['uid']
            email = decoded_token.get('email', '')
            
            with self.get_session() as session:
                # Check if user exists
                user = session.query(User).filter_by(firebase_uid=firebase_uid).first()
                
                if not user:
                    # Don't auto-create users - they should register properly
                    raise AuthenticationError(
                        "User not found. Please complete registration.",
                        code="USER_NOT_REGISTERED"
                    )
                
                # Update last login
                user.last_login = datetime.utcnow()
                
                # Generate tokens
                user_id = str(user.id)
                access_token = self._create_access_token(user_id, user.role.name)
                refresh_token = self._create_refresh_token(user_id)
                
                # Cache user session
                self._cache_user_session(user_id, {
                    'firebase_uid': firebase_uid,
                    'email': user.email,
                    'role': user.role.name,
                    'last_activity': datetime.utcnow().isoformat()
                })
                
                # Get user profile
                profile_data = self._get_user_profile(user)
                
                return {
                    'id': user_id,
                    'email': user.email,
                    'role': user.role.name,
                    'profile': profile_data
                }, access_token, refresh_token
                
        except firebase_auth.InvalidIdTokenError:
            raise AuthenticationError("Invalid authentication token")
        except firebase_auth.ExpiredIdTokenError:
            raise AuthenticationError("Authentication token expired")
        except AuthenticationError:
            raise
        except Exception as e:
            raise AuthenticationError(f"Authentication failed: {str(e)}")
    
    def register_with_firebase(self, id_token: str, role: str, profile_data: Dict) -> Dict:
        """
        Register a new user with Firebase authentication
        """
        if role not in ['student', 'instructor']:
            raise ValidationError("Invalid role")
        
        try:
            # Verify Firebase token
            decoded_token = firebase_auth.verify_id_token(id_token)
            firebase_uid = decoded_token['uid']
            email = decoded_token.get('email', '')
            
            if not email:
                raise ValidationError("Email is required")
            
            with self.get_session() as session:
                # Check if user already exists
                existing_user = session.query(User).filter_by(email=email).first()
                if existing_user:
                    raise ValidationError("User already exists")
                
                # Create new user
                user = User(
                    email=email,
                    firebase_uid=firebase_uid,
                    password_hash=generate_password_hash(secrets.token_urlsafe(32)),
                    created_at=datetime.utcnow(),
                    last_login=datetime.utcnow()
                )
                
                # Get role
                role_obj = session.query(Role).filter_by(name=role).first()
                if not role_obj:
                    raise ValidationError(f"Invalid role: {role}")
                
                user.role = role_obj
                session.add(user)
                session.flush()  # Get user ID
                
                # Create profile based on role
                if role == 'student':
                    from ..db.schema import StudentProfile
                    profile = StudentProfile(
                        user_id=user.id,
                        name=profile_data.get('name', email.split('@')[0]),
                        grade_level=profile_data.get('grade_level'),
                        learning_style=profile_data.get('learning_style'),
                        onboard_answers=profile_data.get('onboard_answers'),
                        want_quizzes=profile_data.get('want_quizzes', False),
                        model_preference=profile_data.get('model_preference', 'gpt-4')
                    )
                else:  # instructor
                    from ..db.schema import InstructorProfile
                    profile = InstructorProfile(
                        user_id=user.id,
                        name=profile_data.get('name', email.split('@')[0]),
                        university=profile_data.get('university'),
                        department=profile_data.get('department'),
                        bio=profile_data.get('bio')
                    )
                
                session.add(profile)
                session.commit()
                
                # Generate tokens
                user_id = str(user.id)
                access_token = self._create_access_token(user_id, role)
                refresh_token = self._create_refresh_token(user_id)
                
                # Cache user session
                self._cache_user_session(user_id, {
                    'firebase_uid': firebase_uid,
                    'email': email,
                    'role': role,
                    'last_activity': datetime.utcnow().isoformat()
                })
                
                return {
                    'id': user_id,
                    'email': email,
                    'role': role,
                    'access_token': access_token,
                    'refresh_token': refresh_token
                }
                
        except firebase_auth.InvalidIdTokenError:
            raise AuthenticationError("Invalid authentication token")
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Registration failed: {str(e)}")
    
    def refresh_access_token(self, refresh_token: str) -> Tuple[str, Optional[str]]:
        """
        Refresh access token using refresh token
        Returns: (new_access_token, new_refresh_token or None)
        """
        try:
            # Decode refresh token
            payload = jwt.decode(
                refresh_token,
                Config.JWT_SECRET_KEY,
                algorithms=['HS256']
            )
            
            user_id = payload.get('sub')
            if not user_id:
                raise AuthenticationError("Invalid refresh token")
            
            # Check if token is blacklisted
            if self._is_token_blacklisted(refresh_token):
                raise AuthenticationError("Token has been revoked")
            
            # Get user from cache or database
            user_data = self._get_cached_user_session(user_id)
            if not user_data:
                with self.get_session() as session:
                    user = session.query(User).filter_by(id=user_id).first()
                    if not user:
                        raise AuthenticationError("User not found")
                    user_data = {
                        'role': user.role.name,
                        'email': user.email
                    }
            
            # Generate new access token
            new_access_token = self._create_access_token(user_id, user_data['role'])
            
            # Optionally rotate refresh token
            new_refresh_token = None
            if self._should_rotate_refresh_token(payload):
                new_refresh_token = self._create_refresh_token(user_id)
                # Blacklist old refresh token
                self._blacklist_token(refresh_token, self.REFRESH_TOKEN_EXPIRES)
            
            return new_access_token, new_refresh_token
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Refresh token expired")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid refresh token")
    
    def verify_session_token(self, token: str) -> Dict:
        """
        Verify JWT session token and return user data
        """
        try:
            # Try to decode as JWT first
            payload = jwt.decode(
                token,
                Config.JWT_SECRET_KEY,
                algorithms=['HS256']
            )
            
            user_id = payload.get('sub') or payload.get('identity')
            if not user_id:
                raise AuthenticationError("Invalid token format")
            
            # Check if token is blacklisted
            if self._is_token_blacklisted(token):
                raise AuthenticationError("Token has been revoked")
            
            # Get user from cache or database
            user_data = self._get_cached_user_session(user_id)
            if user_data:
                # Update last activity
                user_data['last_activity'] = datetime.utcnow().isoformat()
                self._cache_user_session(user_id, user_data)
                return {
                    'id': user_id,
                    'email': user_data['email'],
                    'role': user_data['role']
                }
            
            # Fallback to database
            with self.get_session() as session:
                user = session.query(User).filter_by(id=user_id).first()
                if not user:
                    raise AuthenticationError("User not found")
                
                # Cache for future requests
                self._cache_user_session(str(user.id), {
                    'email': user.email,
                    'role': user.role.name,
                    'last_activity': datetime.utcnow().isoformat()
                })
                
                return {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role.name
                }
                
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Session expired")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid session token")
    
    def logout(self, access_token: str, refresh_token: Optional[str] = None):
        """
        Logout user by blacklisting tokens
        """
        # Blacklist access token
        self._blacklist_token(access_token, self.ACCESS_TOKEN_EXPIRES)
        
        # Blacklist refresh token if provided
        if refresh_token:
            self._blacklist_token(refresh_token, self.REFRESH_TOKEN_EXPIRES)
        
        # Clear user session cache
        try:
            payload = jwt.decode(
                access_token,
                Config.JWT_SECRET_KEY,
                algorithms=['HS256'],
                options={"verify_exp": False}  # Token might be expired
            )
            user_id = payload.get('sub')
            if user_id:
                self._clear_user_session(user_id)
        except:
            pass
    
    # Helper methods
    
    def _create_access_token(self, user_id: str, role: str) -> str:
        """Create JWT access token"""
        claims = {
            'fresh': True,
            'role': role,
            'type': 'access'
        }
        return create_access_token(
            identity=user_id,
            expires_delta=self.ACCESS_TOKEN_EXPIRES,
            additional_claims=claims
        )
    
    def _create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        claims = {
            'type': 'refresh'
        }
        return create_refresh_token(
            identity=user_id,
            expires_delta=self.REFRESH_TOKEN_EXPIRES,
            additional_claims=claims
        )
    
    def _cache_user_session(self, user_id: str, data: Dict):
        """Cache user session data in Redis"""
        try:
            key = f"user_session:{user_id}"
            self.redis_client.setex(
                key,
                self.SESSION_TOKEN_EXPIRES,
                jwt.encode(data, Config.JWT_SECRET_KEY, algorithm='HS256')
            )
        except:
            # Redis failure shouldn't break auth
            pass
    
    def _get_cached_user_session(self, user_id: str) -> Optional[Dict]:
        """Get cached user session from Redis"""
        try:
            key = f"user_session:{user_id}"
            data = self.redis_client.get(key)
            if data:
                return jwt.decode(data, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        except:
            pass
        return None
    
    def _clear_user_session(self, user_id: str):
        """Clear user session from cache"""
        try:
            key = f"user_session:{user_id}"
            self.redis_client.delete(key)
        except:
            pass
    
    def _blacklist_token(self, token: str, expires_in: timedelta):
        """Add token to blacklist"""
        try:
            key = f"blacklist:{token}"
            self.redis_client.setex(key, expires_in, "1")
        except:
            # Redis failure shouldn't break auth
            pass
    
    def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        try:
            key = f"blacklist:{token}"
            return self.redis_client.exists(key) > 0
        except:
            return False
    
    def _should_rotate_refresh_token(self, payload: Dict) -> bool:
        """Determine if refresh token should be rotated"""
        # Rotate if token is older than 7 days
        iat = payload.get('iat', 0)
        age = datetime.utcnow().timestamp() - iat
        return age > (7 * 24 * 60 * 60)
    
    def _get_user_profile(self, user: User) -> Optional[Dict]:
        """Get user profile data"""
        try:
            if user.role.name == 'student' and user.student_profile:
                profile = user.student_profile
                return {
                    'name': profile.name,
                    'grade_level': profile.grade_level,
                    'learning_style': profile.learning_style,
                    'want_quizzes': profile.want_quizzes,
                    'model_preference': profile.model_preference
                }
            elif user.role.name == 'instructor' and user.instructor_profile:
                profile = user.instructor_profile
                return {
                    'name': profile.name,
                    'university': profile.university,
                    'department': profile.department,
                    'bio': profile.bio
                }
            elif user.role.name == 'admin' and user.admin_profile:
                profile = user.admin_profile
                return {
                    'name': profile.name
                }
        except:
            pass
        return None
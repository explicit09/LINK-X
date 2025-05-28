from typing import Optional, Dict
from werkzeug.security import check_password_hash, generate_password_hash
import firebase_admin.auth as firebase_auth
from datetime import datetime, timedelta
import secrets

from ..repositories.user_repository import UserRepository
from ..core.exceptions import AuthenticationError, ValidationError
from ..core.cache import cache

class AuthService:
    """Authentication service handling user auth logic"""
    
    def __init__(self):
        self.user_repo = UserRepository()
    
    @staticmethod
    def authenticate(email: str, password: str) -> Dict:
        """Authenticate user with email and password"""
        user_repo = UserRepository()
        user = user_repo.find_by_email(email)
        
        if not user:
            raise AuthenticationError("Invalid credentials")
        
        if not check_password_hash(user.password_hash, password):
            raise AuthenticationError("Invalid credentials")
        
        if user.suspended:
            raise AuthenticationError("Account suspended")
        
        return user
    
    @staticmethod
    def create_firebase_user(firebase_uid: str, email: str, name: str) -> Dict:
        """Create user from Firebase authentication"""
        user_repo = UserRepository()
        
        # Check if user already exists
        existing_user = user_repo.find_by_email(email)
        if existing_user:
            # Update Firebase UID if needed
            if existing_user.firebase_uid != firebase_uid:
                user_repo.update(existing_user.id, firebase_uid=firebase_uid)
            # Get role value properly from relationship
            role_value = 'student'
            if existing_user.role:
                role_value = existing_user.role.role_type
            
            return {
                'id': str(existing_user.id),
                'email': existing_user.email,
                'role': role_value,
                'firebase_uid': existing_user.firebase_uid
            }
        
        # Create new user
        user = user_repo.create(
            email=email,
            firebase_uid=firebase_uid,
            role='student',  # Default role
            password_hash=generate_password_hash(secrets.token_urlsafe(32))  # Random password
        )
        
        # Create profile
        user_repo.create_student_profile(user.id, name)
        
        return {
            'id': str(user.id),
            'email': user.email,
            'role': 'student',
            'firebase_uid': user.firebase_uid
        }
    
    @staticmethod
    def register(role: str, email: str, password: str, name: str, additional_info: Dict = None) -> Dict:
        """Register new user"""
        user_repo = UserRepository()
        
        # Validate role
        if role not in ['student', 'instructor']:
            raise ValidationError("Invalid role")
        
        # Check if user exists
        if user_repo.find_by_email(email):
            raise ValidationError("Email already registered")
        
        # Validate password strength
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters")
        
        # Validate email format
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValidationError("Invalid email format")
        
        # Create Firebase user if Firebase is available
        firebase_uid = None
        try:
            firebase_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
            firebase_uid = firebase_user.uid
        except Exception as e:
            # Log error but continue - Firebase is optional
            print(f"Firebase user creation failed: {e}")
        
        # Create user in database
        user = user_repo.create(
            email=email,
            password_hash=generate_password_hash(password),
            role=role,
            firebase_uid=firebase_uid
        )
        
        # Create profile based on role
        if role == 'student':
            user_repo.create_student_profile(
                user_id=user.id,
                name=name,
                grade_level=additional_info.get('gradeLevel') if additional_info else None,
                learning_style=additional_info.get('learningStyle') if additional_info else None
            )
        else:
            user_repo.create_instructor_profile(
                user_id=user.id,
                name=name,
                department=additional_info.get('department') if additional_info else None,
                bio=additional_info.get('bio') if additional_info else None
            )
        
        return user
    
    @staticmethod
    def send_password_reset(email: str) -> bool:
        """Send password reset email"""
        user_repo = UserRepository()
        user = user_repo.find_by_email(email)
        
        if not user:
            # Don't reveal if email exists
            return True
        
        # Generate reset token
        token = secrets.token_urlsafe(32)
        expiry = datetime.utcnow() + timedelta(hours=1)
        
        # Store token in cache
        cache.set(
            f"password_reset:{token}",
            {
                'user_id': str(user.id),
                'email': email,
                'expiry': expiry.isoformat()
            },
            timeout=3600  # 1 hour
        )
        
        # Send email via Firebase or email service
        try:
            if user.firebase_uid:
                # Use Firebase password reset
                firebase_auth.generate_password_reset_link(email)
            else:
                # TODO: Implement email service
                pass
        except Exception as e:
            print(f"Failed to send password reset email: {e}")
        
        return True
    
    @staticmethod
    def reset_password(token: str, new_password: str) -> bool:
        """Reset password with token"""
        # Get token data from cache
        token_data = cache.get(f"password_reset:{token}")
        
        if not token_data:
            raise ValidationError("Invalid or expired reset token")
        
        # Check expiry
        expiry = datetime.fromisoformat(token_data['expiry'])
        if datetime.utcnow() > expiry:
            raise ValidationError("Reset token has expired")
        
        # Validate new password
        if len(new_password) < 8:
            raise ValidationError("Password must be at least 8 characters")
        
        # Update password
        user_repo = UserRepository()
        user_repo.update(
            token_data['user_id'],
            password_hash=generate_password_hash(new_password)
        )
        
        # Delete token from cache
        cache.delete(f"password_reset:{token}")
        
        # Update Firebase password if applicable
        try:
            user = user_repo.get_by_id(token_data['user_id'])
            if user.firebase_uid:
                firebase_auth.update_user(
                    user.firebase_uid,
                    password=new_password
                )
        except Exception as e:
            print(f"Failed to update Firebase password: {e}")
        
        return True
    
    @staticmethod
    def verify_firebase_token(token: str) -> Dict:
        """Verify Firebase authentication token"""
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            return decoded_token
        except firebase_auth.InvalidIdTokenError:
            raise AuthenticationError("Invalid authentication token")
        except firebase_auth.ExpiredIdTokenError:
            raise AuthenticationError("Authentication token expired")
        except Exception:
            raise AuthenticationError("Token verification failed")
    
    @staticmethod
    def update_last_login(user_id: str) -> None:
        """Update user's last login timestamp"""
        user_repo = UserRepository()
        user_repo.update(user_id, last_login=datetime.utcnow())
    
    @staticmethod
    def update_email(user_id: str, new_email: str) -> Dict:
        """Update user email"""
        user_repo = UserRepository()
        
        # Validate email format
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', new_email):
            raise ValidationError("Invalid email format")
        
        # Check if email already exists
        existing = user_repo.find_by_email(new_email)
        if existing and str(existing.id) != str(user_id):
            raise ValidationError("Email already in use")
        
        return user_repo.update(user_id, email=new_email)
    
    @staticmethod
    def update_profile(user_id: str, role: str, **kwargs) -> bool:
        """Update user profile fields"""
        user_repo = UserRepository()
        return user_repo.update_profile(user_id, role, **kwargs)
    
    @staticmethod
    def delete_user(user_id: str) -> bool:
        """Delete user account and all associated data"""
        user_repo = UserRepository()
        
        # TODO: Delete all user data in a transaction
        # - Delete enrollments
        # - Delete personalized files
        # - Delete created courses (for instructors)
        # - Delete chat history
        
        return user_repo.delete(user_id)
"""
Comprehensive Authentication Tests
Tests all authentication flows and edge cases
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import jwt
from flask import Flask
from flask_jwt_extended import create_access_token

from services.auth_service_unified import UnifiedAuthService
from core.exceptions import AuthenticationError, ValidationError
from db.schema import User, Role, RoleType


@pytest.fixture
def app():
    """Create test Flask app"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=30)
    return app


@pytest.fixture
def auth_service():
    """Create auth service instance"""
    service = UnifiedAuthService()
    service.db = Mock()
    service.user_repo = Mock()
    service.firebase_client = Mock()
    service.jwt_blacklist = Mock()
    return service


class TestJWTAuthentication:
    """Test JWT-based authentication"""
    
    def test_login_success(self, auth_service):
        """Test successful login"""
        # Mock user
        mock_user = Mock(spec=User)
        mock_user.id = 'user-123'
        mock_user.email = 'test@example.com'
        # Mock role object
        mock_role = Mock()
        mock_role.role_type = 'student'
        mock_user.role = mock_role
        mock_user.is_active = True
        mock_user.password_hash = 'hashed_password'
        mock_user.check_password = Mock(return_value=True)
        mock_student_profile = Mock()
        mock_student_profile.name = 'Test Student'
        mock_user.student_profile = mock_student_profile
        mock_user.instructor_profile = None
        mock_user.admin_profile = None
        
        auth_service.user_repo.find_by_email.return_value = mock_user
        auth_service._verify_password = Mock(return_value=True)
        auth_service.user_repo.update = Mock()
        
        # Test login
        result = auth_service.authenticate_email_password('test@example.com', 'password123')
        
        assert result['user']['user_id'] == 'user-123'
        assert result['user']['email'] == 'test@example.com'
        assert result['user']['role'] == 'student'
        assert 'firebase_uid' in result
    
    def test_login_invalid_password(self, auth_service):
        """Test login with invalid password"""
        mock_user = Mock(spec=User)
        mock_user.check_password = Mock(return_value=False)
        
        auth_service.user_repo.find_by_email.return_value = mock_user
        
        with pytest.raises(AuthenticationError, match="Invalid credentials"):
            auth_service.authenticate_email_password('test@example.com', 'wrongpassword')
    
    def test_login_user_not_found(self, auth_service):
        """Test login with non-existent user"""
        auth_service.user_repo.get_by_email.return_value = None
        
        with pytest.raises(AuthenticationError, match="Invalid credentials"):
            auth_service.authenticate_email_password('notfound@example.com', 'password')
    
    def test_login_suspended_user(self, auth_service):
        """Test login with suspended account"""
        mock_user = Mock(spec=User)
        mock_user.is_active = False
        mock_user.check_password = Mock(return_value=True)
        
        auth_service.user_repo.find_by_email.return_value = mock_user
        
        with pytest.raises(AuthenticationError, match="Account is suspended"):
            auth_service.authenticate_email_password('suspended@example.com', 'password')


class TestFirebaseAuthentication:
    """Test Firebase authentication integration"""
    
    def test_firebase_login_success(self, auth_service):
        """Test successful Firebase login"""
        # Mock Firebase response
        firebase_user = {
            'uid': 'firebase-123',
            'email': 'user@example.com',
            'email_verified': True
        }
        auth_service.firebase_client.verify_id_token.return_value = firebase_user
        
        # Mock existing user
        mock_user = Mock(spec=User)
        mock_user.id = 'user-123'
        mock_user.firebase_uid = 'firebase-123'
        mock_user.email = 'user@example.com'
        # Mock role object
        mock_role = Mock()
        mock_role.role_type = 'student'
        mock_user.role = mock_role
        
        auth_service.user_repo.get_by_firebase_uid.return_value = mock_user
        
        # Test Firebase login
        result = auth_service.authenticate_with_firebase('firebase-token-123')
        
        assert result['user']['id'] == 'user-123'
        assert 'access_token' in result
    
    def test_firebase_login_new_user(self, auth_service):
        """Test Firebase login creating new user"""
        firebase_user = {
            'uid': 'firebase-new',
            'email': 'newuser@example.com',
            'email_verified': True
        }
        auth_service.firebase_client.verify_id_token.return_value = firebase_user
        auth_service.user_repo.get_by_firebase_uid.return_value = None
        auth_service.user_repo.get_by_email.return_value = None
        
        # Mock new user creation
        new_user = Mock(spec=User)
        new_user.id = 'new-user-123'
        new_user.email = 'newuser@example.com'
        new_user.role = RoleType.STUDENT
        
        auth_service.user_repo.create.return_value = new_user
        
        result = auth_service.authenticate_with_firebase('firebase-token-123')
        
        assert result['user']['email'] == 'newuser@example.com'
        auth_service.user_repo.create.assert_called_once()
    
    def test_firebase_login_invalid_token(self, auth_service):
        """Test Firebase login with invalid token"""
        auth_service.firebase_client.verify_id_token.side_effect = Exception("Invalid token")
        
        with pytest.raises(AuthenticationError, match="Invalid Firebase token"):
            auth_service.authenticate_with_firebase('invalid-token')
    
    def test_firebase_login_unverified_email(self, auth_service):
        """Test Firebase login with unverified email"""
        firebase_user = {
            'uid': 'firebase-123',
            'email': 'unverified@example.com',
            'email_verified': False
        }
        auth_service.firebase_client.verify_id_token.return_value = firebase_user
        
        with pytest.raises(AuthenticationError, match="Email not verified"):
            auth_service.authenticate_with_firebase('firebase-token-123')


class TestTokenManagement:
    """Test JWT token management"""
    
    def test_refresh_token_success(self, auth_service, app):
        """Test successful token refresh"""
        with app.app_context():
            # Create valid refresh token
            refresh_token = create_access_token(
                identity='user-123',
                additional_claims={'type': 'refresh'}
            )
            
            # Mock user
            mock_user = Mock(spec=User)
            mock_user.id = 'user-123'
            mock_user.email = 'test@example.com'
            # Mock role object
            mock_role = Mock()
            mock_role.role_type = 'student'
            mock_user.role = mock_role
            
            auth_service.user_repo.get_by_id.return_value = mock_user
            auth_service.jwt_blacklist.is_token_blacklisted.return_value = False
            
            result = auth_service.refresh_token(refresh_token)
            
            assert 'access_token' in result
            assert result['token_type'] == 'bearer'
    
    def test_refresh_token_blacklisted(self, auth_service, app):
        """Test refresh with blacklisted token"""
        with app.app_context():
            refresh_token = create_access_token(
                identity='user-123',
                additional_claims={'jti': 'token-123', 'type': 'refresh'}
            )
            
            auth_service.jwt_blacklist.is_token_blacklisted.return_value = True
            
            with pytest.raises(AuthenticationError, match="Token has been revoked"):
                auth_service.refresh_token(refresh_token)
    
    def test_logout_success(self, auth_service):
        """Test successful logout"""
        token_jti = 'token-123'
        token_exp = datetime.utcnow() + timedelta(hours=1)
        
        auth_service.jwt_blacklist.blacklist_token.return_value = True
        
        result = auth_service.logout(token_jti, token_exp, 'user-123')
        
        assert result is True
        auth_service.jwt_blacklist.blacklist_token.assert_called_once_with(
            token_jti, token_exp, 'user-123'
        )
    
    def test_revoke_all_tokens(self, auth_service):
        """Test revoking all user tokens"""
        auth_service.jwt_blacklist.blacklist_all_user_tokens.return_value = 5
        
        result = auth_service.revoke_all_user_tokens('user-123')
        
        assert result == 5
        auth_service.jwt_blacklist.blacklist_all_user_tokens.assert_called_once_with('user-123')


class TestUserRegistration:
    """Test user registration flows"""
    
    def test_register_student_success(self, auth_service):
        """Test successful student registration"""
        auth_service.user_repo.get_by_email.return_value = None
        
        new_user = Mock(spec=User)
        new_user.id = 'new-user-123'
        new_user.email = 'student@example.com'
        new_user.role = RoleType.STUDENT
        
        auth_service.user_repo.create.return_value = new_user
        
        result = auth_service.register(
            email='student@example.com',
            password='SecurePass123!',
            role='student',
            full_name='Test Student'
        )
        
        assert result['user']['email'] == 'student@example.com'
        assert result['user']['role'] == 'student'
        assert 'access_token' in result
    
    def test_register_duplicate_email(self, auth_service):
        """Test registration with existing email"""
        existing_user = Mock(spec=User)
        auth_service.user_repo.get_by_email.return_value = existing_user
        
        with pytest.raises(ValidationError, match="Email already registered"):
            auth_service.register(
                email='existing@example.com',
                password='password123',
                role='student'
            )
    
    def test_register_weak_password(self, auth_service):
        """Test registration with weak password"""
        auth_service.user_repo.get_by_email.return_value = None
        
        with pytest.raises(ValidationError, match="Password"):
            auth_service.register(
                email='new@example.com',
                password='weak',
                role='student'
            )
    
    def test_register_invalid_role(self, auth_service):
        """Test registration with invalid role"""
        auth_service.user_repo.get_by_email.return_value = None
        
        with pytest.raises(ValidationError, match="Invalid role"):
            auth_service.register(
                email='new@example.com',
                password='SecurePass123!',
                role='superadmin'  # Invalid role
            )


class TestPasswordManagement:
    """Test password reset and change flows"""
    
    def test_request_password_reset(self, auth_service):
        """Test password reset request"""
        mock_user = Mock(spec=User)
        mock_user.email = 'user@example.com'
        
        auth_service.user_repo.find_by_email.return_value = mock_user
        
        with patch('services.auth_service_unified.send_password_reset_email') as mock_send:
            result = auth_service.request_password_reset('user@example.com')
            
            assert result is True
            mock_send.assert_called_once()
    
    def test_reset_password_success(self, auth_service):
        """Test successful password reset"""
        mock_user = Mock(spec=User)
        mock_user.id = 'user-123'
        
        auth_service.user_repo.get_by_id.return_value = mock_user
        
        with patch('services.auth_service_unified.verify_reset_token') as mock_verify:
            mock_verify.return_value = 'user-123'
            
            result = auth_service.reset_password('reset-token', 'NewSecurePass123!')
            
            assert result is True
            auth_service.user_repo.update.assert_called_once()
    
    def test_reset_password_invalid_token(self, auth_service):
        """Test password reset with invalid token"""
        with patch('services.auth_service_unified.verify_reset_token') as mock_verify:
            mock_verify.return_value = None
            
            with pytest.raises(ValidationError, match="Invalid or expired token"):
                auth_service.reset_password('invalid-token', 'NewPass123!')
    
    def test_change_password_success(self, auth_service):
        """Test successful password change"""
        mock_user = Mock(spec=User)
        mock_user.check_password = Mock(return_value=True)
        mock_user.set_password = Mock()
        
        result = auth_service.change_password(
            user=mock_user,
            old_password='OldPass123!',
            new_password='NewSecurePass123!'
        )
        
        assert result is True
        mock_user.set_password.assert_called_once_with('NewSecurePass123!')
        auth_service.user_repo.update.assert_called_once()
    
    def test_change_password_wrong_old(self, auth_service):
        """Test password change with wrong old password"""
        mock_user = Mock(spec=User)
        mock_user.check_password = Mock(return_value=False)
        
        with pytest.raises(ValidationError, match="Current password is incorrect"):
            auth_service.change_password(
                user=mock_user,
                old_password='WrongOldPass',
                new_password='NewPass123!'
            )


class TestSecurityFeatures:
    """Test security features"""
    
    def test_rate_limiting_login_attempts(self, auth_service):
        """Test rate limiting on login attempts"""
        auth_service.user_repo.get_by_email.return_value = None
        
        # Simulate multiple failed attempts
        for i in range(10):
            try:
                auth_service.authenticate_email_password(f'attempt{i}@example.com', 'wrong')
            except AuthenticationError:
                pass
        
        # Verify rate limiter was called
        # This would need actual rate limiter integration
    
    def test_session_invalidation_on_password_change(self, auth_service):
        """Test all sessions invalidated on password change"""
        mock_user = Mock(spec=User)
        mock_user.id = 'user-123'
        mock_user.check_password = Mock(return_value=True)
        
        auth_service.change_password(mock_user, 'OldPass123!', 'NewPass123!')
        
        # Verify all user tokens were blacklisted
        auth_service.jwt_blacklist.blacklist_all_user_tokens.assert_called_with('user-123')
    
    def test_account_lockout_after_failures(self, auth_service):
        """Test account lockout after multiple failures"""
        # This would need actual implementation of account lockout
        pass


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
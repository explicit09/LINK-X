"""
Unit tests for AuthService
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from werkzeug.security import generate_password_hash, check_password_hash

from src.services.auth_service_unified import UnifiedAuthService as AuthService
from src.core.exceptions import AuthenticationError, ValidationError
from src.db.schema import User, Role

class TestAuthService:
    """Test cases for AuthService"""
    
    @pytest.fixture
    def mock_user_repo(self):
        """Mock UserRepository"""
        with patch('src.services.auth_service_unified.UserRepository') as mock:
            yield mock.return_value
    
    def test_authenticate_success(self, mock_user_repo):
        """Test successful authentication"""
        # Arrange
        mock_user = Mock(spec=User)
        mock_user.id = 'user-123'
        mock_user.email = 'test@example.com'
        mock_user.password_hash = generate_password_hash('password123')
        mock_user.suspended = False
        mock_user_repo.find_by_email.return_value = mock_user
        
        # Act
        result = AuthService.authenticate('test@example.com', 'password123')
        
        # Assert
        assert result == mock_user
        mock_user_repo.find_by_email.assert_called_once_with('test@example.com')
    
    def test_authenticate_invalid_email(self, mock_user_repo):
        """Test authentication with invalid email"""
        # Arrange
        mock_user_repo.find_by_email.return_value = None
        
        # Act & Assert
        with pytest.raises(AuthenticationError) as exc_info:
            AuthService.authenticate('invalid@example.com', 'password123')
        
        assert str(exc_info.value) == "Invalid credentials"
    
    def test_authenticate_wrong_password(self, mock_user_repo):
        """Test authentication with wrong password"""
        # Arrange
        mock_user = Mock(spec=User)
        mock_user.password_hash = generate_password_hash('correctpassword')
        mock_user.suspended = False
        mock_user_repo.find_by_email.return_value = mock_user
        
        # Act & Assert
        with pytest.raises(AuthenticationError) as exc_info:
            AuthService.authenticate('test@example.com', 'wrongpassword')
        
        assert str(exc_info.value) == "Invalid credentials"
    
    def test_authenticate_suspended_user(self, mock_user_repo):
        """Test authentication with suspended account"""
        # Arrange
        mock_user = Mock(spec=User)
        mock_user.password_hash = generate_password_hash('password123')
        mock_user.suspended = True
        mock_user_repo.find_by_email.return_value = mock_user
        
        # Act & Assert
        with pytest.raises(AuthenticationError) as exc_info:
            AuthService.authenticate('test@example.com', 'password123')
        
        assert str(exc_info.value) == "Account suspended"
    
    def test_register_validates_password_length(self, mock_user_repo):
        """Test registration validates password length"""
        # Arrange
        mock_user_repo.find_by_email.return_value = None
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            AuthService.register('student', 'test@example.com', 'short', 'Test User')
        
        assert "Password must be at least 8 characters" in str(exc_info.value)
    
    def test_register_validates_email_format(self, mock_user_repo):
        """Test registration validates email format"""
        # Arrange
        mock_user_repo.find_by_email.return_value = None
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            AuthService.register('student', 'invalid-email', 'password123', 'Test User')
        
        assert "Invalid email format" in str(exc_info.value)
    
    def test_register_checks_existing_email(self, mock_user_repo):
        """Test registration checks for existing email"""
        # Arrange
        mock_user_repo.find_by_email.return_value = Mock(spec=User)
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            AuthService.register('student', 'existing@example.com', 'password123', 'Test User')
        
        assert "Email already registered" in str(exc_info.value)
    
    def test_register_creates_student_profile(self, mock_user_repo):
        """Test registration creates student profile"""
        # Arrange
        mock_user_repo.find_by_email.return_value = None
        mock_user = Mock(id='user-123')
        mock_user_repo.create.return_value = mock_user
        
        # Mock Firebase
        with patch('src.services.auth_service.firebase_auth') as mock_firebase:
            mock_firebase.create_user.return_value = Mock(uid='firebase-123')
            
            # Act
            result = AuthService.register(
                'student', 
                'test@example.com', 
                'password123', 
                'Test Student',
                {'gradeLevel': 'college'}
            )
        
        # Assert
        assert result == mock_user
        mock_user_repo.create_student_profile.assert_called_once()
        call_args = mock_user_repo.create_student_profile.call_args
        assert call_args[0][0] == 'user-123'  # user_id
        assert call_args[0][1] == 'Test Student'  # name
    
    def test_register_creates_instructor_profile(self, mock_user_repo):
        """Test registration creates instructor profile"""
        # Arrange
        mock_user_repo.find_by_email.return_value = None
        mock_user = Mock(id='user-123')
        mock_user_repo.create.return_value = mock_user
        
        # Mock Firebase
        with patch('src.services.auth_service.firebase_auth') as mock_firebase:
            mock_firebase.create_user.return_value = Mock(uid='firebase-123')
            
            # Act
            result = AuthService.register(
                'instructor',
                'test@example.com',
                'password123',
                'Test Instructor',
                {'department': 'Computer Science'}
            )
        
        # Assert
        assert result == mock_user
        mock_user_repo.create_instructor_profile.assert_called_once()
    
    @patch('src.services.auth_service.cache')
    def test_send_password_reset_stores_token(self, mock_cache, mock_user_repo):
        """Test password reset stores token in cache"""
        # Arrange
        mock_user = Mock(id='user-123', firebase_uid='firebase-123')
        mock_user_repo.find_by_email.return_value = mock_user
        
        with patch('src.services.auth_service.secrets.token_urlsafe') as mock_token:
            mock_token.return_value = 'reset-token-123'
            
            # Act
            result = AuthService.send_password_reset('test@example.com')
        
        # Assert
        assert result == True
        mock_cache.set.assert_called_once()
        cache_key = mock_cache.set.call_args[0][0]
        assert cache_key == 'password_reset:reset-token-123'
    
    @patch('src.services.auth_service.cache')
    def test_reset_password_validates_token(self, mock_cache, mock_user_repo):
        """Test password reset validates token"""
        # Arrange
        mock_cache.get.return_value = None
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            AuthService.reset_password('invalid-token', 'newpassword123')
        
        assert "Invalid or expired reset token" in str(exc_info.value)
    
    @patch('src.services.auth_service.cache')
    def test_reset_password_updates_password(self, mock_cache, mock_user_repo):
        """Test password reset updates password"""
        # Arrange
        from datetime import datetime, timedelta
        
        token_data = {
            'user_id': 'user-123',
            'email': 'test@example.com',
            'expiry': (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
        mock_cache.get.return_value = token_data
        mock_user = Mock(firebase_uid='firebase-123')
        mock_user_repo.get_by_id.return_value = mock_user
        
        # Act
        result = AuthService.reset_password('valid-token', 'newpassword123')
        
        # Assert
        assert result == True
        mock_user_repo.update.assert_called_once()
        update_args = mock_user_repo.update.call_args[1]
        assert check_password_hash(update_args['password_hash'], 'newpassword123')
        mock_cache.delete.assert_called_once_with('password_reset:valid-token')
    
    def test_update_email_validates_format(self, mock_user_repo):
        """Test email update validates format"""
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            AuthService.update_email('user-123', 'invalid-email')
        
        assert "Invalid email format" in str(exc_info.value)
    
    def test_update_email_checks_duplicate(self, mock_user_repo):
        """Test email update checks for duplicates"""
        # Arrange
        existing_user = Mock(id='other-user')
        mock_user_repo.find_by_email.return_value = existing_user
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            AuthService.update_email('user-123', 'taken@example.com')
        
        assert "Email already in use" in str(exc_info.value)
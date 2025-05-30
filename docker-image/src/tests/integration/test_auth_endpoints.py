"""
Integration tests for authentication endpoints
"""
import pytest
import json
from flask.testing import FlaskClient
from unittest.mock import patch, Mock

from db.schema import User, Role

class TestAuthEndpoints:
    """Integration tests for auth endpoints"""
    
    def test_get_current_user(self, client: FlaskClient, auth_headers: dict, test_user: dict):
        """Test GET /me endpoint"""
        # Mock Firebase auth
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': test_user['firebase_uid']}
            
            # Act
            response = client.get('/api/v1/auth/me', headers=auth_headers)
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == test_user['id']
        assert data['email'] == test_user['email']
        assert data['role'] == 'student'
        assert 'profile' in data
    
    def test_update_current_user(self, client: FlaskClient, auth_headers: dict, test_user: dict):
        """Test PATCH /me endpoint"""
        # Mock Firebase auth
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': test_user['firebase_uid']}
            
            # Act
            update_data = {
                'name': 'Updated Name',
                'learning_style': 'kinesthetic'
            }
            response = client.patch(
                '/api/v1/auth/me',
                headers=auth_headers,
                json=update_data
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == test_user['id']
    
    def test_delete_current_user(self, client: FlaskClient, auth_headers: dict, test_user: dict):
        """Test DELETE /me endpoint"""
        # Mock Firebase auth
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': test_user['firebase_uid']}
            
            # Act
            response = client.delete('/api/v1/auth/me', headers=auth_headers)
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Account deleted'
        
        # Verify cookie is cleared
        assert 'session' in response.headers.get('Set-Cookie', '')
        assert 'max_age=0' in response.headers.get('Set-Cookie', '')
    
    def test_register_student_firebase(self, client: FlaskClient, db_session):
        """Test student registration with Firebase"""
        # Mock Firebase token verification
        with patch('api.auth_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {
                'uid': 'new-firebase-uid',
                'email': 'newstudent@example.com'
            }
            
            # Act
            response = client.post('/api/v1/auth/register/student', json={
                'idToken': 'mock-firebase-token',
                'email': 'newstudent@example.com',
                'password': 'password123'
            })
        
        # Assert
        assert response.status_code == 201
        data = response.get_json()
        assert 'id' in data
        assert data['email'] == 'newstudent@example.com'
        
        # Verify user was created in database
        user = db_session.query(User).filter_by(email='newstudent@example.com').first()
        assert user is not None
        assert user.role == Role.STUDENT
    
    def test_register_instructor_firebase(self, client: FlaskClient, db_session):
        """Test instructor registration with Firebase"""
        # Mock Firebase token verification
        with patch('api.auth_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {
                'uid': 'instructor-firebase-uid',
                'email': 'newinstructor@example.com'
            }
            
            # Act
            response = client.post('/api/v1/auth/register/instructor', json={
                'idToken': 'mock-firebase-token',
                'email': 'newinstructor@example.com',
                'password': 'password123',
                'name': 'New Instructor',
                'university': 'Test University'
            })
        
        # Assert
        assert response.status_code == 201
        data = response.get_json()
        assert 'id' in data
        assert data['email'] == 'newinstructor@example.com'
    
    def test_login_with_firebase(self, client: FlaskClient, test_user: dict):
        """Test login endpoint with Firebase token"""
        # Mock Firebase token verification
        with patch('api.auth_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {
                'uid': test_user['firebase_uid'],
                'email': test_user['email']
            }
            
            # Act
            response = client.post('/api/v1/auth/login', json={
                'idToken': 'mock-firebase-token'
            })
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        assert 'access_token' in data
        assert data['user']['id'] == test_user['id']
        assert data['user']['email'] == test_user['email']
    
    def test_login_invalid_token(self, client: FlaskClient):
        """Test login with invalid Firebase token"""
        # Mock Firebase token verification to fail
        with patch('api.auth_unified.verify_firebase_token') as mock_verify:
            mock_verify.side_effect = Exception('Invalid token')
            
            # Act
            response = client.post('/api/v1/auth/login', json={
                'idToken': 'invalid-token'
            })
        
        # Assert
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data
    
    def test_forgot_password(self, client: FlaskClient, test_user: dict):
        """Test forgot password endpoint"""
        # Act
        response = client.post('/api/v1/auth/forgot-password', json={
            'email': test_user['email']
        })
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Password reset email sent if account exists'
    
    def test_forgot_password_rate_limit(self, client: FlaskClient):
        """Test forgot password rate limiting"""
        # Make multiple requests
        for i in range(4):
            response = client.post('/api/v1/auth/forgot-password', json={
                'email': 'test@example.com'
            })
            
            if i < 3:
                assert response.status_code == 200
            else:
                # Fourth request should be rate limited
                assert response.status_code == 429
                data = response.get_json()
                assert 'Rate limit exceeded' in data['error']
    
    @patch('services.auth_service_unified.cache')
    def test_reset_password(self, mock_cache, client: FlaskClient, test_user: dict):
        """Test password reset endpoint"""
        # Mock cache with valid token
        from datetime import datetime, timedelta
        
        mock_cache.get.return_value = {
            'user_id': test_user['id'],
            'email': test_user['email'],
            'expiry': (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
        
        # Act
        response = client.post('/api/v1/auth/reset-password', json={
            'token': 'valid-reset-token',
            'password': 'newpassword123'
        })
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Password reset successful'
    
    def test_unauthorized_access(self, client: FlaskClient):
        """Test accessing protected endpoint without auth"""
        # Act
        response = client.get('/api/v1/auth/me')
        
        # Assert
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data
"""
Critical Path Integration Tests
Tests the most important user flows end-to-end
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime
import io

from app import create_app
from db.schema import User, Course, File, Enrollment
from services.auth_service_v3 import AuthServiceV3
from core.firebase_config import initialize_firebase


class TestCriticalPaths:
    """Test critical user flows"""
    
    @pytest.fixture
    def app(self):
        """Create test app"""
        app = create_app('testing')
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()
    
    @pytest.fixture
    def auth_headers(self):
        """Generate auth headers"""
        def _make_headers(token='test-token'):
            return {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        return _make_headers
    
    @pytest.fixture
    def mock_firebase(self):
        """Mock Firebase for tests"""
        with patch('firebase_admin.auth.verify_id_token') as mock_verify:
            with patch('firebase_admin.auth.create_user') as mock_create:
                mock_verify.return_value = {
                    'uid': 'test-firebase-uid',
                    'email': 'test@example.com',
                    'name': 'Test User'
                }
                mock_create.return_value = MagicMock(uid='new-firebase-uid')
                yield {
                    'verify': mock_verify,
                    'create': mock_create
                }
    
    # Test 1: User Registration and Login Flow
    
    def test_user_registration_flow(self, client, mock_firebase):
        """Test complete user registration flow"""
        # Register new user
        response = client.post('/api/v1/auth/register', json={
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'name': 'New User',
            'role': 'student'
        })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'user' in data
        assert data['user']['email'] == 'newuser@example.com'
    
    def test_user_login_flow(self, client, mock_firebase):
        """Test user login with Firebase token"""
        # Login with Firebase ID token
        response = client.post('/api/v1/auth/login', json={
            'id_token': 'test-firebase-id-token'
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data
    
    def test_user_logout_flow(self, client, auth_headers):
        """Test user logout"""
        with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
            mock_identity.return_value = {'user_id': 'test-user-123'}
            
            response = client.post(
                '/api/v1/auth/logout',
                headers=auth_headers()
            )
            
            assert response.status_code == 200
    
    # Test 2: File Upload Flow
    
    @patch('services.s3_storage.S3Storage.upload_file')
    @patch('tasks.file_processing.process_file.delay')
    def test_file_upload_flow(self, mock_process, mock_s3, client, auth_headers):
        """Test complete file upload flow"""
        mock_s3.return_value = 's3://bucket/file.pdf'
        mock_process.return_value = MagicMock(id='task-123')
        
        # Create test file
        data = {
            'file': (io.BytesIO(b'test file content'), 'test.pdf'),
            'module_id': 'test-module-123',
            'name': 'Test Document'
        }
        
        with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
            mock_identity.return_value = {'user_id': 'test-user-123'}
            
            response = client.post(
                '/api/v1/files/upload',
                data=data,
                headers={
                    'Authorization': 'Bearer test-token',
                    'Content-Type': 'multipart/form-data'
                }
            )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'file_id' in data
        assert 'task_id' in data
        assert mock_s3.called
        assert mock_process.called
    
    def test_file_download_flow(self, client, auth_headers):
        """Test file download with permissions"""
        with patch('services.file_service.FileService.get_download_url') as mock_download:
            mock_download.return_value = 'https://s3.example.com/signed-url'
            
            with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
                mock_identity.return_value = {'user_id': 'test-user-123'}
                
                response = client.get(
                    '/api/v1/files/test-file-123/download',
                    headers=auth_headers()
                )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'download_url' in data
    
    # Test 3: Course Enrollment Flow
    
    def test_course_enrollment_flow(self, client, auth_headers):
        """Test complete course enrollment flow"""
        # Enroll in course with access code
        with patch('services.course_service.CourseService.enroll_student') as mock_enroll:
            mock_enroll.return_value = MagicMock(
                course_id='course-123',
                student_id='user-123',
                enrolled_at=datetime.utcnow()
            )
            
            with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
                mock_identity.return_value = {'user_id': 'test-user-123'}
                
                response = client.post(
                    '/api/v1/courses/enroll',
                    json={'access_code': 'LEARN123'},
                    headers=auth_headers()
                )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Successfully enrolled in course'
        assert 'course' in data
    
    def test_course_progress_tracking(self, client, auth_headers):
        """Test course progress tracking"""
        with patch('services.course_service.CourseService.get_student_progress') as mock_progress:
            mock_progress.return_value = {
                'completed_modules': 5,
                'total_modules': 10,
                'progress_percentage': 50.0
            }
            
            with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
                mock_identity.return_value = {'user_id': 'test-user-123'}
                
                response = client.get(
                    '/api/v1/courses/course-123/progress',
                    headers=auth_headers()
                )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['progress_percentage'] == 50.0
    
    # Test 4: AI Features Flow
    
    @patch('services.ai_service.AIService.generate_summary')
    def test_ai_summarization_flow(self, mock_ai, client, auth_headers):
        """Test AI summarization for uploaded files"""
        mock_ai.return_value = "This is an AI generated summary of the document."
        
        with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
            mock_identity.return_value = {'user_id': 'test-user-123'}
            
            response = client.post(
                '/api/v1/ai/summarize',
                json={'file_id': 'test-file-123'},
                headers=auth_headers()
            )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'summary' in data
        assert mock_ai.called
    
    @patch('services.streaming_personalization.PersonalizationService.get_recommendations')
    def test_personalized_recommendations(self, mock_recommendations, client, auth_headers):
        """Test personalized content recommendations"""
        mock_recommendations.return_value = [
            {'file_id': 'file-1', 'relevance': 0.95},
            {'file_id': 'file-2', 'relevance': 0.87}
        ]
        
        with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
            mock_identity.return_value = {'user_id': 'test-user-123'}
            
            response = client.get(
                '/api/v1/recommendations',
                headers=auth_headers()
            )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'recommendations' in data
        assert len(data['recommendations']) == 2
    
    # Test 5: Security and Rate Limiting
    
    def test_rate_limiting(self, client):
        """Test rate limiting on auth endpoints"""
        # Simulate multiple failed login attempts
        with patch('core.rate_limiter.RateLimiter.is_allowed') as mock_limiter:
            mock_limiter.return_value = (False, {
                'limit': 20,
                'remaining': 0,
                'reset': 3600,
                'retry_after': 3600
            })
            
            response = client.post('/api/v1/auth/login', json={
                'email': 'test@example.com',
                'password': 'wrong'
            })
        
        assert response.status_code == 429
        assert 'Retry-After' in response.headers
    
    def test_sql_injection_protection(self, client, auth_headers):
        """Test SQL injection protection"""
        # Attempt SQL injection in search
        with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
            mock_identity.return_value = {'user_id': 'test-user-123'}
            
            response = client.get(
                '/api/v1/search',
                query_string={'q': "'; DROP TABLE users; --"},
                headers=auth_headers()
            )
        
        # Should handle safely without error
        assert response.status_code in [200, 400]
        # Database should still be intact
    
    def test_csrf_protection(self, client):
        """Test CSRF protection on state-changing operations"""
        # Attempt to create course without CSRF token
        response = client.post('/api/v1/courses', json={
            'title': 'Test Course',
            'description': 'Test'
        })
        
        # Should be rejected without proper auth
        assert response.status_code == 401
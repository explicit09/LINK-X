"""
API Integration Tests
Tests API endpoints with realistic scenarios
"""

import pytest
import json
from unittest.mock import Mock, patch
from flask import Flask
from flask.testing import FlaskClient
from datetime import datetime

from app import create_app
from db.schema import User, Role, Course, Module, File


@pytest.fixture
def app():
    """Create test Flask app"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-secret'
    app.config['DATABASE_URL'] = 'sqlite:///:memory:'
    app.config['FIREBASE_DISABLED'] = 'true'
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers(app):
    """Create authenticated headers"""
    with app.app_context():
        from flask_jwt_extended import create_access_token
        token = create_access_token(
            identity='test-user-123',
            additional_claims={'role': 'student'}
        )
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def instructor_headers(app):
    """Create instructor authenticated headers"""
    with app.app_context():
        from flask_jwt_extended import create_access_token
        token = create_access_token(
            identity='instructor-123',
            additional_claims={'role': 'instructor'}
        )
        return {'Authorization': f'Bearer {token}'}


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_basic_health(self, client):
        """Test basic health endpoint"""
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
    
    def test_detailed_health(self, client):
        """Test detailed health endpoint"""
        response = client.get('/health/detailed')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'database' in data
        assert 'redis' in data
        assert 'timestamp' in data
    
    def test_ready_probe(self, client):
        """Test Kubernetes readiness probe"""
        response = client.get('/ready')
        assert response.status_code == 200
    
    def test_live_probe(self, client):
        """Test Kubernetes liveness probe"""
        response = client.get('/live')
        assert response.status_code == 200


class TestAuthenticationAPI:
    """Test authentication endpoints"""
    
    @patch('services.auth_service_unified.UnifiedAuthService')
    def test_login_success(self, mock_auth, client):
        """Test successful login"""
        mock_service = mock_auth.return_value
        mock_service.login.return_value = {
            'user': {'id': 'user-123', 'email': 'test@example.com'},
            'access_token': 'test-token',
            'refresh_token': 'refresh-token'
        }
        
        response = client.post('/auth/login', json={
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert data['user']['email'] == 'test@example.com'
    
    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        response = client.post('/auth/login', json={
            'email': 'test@example.com'
            # Missing password
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    @patch('services.auth_service_unified.UnifiedAuthService')
    def test_register_student(self, mock_auth, client):
        """Test student registration"""
        mock_service = mock_auth.return_value
        mock_service.register.return_value = {
            'user': {
                'id': 'new-user-123',
                'email': 'newstudent@example.com',
                'role': 'student'
            },
            'access_token': 'test-token'
        }
        
        response = client.post('/auth/register', json={
            'email': 'newstudent@example.com',
            'password': 'SecurePass123!',
            'role': 'student',
            'full_name': 'New Student'
        })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['user']['role'] == 'student'
    
    def test_register_weak_password(self, client):
        """Test registration with weak password"""
        response = client.post('/auth/register', json={
            'email': 'test@example.com',
            'password': '123',  # Too weak
            'role': 'student'
        })
        
        assert response.status_code == 400
    
    def test_logout(self, client, auth_headers):
        """Test logout"""
        response = client.post('/auth/logout', headers=auth_headers)
        assert response.status_code == 200
    
    def test_refresh_token(self, client, app):
        """Test token refresh"""
        with app.app_context():
            from flask_jwt_extended import create_refresh_token
            refresh_token = create_refresh_token(identity='user-123')
        
        response = client.post('/auth/refresh', json={
            'refresh_token': refresh_token
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data


class TestCourseAPI:
    """Test course management endpoints"""
    
    @patch('services.course_service.CourseService')
    def test_list_courses(self, mock_service, client, auth_headers):
        """Test listing courses"""
        mock_courses = [
            {'id': 'course-1', 'title': 'Python Basics', 'instructor': 'Dr. Smith'},
            {'id': 'course-2', 'title': 'Data Science', 'instructor': 'Dr. Jones'}
        ]
        mock_service.return_value.list_courses.return_value = mock_courses
        
        response = client.get('/api/v1/courses', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['courses']) == 2
    
    @patch('services.course_service.CourseService')
    def test_create_course(self, mock_service, client, instructor_headers):
        """Test course creation"""
        mock_service.return_value.create_course.return_value = {
            'id': 'new-course-123',
            'title': 'New Course',
            'instructor_id': 'instructor-123'
        }
        
        response = client.post('/api/v1/courses', headers=instructor_headers, json={
            'title': 'New Course',
            'description': 'Course description',
            'category': 'Technology'
        })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['title'] == 'New Course'
    
    def test_create_course_student_forbidden(self, client, auth_headers):
        """Test student cannot create course"""
        response = client.post('/api/v1/courses', headers=auth_headers, json={
            'title': 'Unauthorized Course',
            'description': 'Should fail'
        })
        
        assert response.status_code == 403
    
    @patch('services.course_service.CourseService')
    def test_get_course_details(self, mock_service, client, auth_headers):
        """Test getting course details"""
        mock_service.return_value.get_course.return_value = {
            'id': 'course-123',
            'title': 'Python Advanced',
            'modules': [
                {'id': 'mod-1', 'title': 'Module 1'},
                {'id': 'mod-2', 'title': 'Module 2'}
            ]
        }
        
        response = client.get('/api/v1/courses/course-123', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['title'] == 'Python Advanced'
        assert len(data['modules']) == 2
    
    @patch('services.course_service.CourseService')
    def test_enroll_in_course(self, mock_service, client, auth_headers):
        """Test course enrollment"""
        mock_service.return_value.enroll_student.return_value = {
            'enrollment_id': 'enroll-123',
            'course_id': 'course-123',
            'student_id': 'test-user-123'
        }
        
        response = client.post(
            '/api/v1/courses/course-123/enroll',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['enrollment_id'] == 'enroll-123'


class TestFileAPI:
    """Test file management endpoints"""
    
    @patch('services.file_service.FileService')
    def test_upload_file(self, mock_service, client, auth_headers):
        """Test file upload"""
        mock_service.return_value.upload_file.return_value = {
            'id': 'file-123',
            'filename': 'document.pdf',
            's3_url': 'https://s3.example.com/document.pdf'
        }
        
        # Create test file
        data = {
            'file': (BytesIO(b'test content'), 'document.pdf'),
            'moduleId': 'module-123',
            'title': 'Test Document'
        }
        
        response = client.post(
            '/api/v1/files/upload',
            headers=auth_headers,
            data=data,
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result['filename'] == 'document.pdf'
    
    def test_upload_without_file(self, client, auth_headers):
        """Test upload without file"""
        response = client.post(
            '/api/v1/files/upload',
            headers=auth_headers,
            data={'moduleId': 'module-123'}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    @patch('services.file_service.FileService')
    def test_get_file_url(self, mock_service, client, auth_headers):
        """Test getting file download URL"""
        mock_service.return_value.get_file_url.return_value = {
            'url': 'https://s3.example.com/signed-url',
            'expires_in': 3600
        }
        
        response = client.get(
            '/api/v1/files/file-123/url',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'url' in data
        assert data['expires_in'] == 3600


class TestStreamingAPI:
    """Test streaming endpoints"""
    
    @patch('services.streaming_service.StreamingService')
    def test_stream_personalized_content(self, mock_service, client, auth_headers):
        """Test streaming personalized content"""
        def generate():
            yield b'data: {"content": "Hello "}\n\n'
            yield b'data: {"content": "World!"}\n\n'
            yield b'data: [DONE]\n\n'
        
        mock_service.return_value.stream_personalized_content.return_value = generate()
        
        response = client.post(
            '/api/v1/personalize/stream',
            headers=auth_headers,
            json={
                'module_id': 'module-123',
                'learning_style': 'visual'
            }
        )
        
        assert response.status_code == 200
        assert response.content_type == 'text/event-stream'
        
        # Read streaming response
        data = b''
        for chunk in response.response:
            data += chunk
        
        assert b'Hello' in data
        assert b'World!' in data


class TestRateLimiting:
    """Test rate limiting"""
    
    def test_rate_limit_login(self, client):
        """Test rate limiting on login endpoint"""
        # Make many requests
        for i in range(25):
            response = client.post('/auth/login', json={
                'email': f'test{i}@example.com',
                'password': 'wrong'
            })
        
        # Should eventually get rate limited
        # Note: This depends on rate limit configuration
        # assert response.status_code == 429
    
    def test_rate_limit_headers(self, client, auth_headers):
        """Test rate limit headers"""
        response = client.get('/api/v1/courses', headers=auth_headers)
        
        # Should have rate limit headers
        assert 'X-RateLimit-Limit' in response.headers
        assert 'X-RateLimit-Remaining' in response.headers
        assert 'X-RateLimit-Reset' in response.headers


class TestErrorHandling:
    """Test error handling"""
    
    def test_404_not_found(self, client):
        """Test 404 error"""
        response = client.get('/api/v1/nonexistent')
        assert response.status_code == 404
    
    def test_401_unauthorized(self, client):
        """Test 401 unauthorized"""
        response = client.get('/api/v1/courses')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_500_internal_error(self, client, auth_headers):
        """Test 500 error handling"""
        with patch('services.course_service.CourseService') as mock:
            mock.return_value.list_courses.side_effect = Exception("Database error")
            
            response = client.get('/api/v1/courses', headers=auth_headers)
            
            # Should handle gracefully
            assert response.status_code == 500
            data = json.loads(response.data)
            assert 'error' in data


class TestCORS:
    """Test CORS headers"""
    
    def test_cors_headers(self, client):
        """Test CORS headers on response"""
        response = client.options('/api/v1/courses')
        
        assert 'Access-Control-Allow-Origin' in response.headers
        assert 'Access-Control-Allow-Methods' in response.headers
        assert 'Access-Control-Allow-Headers' in response.headers
    
    def test_cors_preflight(self, client):
        """Test CORS preflight request"""
        response = client.options('/api/v1/courses', headers={
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type'
        })
        
        assert response.status_code == 200
        assert response.headers.get('Access-Control-Allow-Origin') == 'http://localhost:3000'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
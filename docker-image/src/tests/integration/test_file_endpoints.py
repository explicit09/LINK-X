import pytest
from unittest.mock import patch, Mock
import io
import json
from werkzeug.datastructures import FileStorage

from app import create_app
from core.database_supabase import db


@pytest.fixture
def app():
    """Create test app"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Create auth headers with mocked Firebase verification"""
    with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
        mock_verify.return_value = {
            'uid': 'test_user_123',
            'email': 'test@example.com'
        }
        return {'Authorization': 'Bearer fake-token'}


@pytest.fixture
def instructor_user(client):
    """Create instructor user"""
    with patch('services.auth_service_unified.AuthService.get_current_user') as mock:
        mock.return_value = {
            'id': 'test_user_123',
            'email': 'instructor@example.com',
            'role': 'instructor',
            'firebase_uid': 'test_user_123'
        }
        yield mock.return_value


@pytest.fixture
def student_user(client):
    """Create student user"""
    with patch('services.auth_service_unified.AuthService.get_current_user') as mock:
        mock.return_value = {
            'id': 'student_123',
            'email': 'student@example.com',
            'role': 'student',
            'firebase_uid': 'student_123'
        }
        yield mock.return_value


@pytest.fixture
def test_course(instructor_user):
    """Create test course"""
    return {
        'id': 'course_123',
        'title': 'Test Course',
        'instructor_id': instructor_user['id'],
        'is_published': True
    }


@pytest.fixture
def test_module(test_course):
    """Create test module"""
    return {
        'id': 'module_123',
        'title': 'Test Module',
        'course_id': test_course['id'],
        'order_index': 1
    }


class TestFileEndpoints:
    """Test cases for file-related endpoints"""
    
    def test_upload_file_success(self, client, auth_headers, instructor_user, test_course, test_module):
        """Test successful file upload"""
        with patch('services.file_service.FileService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.upload_file.return_value = {
                'id': 'file_123',
                'filename': 'test.pdf',
                's3_url': 's3://bucket/test.pdf',
                'size': 1024,
                'mime_type': 'application/pdf'
            }
            
            # Create file
            data = {
                'file': (io.BytesIO(b'test content'), 'test.pdf'),
                'course_id': test_course['id'],
                'module_id': test_module['id']
            }
            
            # Make request
            response = client.post(
                '/api/v1/files/upload',
                headers=auth_headers,
                data=data,
                content_type='multipart/form-data'
            )
            
            # Assert
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['filename'] == 'test.pdf'
            assert 'id' in data
    
    def test_upload_file_missing_file(self, client, auth_headers):
        """Test file upload without file"""
        response = client.post(
            '/api/v1/files/upload',
            headers=auth_headers,
            data={'course_id': 'course_123'}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_upload_file_unauthorized(self, client):
        """Test file upload without authentication"""
        data = {
            'file': (io.BytesIO(b'test'), 'test.pdf'),
            'course_id': 'course_123'
        }
        
        response = client.post(
            '/api/v1/files/upload',
            data=data,
            content_type='multipart/form-data'
        )
        
        assert response.status_code == 401
    
    def test_get_file_success(self, client, auth_headers, instructor_user):
        """Test successful file retrieval"""
        with patch('services.file_service.FileService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.get_file.return_value = {
                'id': 'file_123',
                'filename': 'test.pdf',
                's3_url': 's3://bucket/test.pdf',
                'user_id': instructor_user['id']
            }
            
            # Make request
            response = client.get(
                '/api/v1/files/file_123',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['id'] == 'file_123'
            assert data['filename'] == 'test.pdf'
    
    def test_get_file_not_found(self, client, auth_headers):
        """Test file retrieval when file doesn't exist"""
        with patch('services.file_service.FileService') as mock_service:
            from core.exceptions import ResourceNotFoundError
            mock_instance = mock_service.return_value
            mock_instance.get_file.side_effect = ResourceNotFoundError("File not found")
            
            response = client.get(
                '/api/v1/files/nonexistent',
                headers=auth_headers
            )
            
            assert response.status_code == 404
    
    def test_delete_file_success(self, client, auth_headers):
        """Test successful file deletion"""
        with patch('services.file_service.FileService') as mock_service:
            mock_instance = mock_service.return_value
            mock_instance.delete_file.return_value = None
            
            response = client.delete(
                '/api/v1/files/file_123',
                headers=auth_headers
            )
            
            assert response.status_code == 204
    
    def test_delete_file_unauthorized(self, client, auth_headers):
        """Test file deletion by unauthorized user"""
        with patch('services.file_service.FileService') as mock_service:
            from core.exceptions import AuthorizationError
            mock_instance = mock_service.return_value
            mock_instance.delete_file.side_effect = AuthorizationError("Not authorized")
            
            response = client.delete(
                '/api/v1/files/file_123',
                headers=auth_headers
            )
            
            assert response.status_code == 403
    
    def test_list_course_files(self, client, auth_headers, test_course):
        """Test listing files for a course"""
        with patch('services.file_service.FileService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.list_course_files.return_value = [
                {
                    'id': 'file_1',
                    'filename': 'lecture1.pdf',
                    'size': 1024
                },
                {
                    'id': 'file_2',
                    'filename': 'lecture2.pdf',
                    'size': 2048
                }
            ]
            
            # Make request
            response = client.get(
                f'/api/v1/files/course/{test_course["id"]}',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert len(data) == 2
            assert data[0]['filename'] == 'lecture1.pdf'
    
    def test_download_file(self, client, auth_headers):
        """Test file download URL generation"""
        with patch('services.file_service.FileService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.get_file_download_url.return_value = 'https://signed-url.com'
            
            # Make request
            response = client.get(
                '/api/v1/files/file_123/download',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['download_url'] == 'https://signed-url.com'
    
    def test_upload_file_size_limit(self, client, auth_headers, test_course):
        """Test file upload size limit"""
        with patch('services.file_service.FileService') as mock_service:
            from core.exceptions import ValidationError
            mock_instance = mock_service.return_value
            mock_instance.upload_file.side_effect = ValidationError("File too large")
            
            # Create large file
            data = {
                'file': (io.BytesIO(b'x' * 1000), 'large.pdf'),
                'course_id': test_course['id']
            }
            
            # Make request
            response = client.post(
                '/api/v1/files/upload',
                headers=auth_headers,
                data=data,
                content_type='multipart/form-data'
            )
            
            # Assert
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'File too large' in data['error']
    
    def test_process_file_for_embeddings(self, client, auth_headers):
        """Test triggering file processing for embeddings"""
        with patch('services.file_service.FileService') as mock_service:
            mock_instance = mock_service.return_value
            mock_instance.process_file_for_embeddings.return_value = {
                'task_id': 'task_123',
                'status': 'processing'
            }
            
            response = client.post(
                '/api/v1/files/file_123/process',
                headers=auth_headers
            )
            
            assert response.status_code == 202
            data = json.loads(response.data)
            assert data['status'] == 'processing'
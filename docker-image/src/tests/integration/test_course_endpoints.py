"""
Integration tests for course endpoints
"""
import pytest
import json
from flask.testing import FlaskClient
from unittest.mock import patch

from src.db.schema import Course, Module, Enrollment, AccessCode

class TestCourseEndpoints:
    """Integration tests for course endpoints"""
    
    @pytest.fixture
    def instructor_headers(self, client: FlaskClient, test_instructor: dict) -> dict:
        """Create authenticated instructor headers"""
        import jwt
        
        token = jwt.encode(
            {'uid': test_instructor['firebase_uid'], 'email': test_instructor['email']},
            'test-secret',
            algorithm='HS256'
        )
        
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def test_list_courses_as_student(self, client: FlaskClient, auth_headers: dict, test_course: dict, db_session):
        """Test listing courses as a student"""
        # Create enrollment
        enrollment = Enrollment(
            user_id=auth_headers['user_id'],
            course_id=test_course['id']
        )
        db_session.add(enrollment)
        db_session.commit()
        
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'test-firebase-uid'}
            
            # Act
            response = client.get('/api/v1/courses', headers=auth_headers)
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert 'courses' in data
        assert len(data['courses']) > 0
        assert data['courses'][0]['id'] == test_course['id']
    
    def test_list_courses_as_instructor(self, client: FlaskClient, instructor_headers: dict, test_course: dict):
        """Test listing courses as an instructor"""
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'instructor-firebase-uid'}
            
            # Act
            response = client.get('/api/v1/courses', headers=instructor_headers)
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert 'courses' in data
        courses = [c for c in data['courses'] if c['id'] == test_course['id']]
        assert len(courses) == 1
    
    def test_get_course_details(self, client: FlaskClient, auth_headers: dict, test_course: dict, db_session):
        """Test getting course details"""
        # Create enrollment for access
        enrollment = Enrollment(
            user_id=auth_headers['user_id'],
            course_id=test_course['id']
        )
        db_session.add(enrollment)
        db_session.commit()
        
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'test-firebase-uid'}
            
            # Act
            response = client.get(f'/api/v1/courses/{test_course["id"]}', headers=auth_headers)
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['course']['id'] == test_course['id']
        assert data['course']['title'] == test_course['title']
    
    def test_get_course_access_denied(self, client: FlaskClient, auth_headers: dict, test_course: dict):
        """Test getting course without access"""
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'test-firebase-uid'}
            
            # Act (no enrollment, so should be denied)
            response = client.get(f'/api/v1/courses/{test_course["id"]}', headers=auth_headers)
        
        # Assert
        assert response.status_code == 403
        data = response.get_json()
        assert data['error'] == 'Access denied'
    
    def test_create_course_as_instructor(self, client: FlaskClient, instructor_headers: dict):
        """Test creating a course as instructor"""
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'instructor-firebase-uid'}
            
            # Act
            course_data = {
                'title': 'New Test Course',
                'description': 'This is a comprehensive test course for integration testing',
                'category': 'Programming',
                'tags': ['python', 'testing']
            }
            response = client.post('/api/v1/courses', headers=instructor_headers, json=course_data)
        
        # Assert
        assert response.status_code == 201
        data = response.get_json()
        assert data['message'] == 'Course created successfully'
        assert data['course']['title'] == 'New Test Course'
        assert data['course']['published'] == False
    
    def test_create_course_as_student_forbidden(self, client: FlaskClient, auth_headers: dict):
        """Test student cannot create course"""
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'test-firebase-uid'}
            
            # Act
            course_data = {
                'title': 'Unauthorized Course',
                'description': 'This should not be created'
            }
            response = client.post('/api/v1/courses', headers=auth_headers, json=course_data)
        
        # Assert
        assert response.status_code == 403
        data = response.get_json()
        assert 'Insufficient permissions' in data['error']
    
    def test_update_course(self, client: FlaskClient, instructor_headers: dict, test_course: dict):
        """Test updating a course"""
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'instructor-firebase-uid'}
            
            # Act
            update_data = {
                'title': 'Updated Course Title',
                'description': 'Updated course description with more details'
            }
            response = client.patch(
                f'/api/v1/courses/{test_course["id"]}',
                headers=instructor_headers,
                json=update_data
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['course']['title'] == 'Updated Course Title'
    
    def test_publish_course(self, client: FlaskClient, instructor_headers: dict, test_course: dict, test_module: dict, db_session):
        """Test publishing a course"""
        # Add a file to the module so it can be published
        from ...db.schema import File
        file = File(
            module_id=test_module['id'],
            title='Test File',
            filename='test.pdf',
            file_type='pdf'
        )
        db_session.add(file)
        db_session.commit()
        
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'instructor-firebase-uid'}
            
            # Act
            response = client.post(
                f'/api/v1/courses/{test_course["id"]}/publish',
                headers=instructor_headers
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Course published successfully'
        assert data['course']['published'] == True
    
    def test_create_module(self, client: FlaskClient, instructor_headers: dict, test_course: dict):
        """Test creating a module in a course"""
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'instructor-firebase-uid'}
            
            # Act
            module_data = {
                'title': 'New Module',
                'description': 'Module description'
            }
            response = client.post(
                f'/api/v1/courses/{test_course["id"]}/modules',
                headers=instructor_headers,
                json=module_data
            )
        
        # Assert
        assert response.status_code == 201
        data = response.get_json()
        assert data['message'] == 'Module created successfully'
        assert data['module']['title'] == 'New Module'
    
    def test_enroll_in_course(self, client: FlaskClient, auth_headers: dict, test_course: dict, db_session):
        """Test enrolling in a course with access code"""
        # Create access code
        access_code = AccessCode(
            course_id=test_course['id'],
            code='TESTCODE123'
        )
        db_session.add(access_code)
        db_session.commit()
        
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'test-firebase-uid'}
            
            # Act
            response = client.post(
                f'/api/v1/courses/{test_course["id"]}/enroll',
                headers=auth_headers,
                json={'accessCode': 'TESTCODE123'}
            )
        
        # Assert
        assert response.status_code == 201
        data = response.get_json()
        assert data['message'] == 'Successfully enrolled in course'
    
    def test_get_course_stats(self, client: FlaskClient, instructor_headers: dict, test_course: dict):
        """Test getting course statistics"""
        # Mock Firebase auth
        with patch('src.core.decorators.firebase_auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {'uid': 'instructor-firebase-uid'}
            
            # Act
            response = client.get(
                f'/api/v1/courses/{test_course["id"]}/stats',
                headers=instructor_headers
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert 'stats' in data
        assert 'total_students' in data['stats']
        assert 'total_modules' in data['stats']
        assert 'total_files' in data['stats']
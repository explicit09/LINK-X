"""
Unified Test Configuration
Combines functionality from both legacy and modern test setups
"""

import os
import sys
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import tempfile
import shutil

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from flask import Flask
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from dependency_injector import providers

from app import create_app
from db.schema import Base, User, Role, Course, Module, File, Enrollment, Todo
from src.core.dependencies import Container, get_container
from src.core.settings import TestingSettings


# Test constants
TEST_USER_ID = "test-user-123"
TEST_INSTRUCTOR_ID = "test-instructor-456"
TEST_ADMIN_ID = "test-admin-789"
TEST_COURSE_ID = "test-course-001"
TEST_MODULE_ID = "test-module-001"
TEST_FILE_ID = "test-file-001"


@pytest.fixture(scope="session")
def test_settings():
    """Test environment settings"""
    return TestingSettings()


@pytest.fixture(scope="session")
def temp_upload_dir():
    """Create temporary upload directory for tests"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Cleanup after tests
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(scope="session")
def test_database_url(test_settings):
    """Create test database URL"""
    # Use SQLite for tests
    return "sqlite:///:memory:"


@pytest.fixture(scope="session")
def test_engine(test_database_url):
    """Create test database engine"""
    engine = create_engine(
        test_database_url,
        connect_args={"check_same_thread": False}  # SQLite specific
    )
    return engine


@pytest.fixture(scope="session")
def tables(test_engine):
    """Create all tables for testing"""
    Base.metadata.create_all(test_engine)
    yield
    Base.metadata.drop_all(test_engine)


@pytest.fixture(scope="function")
def db_session(test_engine, tables):
    """Create a new database session for each test"""
    connection = test_engine.connect()
    transaction = connection.begin()
    
    # Configure session
    Session = scoped_session(
        sessionmaker(bind=connection, autocommit=False, autoflush=False)
    )
    
    yield Session()
    
    # Rollback and cleanup
    Session.remove()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def test_container(test_settings, db_session, mock_redis, mock_firebase):
    """Create test dependency injection container"""
    container = Container()
    
    # Override providers for testing
    container.config.from_dict({
        'database_url': str(test_settings.database_url),
        'redis_url': str(test_settings.redis_url),
        'debug': True,
        'testing': True,
        'firebase_credentials_path': 'test-firebase.json',
        's3_bucket_name': 'test-bucket',
        'openai_api_key': 'test-key'
    })
    
    # Override specific providers
    container.session_factory.override(providers.Object(lambda: db_session))
    container.redis_client.override(providers.Object(mock_redis))
    container.firebase_app.override(providers.Object(mock_firebase))
    
    yield container
    
    # Reset overrides
    container.unwire()


@pytest.fixture(scope="function")
def app(test_container, temp_upload_dir):
    """Create Flask app for testing"""
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['UPLOAD_FOLDER'] = temp_upload_dir
    
    app = create_app('testing')
    
    # Configure app for testing
    app.config.update({
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,
        'UPLOAD_FOLDER': temp_upload_dir,
        'MAX_CONTENT_LENGTH': 10 * 1024 * 1024  # 10MB for tests
    })
    
    # Initialize container with app
    test_container.wire(modules=[
        "api.auth_unified",
        "api.courses",
        "api.files",
        "api.modules",
        "api.admin",
        "api.streaming",
    ])
    
    # Store container in app
    app.container = test_container
    
    with app.app_context():
        yield app


@pytest.fixture(scope="function")
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope="function")
def runner(app):
    """Create test CLI runner"""
    return app.test_cli_runner()


# Mock fixtures

@pytest.fixture(scope="function")
def mock_redis():
    """Mock Redis client"""
    mock = MagicMock()
    mock.get.return_value = None
    mock.set.return_value = True
    mock.setex.return_value = True
    mock.delete.return_value = 1
    mock.exists.return_value = False
    mock.scan.return_value = (0, [])
    return mock


@pytest.fixture(scope="function")
def mock_firebase():
    """Mock Firebase app"""
    with patch('firebase_admin.initialize_app') as mock_init:
        mock_app = MagicMock()
        mock_init.return_value = mock_app
        
        # Mock auth functions
        with patch('firebase_admin.auth.verify_id_token') as mock_verify:
            mock_verify.return_value = {
                'uid': 'test-firebase-uid',
                'email': 'test@example.com'
            }
            yield mock_app


@pytest.fixture(scope="function")
def mock_openai():
    """Mock OpenAI client"""
    mock = MagicMock()
    mock.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="Test response"))]
    )
    mock.embeddings.create.return_value = MagicMock(
        data=[MagicMock(embedding=[0.1] * 1536)]
    )
    return mock


@pytest.fixture(scope="function")
def mock_s3():
    """Mock S3 client"""
    mock = MagicMock()
    mock.upload_fileobj.return_value = None
    mock.download_fileobj.return_value = None
    mock.delete_object.return_value = None
    mock.head_object.return_value = {'ContentLength': 1000}
    return mock


# Data fixtures

@pytest.fixture(scope="function")
def test_roles(db_session):
    """Create test roles"""
    roles = {
        'student': Role(role_type='student'),
        'instructor': Role(role_type='instructor'),
        'admin': Role(role_type='admin')
    }
    
    for role in roles.values():
        db_session.add(role)
    db_session.commit()
    
    return roles


@pytest.fixture(scope="function")
def test_users(db_session, test_roles):
    """Create test users"""
    users = {
        'student': User(
            user_id=TEST_USER_ID,
            email='student@test.com',
            firebase_uid='firebase-student-123',
            role=test_roles['student'],
            name='Test Student',
            created_at=datetime.utcnow()
        ),
        'instructor': User(
            user_id=TEST_INSTRUCTOR_ID,
            email='instructor@test.com',
            firebase_uid='firebase-instructor-456',
            role=test_roles['instructor'],
            name='Test Instructor',
            created_at=datetime.utcnow()
        ),
        'admin': User(
            user_id=TEST_ADMIN_ID,
            email='admin@test.com',
            firebase_uid='firebase-admin-789',
            role=test_roles['admin'],
            name='Test Admin',
            created_at=datetime.utcnow()
        )
    }
    
    for user in users.values():
        db_session.add(user)
    db_session.commit()
    
    return users


@pytest.fixture(scope="function")
def test_course(db_session, test_users):
    """Create test course"""
    course = Course(
        course_id=TEST_COURSE_ID,
        title='Test Course',
        description='Test course description',
        instructor_id=test_users['instructor'].user_id,
        access_code='TEST123',
        published=True,
        created_at=datetime.utcnow()
    )
    db_session.add(course)
    db_session.commit()
    return course


@pytest.fixture(scope="function")
def test_module(db_session, test_course):
    """Create test module"""
    module = Module(
        module_id=TEST_MODULE_ID,
        course_id=test_course.course_id,
        name='Test Module',
        description='Test module description',
        order=1,
        created_at=datetime.utcnow()
    )
    db_session.add(module)
    db_session.commit()
    return module


@pytest.fixture(scope="function")
def test_enrollment(db_session, test_users, test_course):
    """Create test enrollment"""
    enrollment = Enrollment(
        student_id=test_users['student'].user_id,
        course_id=test_course.course_id,
        enrolled_at=datetime.utcnow()
    )
    db_session.add(enrollment)
    db_session.commit()
    return enrollment


@pytest.fixture(scope="function")
def auth_headers():
    """Generate auth headers for different users"""
    def _make_headers(user_type='student', token=None):
        if not token:
            # Generate a test token based on user type
            tokens = {
                'student': 'test-student-token',
                'instructor': 'test-instructor-token', 
                'admin': 'test-admin-token'
            }
            token = tokens.get(user_type, 'test-token')
            
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    return _make_headers


@pytest.fixture(scope="function")
def mock_jwt_identity():
    """Mock JWT identity for testing"""
    with patch('flask_jwt_extended.get_jwt_identity') as mock:
        mock.return_value = TEST_USER_ID
        yield mock


@pytest.fixture(scope="function")
def mock_celery_task():
    """Mock Celery task for testing"""
    def _mock_task(name):
        mock = MagicMock()
        mock.delay.return_value = MagicMock(id='test-task-id')
        mock.apply_async.return_value = MagicMock(id='test-task-id')
        return mock
    
    return _mock_task


# Helper fixtures

@pytest.fixture(scope="function")
def api_client(client, auth_headers):
    """API client with auth helpers"""
    class APIClient:
        def __init__(self, client, auth_headers):
            self.client = client
            self.auth_headers = auth_headers
            
        def get(self, url, user_type='student', **kwargs):
            headers = self.auth_headers(user_type)
            return self.client.get(url, headers=headers, **kwargs)
            
        def post(self, url, json=None, user_type='student', **kwargs):
            headers = self.auth_headers(user_type)
            return self.client.post(url, json=json, headers=headers, **kwargs)
            
        def put(self, url, json=None, user_type='student', **kwargs):
            headers = self.auth_headers(user_type)
            return self.client.put(url, json=json, headers=headers, **kwargs)
            
        def delete(self, url, user_type='student', **kwargs):
            headers = self.auth_headers(user_type)
            return self.client.delete(url, headers=headers, **kwargs)
    
    return APIClient(client, auth_headers)


@pytest.fixture(autouse=True)
def reset_database(db_session):
    """Reset database state between tests"""
    yield
    # Cleanup is handled by transaction rollback in db_session fixture


@pytest.fixture(scope="function")
def capture_logs():
    """Capture log messages during tests"""
    import logging
    from io import StringIO
    
    log_capture = StringIO()
    handler = logging.StreamHandler(log_capture)
    handler.setLevel(logging.DEBUG)
    
    # Add handler to root logger
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    
    yield log_capture
    
    # Remove handler
    root_logger.removeHandler(handler)
"""
Pytest configuration and fixtures for testing
"""
import pytest
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from flask import Flask
from flask.testing import FlaskClient

# Set testing environment
os.environ['FLASK_ENV'] = 'testing'

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src import create_app
from src.db.schema import Base, User, Role, StudentProfile, InstructorProfile, Course, Module, File
from src.core.database import db

@pytest.fixture(scope='session')
def app() -> Flask:
    """Create application for testing"""
    app = create_app('testing')
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    yield app
    
    # Clean up
    with app.app_context():
        db.drop_all()

@pytest.fixture(scope='function')
def client(app: Flask) -> FlaskClient:
    """Create test client"""
    return app.test_client()

@pytest.fixture(scope='function')
def db_session(app: Flask) -> Generator[Session, None, None]:
    """Create a clean database session for testing"""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        
        # Configure session
        session_factory = sessionmaker(bind=connection)
        session = session_factory()
        
        # Make session available to app
        db.session = session
        
        yield session
        
        # Rollback and cleanup
        session.close()
        transaction.rollback()
        connection.close()

@pytest.fixture
def auth_headers(client: FlaskClient, test_user: dict) -> dict:
    """Create authenticated headers"""
    # Mock Firebase authentication
    import jwt
    
    # Create a mock Firebase token
    token = jwt.encode(
        {'uid': test_user['firebase_uid'], 'email': test_user['email']},
        'test-secret',
        algorithm='HS256'
    )
    
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def test_user(db_session: Session) -> dict:
    """Create test user"""
    from werkzeug.security import generate_password_hash
    
    user = User(
        email='test@example.com',
        password_hash=generate_password_hash('password123'),
        firebase_uid='test-firebase-uid',
        role=Role.STUDENT
    )
    db_session.add(user)
    db_session.commit()
    
    # Create profile
    profile = StudentProfile(
        user_id=user.id,
        name='Test Student',
        learning_style='visual'
    )
    db_session.add(profile)
    db_session.commit()
    
    return {
        'id': str(user.id),
        'email': user.email,
        'firebase_uid': user.firebase_uid,
        'role': 'student',
        'password': 'password123'
    }

@pytest.fixture
def test_instructor(db_session: Session) -> dict:
    """Create test instructor"""
    from werkzeug.security import generate_password_hash
    
    user = User(
        email='instructor@example.com',
        password_hash=generate_password_hash('password123'),
        firebase_uid='instructor-firebase-uid',
        role=Role.INSTRUCTOR
    )
    db_session.add(user)
    db_session.commit()
    
    # Create profile
    profile = InstructorProfile(
        user_id=user.id,
        name='Test Instructor',
        university='Test University'
    )
    db_session.add(profile)
    db_session.commit()
    
    return {
        'id': str(user.id),
        'email': user.email,
        'firebase_uid': user.firebase_uid,
        'role': 'instructor',
        'password': 'password123'
    }

@pytest.fixture
def test_course(db_session: Session, test_instructor: dict) -> dict:
    """Create test course"""
    course = Course(
        title='Test Course',
        description='Test course description',
        instructor_id=test_instructor['id'],
        published=True
    )
    db_session.add(course)
    db_session.commit()
    
    return {
        'id': str(course.id),
        'title': course.title,
        'description': course.description,
        'instructor_id': course.instructor_id
    }

@pytest.fixture
def test_module(db_session: Session, test_course: dict) -> dict:
    """Create test module"""
    module = Module(
        course_id=test_course['id'],
        title='Test Module',
        description='Test module description',
        ordering=1
    )
    db_session.add(module)
    db_session.commit()
    
    return {
        'id': str(module.id),
        'course_id': module.course_id,
        'title': module.title
    }

@pytest.fixture
def mock_s3(monkeypatch):
    """Mock S3 operations"""
    class MockS3Client:
        def upload_fileobj(self, file, bucket, key, **kwargs):
            return {'ETag': 'mock-etag'}
        
        def delete_object(self, Bucket, Key):
            return {'DeleteMarker': True}
        
        def generate_presigned_url(self, operation, Params, ExpiresIn):
            return 'https://mock-s3-url.com/file'
    
    def mock_boto3_client(*args, **kwargs):
        return MockS3Client()
    
    monkeypatch.setattr('boto3.client', mock_boto3_client)
    return MockS3Client()

@pytest.fixture
def mock_openai(monkeypatch):
    """Mock OpenAI API calls"""
    class MockCompletion:
        def __init__(self, content):
            self.choices = [type('obj', (object,), {
                'message': type('obj', (object,), {'content': content})
            })]
    
    class MockOpenAI:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return MockCompletion('{"result": "mock response"}')
        
        class embeddings:
            @staticmethod
            def create(**kwargs):
                return type('obj', (object,), {
                    'data': [type('obj', (object,), {'embedding': [0.1] * 1536})]
                })
    
    def mock_openai_client(*args, **kwargs):
        return MockOpenAI()
    
    monkeypatch.setattr('openai.OpenAI', mock_openai_client)
    return MockOpenAI()
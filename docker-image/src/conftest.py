"""
Simplified Test Configuration
"""
import os
import sys
import pytest
from unittest.mock import Mock, MagicMock

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

# Mock Firebase at import time to prevent initialization errors
sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.auth'] = MagicMock()
sys.modules['firebase_admin.credentials'] = MagicMock()

@pytest.fixture
def app():
    """Create test Flask app"""
    from flask import Flask
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    return app

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def mock_user():
    """Create mock user"""
    user = Mock()
    user.id = 'test-user-123'
    user.email = 'test@example.com'
    user.role = 'student'
    user.is_active = True
    return user

@pytest.fixture
def auth_headers():
    """Create auth headers for requests"""
    return {'Authorization': 'Bearer test-token'}

@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    redis = Mock()
    redis.get.return_value = None
    redis.set.return_value = True
    redis.exists.return_value = 0
    return redis
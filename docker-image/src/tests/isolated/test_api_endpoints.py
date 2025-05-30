"""
Test API endpoints are accessible
"""
import pytest
from app import create_app


@pytest.fixture
def client():
    """Create test client"""
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        yield client


def test_health_endpoint(client):
    """Test health endpoint"""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'
    
    # Also test /api/health
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'


def test_circuit_breaker_endpoint(client):
    """Test circuit breaker monitoring endpoint"""
    response = client.get('/api/circuit-breakers/status')
    assert response.status_code == 200
    data = response.get_json()
    assert 'healthy' in data
    assert 'circuit_breakers' in data
    assert 'total' in data


def test_v2_endpoints_exist(client):
    """Test that v2 endpoints are registered"""
    # Test courses endpoint (should return 401 without auth)
    response = client.get('/api/v2/courses')
    assert response.status_code in [401, 403]  # Unauthorized is expected
    
    # Test that v1 endpoints also exist for compatibility
    response = client.get('/api/v1/courses')
    assert response.status_code in [401, 403]  # Unauthorized is expected


def test_auth_endpoints_exist(client):
    """Test that auth endpoints exist"""
    # Test login endpoint with bad credentials
    response = client.post('/auth/login', json={
        'email': 'test@example.com',
        'password': 'wrongpassword'
    })
    # Should get 401 or 400 for bad credentials
    assert response.status_code in [400, 401]
    
    # Test register endpoint with incomplete data
    response = client.post('/auth/register', json={
        'email': 'test@example.com'
    })
    # Should get 400 for missing fields
    assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
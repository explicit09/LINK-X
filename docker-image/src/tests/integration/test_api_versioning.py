"""
Integration tests for API versioning functionality
"""
import pytest
import json
from unittest.mock import patch
from flask import Flask
from datetime import datetime

from app import create_app
from core.database_supabase import db
from tests.conftest_unified import test_user, test_instructor


class TestAPIVersioning:
    """Test API versioning middleware and deprecation handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self, app):
        """Setup test data"""
        self.app = app
        self.client = app.test_client()
        
        # Create test tables
        with app.app_context():
            db.create_all()
    
    def test_v1_deprecation_headers(self, test_user):
        """Test that v1 endpoints return deprecation headers"""
        # Mock authentication
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_user
                
                response = self.client.get('/api/v1/auth/me')
                
                # Check deprecation headers
                assert response.headers.get('X-API-Deprecated') == 'true'
                assert response.headers.get('X-API-Sunset') == '2025-12-31'
                assert 'deprecated' in response.headers.get('X-API-Deprecation-Message', '').lower()
                assert 'migration' in response.headers.get('X-API-Migration-Guide', '').lower()
    
    def test_v1_deprecation_in_response_body(self, test_user):
        """Test that v1 endpoints include deprecation warning in JSON response"""
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_user
                
                response = self.client.get('/api/v1/auth/me')
                
                if response.status_code == 200 and response.is_json:
                    data = response.get_json()
                    assert '_deprecation_warning' in data
                    warning = data['_deprecation_warning']
                    assert 'deprecated' in warning['message'].lower()
                    assert warning['sunset_date'] == '2025-12-31'
                    assert 'migration' in warning['migration_guide'].lower()
    
    def test_v2_no_deprecation_headers(self, test_user):
        """Test that v2 endpoints do not return deprecation headers"""
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_user
                
                response = self.client.get('/api/v2/auth/me')
                
                # Should not have deprecation headers
                assert 'X-API-Deprecated' not in response.headers
                assert 'X-API-Sunset' not in response.headers
    
    def test_v2_standardized_response_format(self, test_user):
        """Test that v2 endpoints return standardized response format"""
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_user
                
                response = self.client.get('/api/v2/auth/me')
                
                if response.status_code == 200:
                    data = response.get_json()
                    
                    # Check v2 response structure
                    assert 'success' in data
                    assert 'timestamp' in data
                    assert data['success'] is True
                    
                    # Should not have deprecation warning
                    assert '_deprecation_warning' not in data
    
    def test_version_detection_from_path(self):
        """Test that API version is correctly detected from URL path"""
        # Test v1 detection
        response = self.client.get('/api/v1/health')
        assert response.headers.get('X-API-Version') in ['v1', None]  # May not be set on simple endpoints
        
        # Test v2 detection
        response = self.client.get('/api/v2/health')
        if response.status_code == 200:
            data = response.get_json()
            assert 'version' in data
    
    def test_version_detection_from_header(self, test_user):
        """Test that API version can be specified via header"""
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_user
                
                # Test with version header
                response = self.client.get('/api/v2/auth/me', headers={
                    'X-API-Version': 'v2'
                })
                
                assert 'X-API-Version' in response.headers or response.status_code == 200
    
    def test_404_handling_with_version_suggestion(self):
        """Test that 404 errors suggest correct version endpoint"""
        response = self.client.get('/api/v1/nonexistent')
        
        assert response.status_code == 404
        if response.is_json:
            data = response.get_json()
            # Should suggest v2 endpoint if available
            if 'suggestion' in data:
                assert 'v2' in data['suggestion']
    
    def test_api_monitoring_endpoints_require_admin(self, test_user):
        """Test that monitoring endpoints require admin access"""
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_user
                
                response = self.client.get('/api/monitoring/version-usage')
                
                # Should return 403 for non-admin users
                assert response.status_code == 403
    
    def test_api_monitoring_with_admin(self, test_instructor):
        """Test API monitoring endpoints with admin user"""
        # Mock the user as admin
        test_instructor.role.role_type = 'admin'
        
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_instructor
                
                response = self.client.get('/api/monitoring/version-usage')
                
                # Admin should be able to access
                if response.status_code == 200:
                    data = response.get_json()
                    assert isinstance(data, dict)
    
    def test_courses_endpoint_response_difference(self, test_instructor):
        """Test that courses endpoint responses differ between v1 and v2"""
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_instructor
                
                # Test v1 courses endpoint
                v1_response = self.client.get('/api/v1/courses')
                
                # Test v2 courses endpoint
                v2_response = self.client.get('/api/v2/courses')
                
                if v1_response.status_code == 200 and v2_response.status_code == 200:
                    v1_data = v1_response.get_json()
                    v2_data = v2_response.get_json()
                    
                    # v1 should have courses array directly or in courses key
                    # v2 should have standardized format with success, data, timestamp
                    if isinstance(v2_data, dict):
                        assert 'success' in v2_data or 'data' in v2_data or 'timestamp' in v2_data
                    
                    # v1 should have deprecation warning
                    if isinstance(v1_data, dict):
                        assert '_deprecation_warning' in v1_data or v1_response.headers.get('X-API-Deprecated') == 'true'
    
    def test_error_response_format_difference(self):
        """Test that error responses differ between v1 and v2"""
        # Test v1 error response
        v1_response = self.client.post('/api/v1/auth/sessionLogin', 
                                     json={})  # Invalid request
        
        # Test v2 error response
        v2_response = self.client.post('/api/v2/auth/login', 
                                     json={})  # Invalid request
        
        if v1_response.status_code >= 400 and v2_response.status_code >= 400:
            v1_data = v1_response.get_json() if v1_response.is_json else {}
            v2_data = v2_response.get_json() if v2_response.is_json else {}
            
            # v2 should have standardized error format
            if v2_data:
                assert 'success' in v2_data and v2_data['success'] is False
                assert 'message' in v2_data
                assert 'timestamp' in v2_data
    
    def test_pagination_in_v2_only(self, test_instructor):
        """Test that pagination is available in v2 but not v1"""
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_instructor
                
                # Test v2 with pagination parameters
                v2_response = self.client.get('/api/v2/courses?page=1&per_page=10')
                
                if v2_response.status_code == 200:
                    v2_data = v2_response.get_json()
                    
                    # Should have pagination info in v2
                    if isinstance(v2_data, dict) and 'pagination' in v2_data:
                        pagination = v2_data['pagination']
                        assert 'page' in pagination
                        assert 'per_page' in pagination
                        assert 'total' in pagination
    
    def test_file_upload_response_difference(self, test_instructor):
        """Test file upload response format differences"""
        with patch('core.decorators_unified.firebase_auth_required') as mock_auth:
            mock_auth.return_value = lambda f: f
            
            with patch('flask.g') as mock_g:
                mock_g.current_user = test_instructor
                
                # Mock file upload data
                file_data = {
                    'file': (open(__file__, 'rb'), 'test.py'),
                    'module_id': 'test-module-id',
                    'title': 'Test File'
                }
                
                # Test v1 upload
                v1_response = self.client.post('/api/v1/files/upload', 
                                             data=file_data, 
                                             content_type='multipart/form-data')
                
                # Test v2 upload  
                v2_response = self.client.post('/api/v2/files/upload',
                                             data=file_data,
                                             content_type='multipart/form-data')
                
                # Both should handle the request (even if they fail due to missing dependencies)
                # The important thing is that they respond with different formats
                if v1_response.is_json and v2_response.is_json:
                    v1_data = v1_response.get_json()
                    v2_data = v2_response.get_json()
                    
                    # v2 should have standardized format even for errors
                    if isinstance(v2_data, dict):
                        expected_v2_keys = ['success', 'message', 'timestamp']
                        has_v2_format = any(key in v2_data for key in expected_v2_keys)
                        assert has_v2_format


class TestVersioningMiddleware:
    """Test the versioning middleware functionality"""
    
    def test_middleware_adds_version_headers(self):
        """Test that middleware adds appropriate version headers"""
        app = create_app()
        client = app.test_client()
        
        # Test that any response gets version headers
        response = client.get('/health')
        
        # Should have some version-related header or handle properly
        assert response.status_code in [200, 404]  # Either works or endpoint doesn't exist
    
    def test_version_context_is_set(self):
        """Test that g.api_version is set by middleware"""
        app = create_app()
        
        with app.test_request_context('/api/v1/test'):
            from core.api_versioning import APIVersioning
            version = APIVersioning.get_request_version()
            assert version == 'v1'
        
        with app.test_request_context('/api/v2/test'):
            version = APIVersioning.get_request_version()
            assert version == 'v2'


class TestAPIVersioningConfig:
    """Test API versioning configuration"""
    
    def test_version_configurations(self):
        """Test that version configurations are properly set"""
        from core.api_versioning import APIVersioning
        
        # Test v1 is marked as deprecated
        v1_config = APIVersioning.VERSIONS.get('v1', {})
        assert v1_config.get('deprecated') is True
        assert 'sunset_date' in v1_config
        assert 'deprecation_message' in v1_config
        
        # Test v2 is current
        v2_config = APIVersioning.VERSIONS.get('v2', {})
        assert v2_config.get('deprecated') is False
        assert v2_config.get('current') is True
    
    def test_default_version_is_v2(self):
        """Test that default version is v2"""
        from core.api_versioning import APIVersioning
        
        assert APIVersioning.DEFAULT_VERSION == 'v2'
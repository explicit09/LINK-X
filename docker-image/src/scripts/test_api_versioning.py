#!/usr/bin/env python3
"""
Test script for API versioning implementation
Run this to verify that API versioning is working correctly
"""

import requests
import json
from datetime import datetime
import time
import sys
import os

# Add src to path so we can import our modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app


class APIVersioningTester:
    """Test API versioning functionality"""
    
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
    
    def log_result(self, test_name, passed, message="", details=None):
        """Log test result"""
        result = {
            'test': test_name,
            'passed': passed,
            'message': message,
            'details': details or {},
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"  {message}")
        print()
    
    def test_health_endpoints(self):
        """Test health endpoints for both versions"""
        print("🔍 Testing health endpoints...")
        
        # Test basic health endpoint
        try:
            response = self.session.get(f"{self.base_url}/health")
            self.log_result(
                "Basic Health Endpoint",
                response.status_code == 200,
                f"Status: {response.status_code}"
            )
        except Exception as e:
            self.log_result("Basic Health Endpoint", False, f"Error: {str(e)}")
        
        # Test v2 health endpoint
        try:
            response = self.session.get(f"{self.base_url}/api/v2/health")
            if response.status_code == 200:
                data = response.json()
                has_version = 'version' in data
                self.log_result(
                    "V2 Health Endpoint",
                    has_version,
                    f"Status: {response.status_code}, Has version: {has_version}",
                    data
                )
            else:
                self.log_result(
                    "V2 Health Endpoint",
                    False,
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            self.log_result("V2 Health Endpoint", False, f"Error: {str(e)}")
    
    def test_v1_deprecation_headers(self):
        """Test that v1 endpoints return deprecation headers"""
        print("🔍 Testing v1 deprecation headers...")
        
        # Test endpoints that should exist
        v1_endpoints = [
            "/api/v1/auth/sessionLogin",  # Should return 400 for missing body
        ]
        
        for endpoint in v1_endpoints:
            try:
                response = self.session.post(f"{self.base_url}{endpoint}", json={})
                
                # Check for deprecation headers
                has_deprecated = response.headers.get('X-API-Deprecated') == 'true'
                has_sunset = 'X-API-Sunset' in response.headers
                has_message = 'X-API-Deprecation-Message' in response.headers
                has_guide = 'X-API-Migration-Guide' in response.headers
                
                all_headers_present = has_deprecated and has_sunset and has_message and has_guide
                
                self.log_result(
                    f"V1 Deprecation Headers - {endpoint}",
                    all_headers_present,
                    f"Headers present: Deprecated={has_deprecated}, Sunset={has_sunset}, Message={has_message}, Guide={has_guide}",
                    {
                        'deprecated': response.headers.get('X-API-Deprecated'),
                        'sunset': response.headers.get('X-API-Sunset'),
                        'message': response.headers.get('X-API-Deprecation-Message'),
                        'guide': response.headers.get('X-API-Migration-Guide')
                    }
                )
                
                # Check for deprecation in response body
                if response.headers.get('content-type', '').startswith('application/json'):
                    try:
                        data = response.json()
                        has_warning = '_deprecation_warning' in data
                        self.log_result(
                            f"V1 Response Body Warning - {endpoint}",
                            has_warning,
                            f"Warning in body: {has_warning}",
                            data.get('_deprecation_warning', {})
                        )
                    except:
                        pass
                
            except Exception as e:
                self.log_result(
                    f"V1 Deprecation Headers - {endpoint}",
                    False,
                    f"Error: {str(e)}"
                )
    
    def test_v2_response_format(self):
        """Test v2 standardized response format"""
        print("🔍 Testing v2 response format...")
        
        # Test endpoints that should exist
        v2_endpoints = [
            ("/api/v2/auth/login", "POST", {"idToken": "invalid"}),  # Should return 400/401 with standard format
        ]
        
        for endpoint, method, data in v2_endpoints:
            try:
                if method == "POST":
                    response = self.session.post(f"{self.base_url}{endpoint}", json=data)
                else:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                
                # Check response format
                if response.headers.get('content-type', '').startswith('application/json'):
                    response_data = response.json()
                    
                    # V2 should have standardized format
                    has_success = 'success' in response_data
                    has_timestamp = 'timestamp' in response_data
                    has_message = 'message' in response_data
                    
                    is_standard_format = has_success and has_timestamp and has_message
                    
                    # Should not have deprecation warning
                    has_deprecation = '_deprecation_warning' in response_data
                    
                    self.log_result(
                        f"V2 Standard Format - {endpoint}",
                        is_standard_format and not has_deprecation,
                        f"Standard format: {is_standard_format}, No deprecation: {not has_deprecation}",
                        {
                            'has_success': has_success,
                            'has_timestamp': has_timestamp,
                            'has_message': has_message,
                            'has_deprecation': has_deprecation,
                            'response_keys': list(response_data.keys())
                        }
                    )
                
            except Exception as e:
                self.log_result(
                    f"V2 Standard Format - {endpoint}",
                    False,
                    f"Error: {str(e)}"
                )
    
    def test_version_detection(self):
        """Test version detection from different sources"""
        print("🔍 Testing version detection...")
        
        # Test version detection via URL path
        test_cases = [
            ("/api/v1/health", "v1"),
            ("/api/v2/health", "v2"),
        ]
        
        for endpoint, expected_version in test_cases:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}")
                
                # Check if version is detected in headers or response
                version_header = response.headers.get('X-API-Version')
                
                version_detected = False
                if version_header == expected_version:
                    version_detected = True
                elif expected_version == "v2" and response.status_code == 200:
                    # For v2, check if it has the standard format
                    try:
                        data = response.json()
                        if 'version' in data and data['version'].startswith('2'):
                            version_detected = True
                    except:
                        pass
                elif expected_version == "v1" and response.headers.get('X-API-Deprecated') == 'true':
                    # For v1, check if deprecation headers are present
                    version_detected = True
                
                self.log_result(
                    f"Version Detection - {endpoint}",
                    version_detected,
                    f"Expected: {expected_version}, Detected via headers/format",
                    {
                        'version_header': version_header,
                        'deprecated_header': response.headers.get('X-API-Deprecated'),
                        'status_code': response.status_code
                    }
                )
                
            except Exception as e:
                self.log_result(
                    f"Version Detection - {endpoint}",
                    False,
                    f"Error: {str(e)}"
                )
    
    def test_404_handling(self):
        """Test 404 handling with version awareness"""
        print("🔍 Testing 404 handling...")
        
        endpoints = [
            "/api/v1/nonexistent",
            "/api/v2/nonexistent"
        ]
        
        for endpoint in endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}")
                
                if response.status_code == 404:
                    # Check if it's a JSON response with helpful info
                    if response.headers.get('content-type', '').startswith('application/json'):
                        data = response.json()
                        has_error = 'error' in data or 'message' in data
                        has_version_info = 'version' in data or 'X-API-Version' in response.headers
                        
                        self.log_result(
                            f"404 Handling - {endpoint}",
                            has_error and has_version_info,
                            f"Has error info: {has_error}, Has version info: {has_version_info}",
                            data
                        )
                    else:
                        self.log_result(
                            f"404 Handling - {endpoint}",
                            True,
                            "Returns 404 as expected"
                        )
                else:
                    self.log_result(
                        f"404 Handling - {endpoint}",
                        False,
                        f"Expected 404, got {response.status_code}"
                    )
                    
            except Exception as e:
                self.log_result(
                    f"404 Handling - {endpoint}",
                    False,
                    f"Error: {str(e)}"
                )
    
    def test_monitoring_endpoints(self):
        """Test monitoring endpoints (should require admin)"""
        print("🔍 Testing monitoring endpoints...")
        
        monitoring_endpoints = [
            "/api/monitoring/version-usage",
            "/api/monitoring/migration-status",
            "/api/monitoring/deprecation-report"
        ]
        
        for endpoint in monitoring_endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}")
                
                # Should return 401/403 (unauthorized) since we're not authenticated
                is_protected = response.status_code in [401, 403]
                
                self.log_result(
                    f"Monitoring Protection - {endpoint}",
                    is_protected,
                    f"Status: {response.status_code} (should be 401/403 without auth)",
                    {'status_code': response.status_code}
                )
                
            except Exception as e:
                self.log_result(
                    f"Monitoring Protection - {endpoint}",
                    False,
                    f"Error: {str(e)}"
                )
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting API Versioning Tests")
        print("=" * 50)
        
        # Run test suites
        self.test_health_endpoints()
        self.test_v1_deprecation_headers()
        self.test_v2_response_format()
        self.test_version_detection()
        self.test_404_handling()
        self.test_monitoring_endpoints()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['passed'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result['passed']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "=" * 50)
        
        # Save detailed results
        with open('api_versioning_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print("📝 Detailed results saved to: api_versioning_test_results.json")
        
        return failed_tests == 0


def test_app_creation():
    """Test that the app can be created with versioning"""
    print("🔍 Testing app creation with versioning...")
    
    try:
        app = create_app()
        
        # Check that blueprints are registered
        blueprint_names = [bp.name for bp in app.blueprints.values()]
        
        has_v1 = 'api_v1' in blueprint_names
        has_v2 = 'api_v2' in blueprint_names
        has_monitoring = 'api_monitoring' in blueprint_names
        
        print(f"✅ App created successfully")
        print(f"  - V1 Blueprint: {has_v1}")
        print(f"  - V2 Blueprint: {has_v2}")
        print(f"  - Monitoring Blueprint: {has_monitoring}")
        print(f"  - Total Blueprints: {len(blueprint_names)}")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create app: {str(e)}")
        return False


def main():
    """Main test function"""
    print("🧪 API Versioning Implementation Test Suite")
    print(f"⏰ Started at: {datetime.now().isoformat()}")
    print()
    
    # Test app creation first
    app_creation_success = test_app_creation()
    
    if not app_creation_success:
        print("❌ App creation failed. Cannot proceed with API tests.")
        return False
    
    # Ask user if they want to test against running server
    print("🌐 To test API endpoints, you need a running server.")
    print("Options:")
    print("1. Start the server manually: python app.py")
    print("2. Skip API endpoint tests")
    
    choice = input("\nDo you want to test API endpoints? (y/N): ").lower().strip()
    
    if choice in ['y', 'yes']:
        base_url = input("Enter base URL (default: http://localhost:8080): ").strip()
        if not base_url:
            base_url = "http://localhost:8080"
        
        print(f"\n🔗 Testing against: {base_url}")
        print("⏳ Waiting 2 seconds for server to be ready...")
        time.sleep(2)
        
        # Run API tests
        tester = APIVersioningTester(base_url)
        success = tester.run_all_tests()
        
        return success
    else:
        print("✅ App creation test passed. Skipping API endpoint tests.")
        return True


if __name__ == "__main__":
    success = main()
    exit_code = 0 if success else 1
    print(f"\n🏁 Test suite completed with exit code: {exit_code}")
    sys.exit(exit_code)
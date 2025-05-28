#!/usr/bin/env python3
"""
Test CORS configuration for the backend API
"""
import requests
import sys

def test_cors(api_url, frontend_port):
    """Test CORS with a specific frontend port"""
    origin = f"http://localhost:{frontend_port}"
    
    print(f"\nTesting CORS from origin: {origin}")
    print("=" * 50)
    
    # Test preflight request
    print("\n1. Testing preflight (OPTIONS) request...")
    headers = {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
    }
    
    try:
        response = requests.options(f"{api_url}/api/v1/courses", headers=headers)
        print(f"   Status: {response.status_code}")
        print(f"   CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"     {header}: {value}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test actual request
    print("\n2. Testing actual GET request...")
    headers = {
        'Origin': origin,
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f"{api_url}/api/v1/courses", headers=headers)
        print(f"   Status: {response.status_code}")
        print(f"   CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"     {header}: {value}")
    except Exception as e:
        print(f"   Error: {e}")

def main():
    api_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
    
    print(f"Testing CORS configuration for API at: {api_url}")
    
    # Test with different frontend ports
    for port in [3000, 3001, 3002, 3005]:
        test_cors(api_url, port)
    
    # Test with unallowed origin
    print("\n\nTesting with unallowed origin...")
    print("=" * 50)
    headers = {
        'Origin': 'http://example.com',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f"{api_url}/api/v1/courses", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"  {header}: {value}")
        if 'access-control-allow-origin' not in response.headers:
            print("  ✓ No Access-Control-Allow-Origin header (correctly rejected)")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
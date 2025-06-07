#!/usr/bin/env python3
"""
Simple test to verify weekly goals API endpoint exists and has correct structure
"""
import requests
import json

def test_weekly_goals_endpoints():
    """Test that weekly goals endpoints exist and return proper error for auth"""
    base_url = "http://localhost:8000"
    
    print("Testing Weekly Goals API Endpoints")
    print("=" * 50)
    
    # Test GET endpoint
    print("1. Testing GET /api/v2/gamification/weekly-goals...")
    try:
        response = requests.get(f"{base_url}/api/v2/gamification/weekly-goals")
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Should require auth
        if response.status_code == 401 and 'AUTH_REQUIRED' in data.get('code', ''):
            print("   ✅ Endpoint exists and correctly requires authentication")
        else:
            print("   ❌ Unexpected response")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test PUT endpoint
    print("2. Testing PUT /api/v2/gamification/weekly-goals...")
    try:
        response = requests.put(f"{base_url}/api/v2/gamification/weekly-goals", 
                               json={"weekly_goal_target": 1000})
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Should require auth
        if response.status_code == 401 and 'AUTH_REQUIRED' in data.get('code', ''):
            print("   ✅ Endpoint exists and correctly requires authentication")
        else:
            print("   ❌ Unexpected response")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test stats endpoint for comparison
    print("3. Testing GET /api/v2/gamification/stats...")
    try:
        response = requests.get(f"{base_url}/api/v2/gamification/stats")
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 401 and 'AUTH_REQUIRED' in data.get('code', ''):
            print("   ✅ Stats endpoint working correctly")
        else:
            print("   ❌ Unexpected response")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == '__main__':
    test_weekly_goals_endpoints()
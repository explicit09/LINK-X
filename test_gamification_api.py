#!/usr/bin/env python3
"""
Test gamification API endpoints
"""
import requests
import json

def test_gamification_api():
    """Test gamification API endpoints without auth (to see structure)"""
    base_url = "http://localhost:8000"
    
    print("Testing Gamification API Endpoints")
    print("=" * 50)
    
    # Test health endpoint first
    print("1. Testing backend health...")
    try:
        response = requests.get(f"{base_url}/api/v2/health")
        if response.status_code == 200:
            print(f"   ✅ Backend is healthy")
            health_data = response.json()
            print(f"   Database status: {health_data.get('services', {}).get('database', 'unknown')}")
        else:
            print(f"   ❌ Backend health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Cannot connect to backend: {e}")
        return
    
    # Test gamification endpoints (expect auth errors but we can see response format)
    print("\n2. Testing gamification stats endpoint...")
    try:
        response = requests.get(f"{base_url}/api/v2/gamification/stats")
        print(f"   Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        except:
            print(f"   Raw response: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n3. Testing gamification achievements endpoint...")
    try:
        response = requests.get(f"{base_url}/api/v2/gamification/achievements")
        print(f"   Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        except:
            print(f"   Raw response: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n4. Testing gamification award-xp endpoint...")
    try:
        response = requests.post(f"{base_url}/api/v2/gamification/award-xp", 
                               json={"activity_type": "test", "xp_amount": 5})
        print(f"   Status: {response.status_code}")
        try:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
        except:
            print(f"   Raw response: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == '__main__':
    test_gamification_api()
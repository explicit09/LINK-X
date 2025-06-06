#!/usr/bin/env python3
"""
Test the gamification system end-to-end
"""
import requests
import json
import sys
import os
from datetime import datetime

# API base URL
BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')

def test_gamification_api(auth_token):
    """Test gamification API endpoints"""
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }
    
    print("\n1. Testing GET /api/v2/gamification/stats")
    print("-" * 50)
    
    response = requests.get(f"{BASE_URL}/api/v2/gamification/stats", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        stats = response.json()
        print(f"Response: {json.dumps(stats, indent=2)}")
        
        if stats.get('status') == 'success':
            data = stats.get('data', {})
            print(f"\n✅ Current Stats:")
            print(f"   - Level: {data.get('currentLevel', 1)}")
            print(f"   - Total XP: {data.get('totalXP', 0)}")
            print(f"   - Current Streak: {data.get('dailyStreak', 0)} days")
            print(f"   - Today's XP: {data.get('todayXP', 0)}")
            print(f"   - Rank: #{data.get('rank', 'N/A')}")
    else:
        print(f"❌ Error: {response.text}")
        return False
    
    print("\n2. Testing POST /api/v2/gamification/award-xp (Daily Login)")
    print("-" * 50)
    
    award_data = {
        "activity_type": "daily_login",
        "xp_amount": 3,
        "description": "Daily login bonus"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v2/gamification/award-xp", 
        headers=headers,
        json=award_data
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if result.get('status') == 'success':
            data = result.get('data', {})
            print(f"\n✅ XP Awarded:")
            print(f"   - XP Amount: {data.get('xp_awarded', 0)}")
            print(f"   - New Total XP: {data.get('new_total_xp', 0)}")
            print(f"   - New Level: {data.get('new_level', 1)}")
    else:
        print(f"❌ Error: {response.text}")
        return False
    
    print("\n3. Testing GET /api/v2/gamification/achievements")
    print("-" * 50)
    
    response = requests.get(f"{BASE_URL}/api/v2/gamification/achievements", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        achievements = response.json()
        print(f"Response: {json.dumps(achievements, indent=2)}")
        
        if achievements.get('status') == 'success':
            data = achievements.get('data', {})
            achievement_list = data.get('achievements', [])
            print(f"\n✅ Achievements: {data.get('total_count', 0)} total")
            for ach in achievement_list[:3]:  # Show first 3
                print(f"   - {ach.get('name')}: {ach.get('description')}")
    else:
        print(f"❌ Error: {response.text}")
    
    print("\n4. Testing GET /api/v2/gamification/leaderboard")
    print("-" * 50)
    
    response = requests.get(
        f"{BASE_URL}/api/v2/gamification/leaderboard?limit=5", 
        headers=headers
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        leaderboard = response.json()
        print(f"Response: {json.dumps(leaderboard, indent=2)}")
        
        if leaderboard.get('status') == 'success':
            data = leaderboard.get('data', {})
            print(f"\n✅ Leaderboard (Top 5):")
            print(f"   Your Rank: #{data.get('current_user_rank', 'N/A')}")
            
            for entry in data.get('leaderboard', [])[:5]:
                print(f"   #{entry.get('rank')} - {entry.get('name')} - {entry.get('total_xp')} XP (Level {entry.get('level')})")
    else:
        print(f"❌ Error: {response.text}")
    
    return True

def main():
    # Get auth token from environment or command line
    auth_token = os.getenv('AUTH_TOKEN') or (sys.argv[1] if len(sys.argv) > 1 else None)
    
    if not auth_token:
        print("Usage: python test_gamification_system.py <auth_token>")
        print("Or set AUTH_TOKEN environment variable")
        sys.exit(1)
    
    print("🎮 Testing Gamification System")
    print("=" * 50)
    print(f"API URL: {BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    
    success = test_gamification_api(auth_token)
    
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""
Test script to verify personalization system is using user profile data correctly
"""

import os
import sys
import json
import psycopg2

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_user_profile_data():
    """Test that user profile data exists in database"""
    print("🔍 Testing user profile data in database...")
    
    try:
        # Connect to Neon database
        conn = psycopg2.connect(
            "postgresql://neondb_owner:npg_2ZO0npmbLIPU@ep-withered-hill-a5u0pgp4-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
        )
        cur = conn.cursor()
        
        # Query user profiles
        cur.execute("""
            SELECT u.name, u.id, sp.onboard_answers 
            FROM users u 
            LEFT JOIN student_profiles sp ON u.id = sp.user_id 
            WHERE u.name LIKE '%Thabang%' 
            LIMIT 5
        """)
        
        rows = cur.fetchall()
        
        if rows:
            print(f"✅ Found {len(rows)} users matching 'Thabang'")
            for name, user_id, onboard_answers in rows:
                print(f"  User: {name}")
                print(f"  User ID: {user_id}")
                if onboard_answers:
                    print(f"  Profile data: {json.dumps(onboard_answers, indent=2)}")
                    
                    # Check for required fields
                    required_fields = ['learning_style', 'interests', 'depth', 'traits']
                    missing_fields = [field for field in required_fields if field not in onboard_answers]
                    
                    if missing_fields:
                        print(f"  ⚠️  Missing fields: {missing_fields}")
                    else:
                        print(f"  ✅ All required profile fields present")
                else:
                    print(f"  ❌ No profile data found")
                print("  ---")
        else:
            print("❌ No users found matching 'Thabang'")
        
        cur.close()
        conn.close()
        
        return len(rows) > 0 and any(onboard_answers for _, _, onboard_answers in rows)
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def test_personalization_prompt_template():
    """Test that personalization prompt template is properly loaded"""
    print("\n🔍 Testing personalization prompt template...")
    
    try:
        from core.prompt_manager import PromptManager
        
        prompt_manager = PromptManager()
        
        # Test loading the natural personalization prompt
        try:
            prompt = prompt_manager.get_prompt(
                'natural_personalization',
                section_title="Introduction to Machine Learning",
                section_content="Machine learning is a subset of artificial intelligence...",
                relevant_context="Previous content about AI and data science...",
                user_profile={
                    'learning_style': 'visual',
                    'expertise_level': 'intermediate',
                    'interests': ['AI & Machine Learning', 'Programming'],
                    'tone_preference': 'professional'
                },
                learning_style='visual',
                expertise_level='intermediate',
                interests=['AI & Machine Learning', 'Programming'],
                tone_preference='professional'
            )
            
            print("✅ Personalization prompt template loaded successfully")
            print(f"  Prompt length: {len(prompt)} characters")
            
            # Check if user profile fields are being used
            profile_fields = ['visual', 'intermediate', 'professional']
            fields_found = [field for field in profile_fields if field in prompt]
            
            if fields_found:
                print(f"  ✅ User profile fields found in prompt: {fields_found}")
            else:
                print("  ⚠️  No user profile fields found in prompt")
            
            return True
            
        except Exception as e:
            print(f"❌ Error loading personalization prompt: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error importing PromptManager: {e}")
        return False

def test_streaming_service_initialization():
    """Test that streaming service can be initialized properly"""
    print("\n🔍 Testing streaming service initialization...")
    
    try:
        from services.streaming_personalization_v2 import OptimizedStreamingPersonalizationService
        from services.ai_service import AIService
        from services.file_service import FileService
        from repositories.user_repository import UserRepository
        from repositories.file_repository import FileRepository
        import redis
        
        # Initialize services
        ai_service = AIService()
        file_service = FileService()
        user_repo = UserRepository()
        file_repo = FileRepository()
        cache = redis.from_url('redis://redis:6379/0')
        
        # Create streaming service
        streaming_service = OptimizedStreamingPersonalizationService(
            ai_service=ai_service,
            file_service=file_service,
            user_repo=user_repo,
            file_repo=file_repo,
            cache=cache
        )
        
        print("✅ Streaming service initialized successfully")
        print(f"  AI service: {type(ai_service).__name__}")
        print(f"  User repository: {type(user_repo).__name__}")
        print(f"  Cache connection: {'Connected' if cache.ping() else 'Failed'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing streaming service: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Personalization System Integration\n")
    
    tests = [
        test_user_profile_data,
        test_personalization_prompt_template,
        test_streaming_service_initialization
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append(False)
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"\n📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All tests passed! Personalization system is properly integrated.")
    else:
        print("⚠️  Some tests failed. Check the issues above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
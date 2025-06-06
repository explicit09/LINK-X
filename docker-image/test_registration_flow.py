#!/usr/bin/env python3
"""
Test script to debug user registration flow
"""
import os
import sys
import json
from datetime import datetime

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from core.database_supabase import db_manager
from db.schema import User, Role, StudentProfile
from repositories.user_repository import UserRepository
from services.auth_service_unified import UnifiedAuthService

def check_recent_registrations():
    """Check recent user registrations and their profiles"""
    print("\n=== RECENT USER REGISTRATIONS ===")
    
    with db_manager.get_session() as session:
        # Get users created today
        today = datetime(2025, 6, 5)
        users = session.query(User).filter(
            User.created_at >= today
        ).order_by(User.created_at.desc()).all()
        
        print(f"\nFound {len(users)} users created since {today.date()}")
        
        for user in users:
            print(f"\n--- User: {user.email} ---")
            print(f"  ID: {user.id}")
            print(f"  Created: {user.created_at}")
            print(f"  Firebase UID: {user.firebase_uid}")
            
            # Check role
            role = session.query(Role).filter_by(user_id=user.id).first()
            print(f"  Role: {role.role_type if role else 'NO ROLE!'}")
            
            # Check profile
            if role and role.role_type == 'student':
                profile = session.query(StudentProfile).filter_by(user_id=user.id).first()
                if profile:
                    print(f"  Profile Name: {profile.name}")
                    print(f"  Onboard Answers: {json.dumps(profile.onboard_answers, indent=2) if profile.onboard_answers else 'EMPTY'}")
                    print(f"  Want Quizzes: {profile.want_quizzes}")
                else:
                    print("  NO STUDENT PROFILE!")

def test_registration_methods():
    """Test the registration methods directly"""
    print("\n\n=== TESTING REGISTRATION METHODS ===")
    
    user_repo = UserRepository(db_manager.session_factory)
    auth_service = UnifiedAuthService(user_repo=user_repo)
    
    # Test data
    test_data = {
        'email': 'test-debug@example.com',
        'firebase_uid': 'test-firebase-debug-' + str(datetime.now().timestamp()),
        'role': 'student',
        'name': 'Test Debug User',
        'onboard_answers': {
            'learningStyle': 'visual',
            'depth': 'intermediate',
            'schedule': 'flexible',
            'tone': 'encouraging',
            'topics': ['Math', 'Science'],
            'interests': ['coding', 'reading']
        },
        'want_quizzes': True
    }
    
    print(f"\nTest registration data:")
    print(json.dumps(test_data, indent=2))
    
    try:
        # Test the auth service register_user method
        print("\nCalling auth_service.register_user()...")
        result = auth_service.register_user(**test_data)
        print(f"Registration result: {json.dumps(result, indent=2, default=str)}")
        
        # Verify the user was created correctly
        created_user = user_repo.find_by_firebase_uid(test_data['firebase_uid'])
        if created_user:
            print(f"\nUser created successfully: {created_user.email}")
            
            # Check profile
            with db_manager.get_session() as session:
                profile = session.query(StudentProfile).filter_by(user_id=created_user.id).first()
                if profile:
                    print(f"Profile created: {profile.name}")
                    print(f"Onboard answers: {json.dumps(profile.onboard_answers, indent=2)}")
                else:
                    print("ERROR: No profile created!")
                    
    except Exception as e:
        print(f"\nERROR during registration: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

def check_user_by_email(email):
    """Check a specific user by email"""
    print(f"\n\n=== CHECKING USER: {email} ===")
    
    with db_manager.get_session() as session:
        user = session.query(User).filter_by(email=email).first()
        if not user:
            print(f"User not found: {email}")
            return
            
        print(f"User ID: {user.id}")
        print(f"Created: {user.created_at}")
        
        # Check all related data
        role = session.query(Role).filter_by(user_id=user.id).first()
        print(f"Role: {role.role_type if role else 'NO ROLE'}")
        
        if role and role.role_type == 'student':
            profile = session.query(StudentProfile).filter_by(user_id=user.id).first()
            if profile:
                print(f"Profile Name: {profile.name}")
                print(f"Onboard Answers: {json.dumps(profile.onboard_answers, indent=2)}")
                print(f"Want Quizzes: {profile.want_quizzes}")
                print(f"Model Preference: {profile.model_preference}")
            else:
                print("NO STUDENT PROFILE!")

if __name__ == "__main__":
    print("User Registration Debug Script")
    print("==============================")
    
    # Check recent registrations
    check_recent_registrations()
    
    # Test registration methods
    test_registration_methods()
    
    # Check specific user if provided
    if len(sys.argv) > 1:
        check_user_by_email(sys.argv[1])
#!/usr/bin/env python3
"""
Check if a user exists in the database and has a student profile
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import get_db_session
from db.schema import User, StudentProfile
from sqlalchemy import select

def check_user_profile(firebase_uid):
    """Check if user exists and has student profile"""
    session = get_db_session()
    
    try:
        # Check if user exists
        user = session.execute(
            select(User).filter(User.firebase_uid == firebase_uid)
        ).scalar_one_or_none()
        
        if not user:
            print(f"❌ No user found with firebase_uid: {firebase_uid}")
            # Try to find by email instead
            users = session.execute(select(User).limit(5)).scalars().all()
            print("\nExisting users:")
            for u in users:
                print(f"  - ID: {u.id}, Email: {u.email}, Firebase UID: {u.firebase_uid}")
            return
            
        print(f"✅ User found: {user.email} (ID: {user.id})")
        
        # Check if student profile exists
        student = session.execute(
            select(StudentProfile).filter(StudentProfile.user_id == user.id)
        ).scalar_one_or_none()
        
        if not student:
            print(f"❌ No student profile found for user")
            return
            
        print(f"✅ Student profile found: {student.name}")
        print(f"   Onboard answers: {student.onboard_answers}")
        
    finally:
        session.close()

if __name__ == "__main__":
    firebase_uid = sys.argv[1] if len(sys.argv) > 1 else "EEPvhtP1wsN2l60Z9RayrC90jsF2"
    check_user_profile(firebase_uid)
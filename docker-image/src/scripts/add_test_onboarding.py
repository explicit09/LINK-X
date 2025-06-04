#!/usr/bin/env python3
"""
Script to add test onboarding data for a student
"""

import sys
sys.path.append('/app/src')

from db.connection import get_db_session
from db.schema import StudentProfile
import json

def add_test_onboarding(email):
    """Add test onboarding data for a student"""
    session = get_db_session()
    
    try:
        # Find the student by email
        from db.schema import User
        user = session.query(User).filter_by(email=email).first()
        
        if not user:
            print(f"User with email {email} not found")
            return
            
        # Check if student profile exists
        student_profile = session.query(StudentProfile).filter_by(user_id=user.id).first()
        
        if not student_profile:
            print(f"Student profile for {email} not found")
            return
            
        # Add test onboarding data
        test_onboarding = {
            "learningStyle": "visual",
            "depth": "intermediate",
            "schedule": "flexible",
            "tone": "encouraging",
            "topics": ["Computer Science", "Mathematics", "Machine Learning"],
            "interests": ["gaming", "sports", "technology", "music"]
        }
        
        student_profile.onboard_answers = test_onboarding
        session.commit()
        
        print(f"Successfully added test onboarding data for {email}")
        print(f"Onboarding data: {json.dumps(test_onboarding, indent=2)}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python add_test_onboarding.py <email>")
        sys.exit(1)
        
    email = sys.argv[1]
    add_test_onboarding(email)
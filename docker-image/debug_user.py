#!/usr/bin/env python3

import os
import sys
sys.path.append('/app/src')

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from src.db.schema import Base

# Database connection
POSTGRES_URL = os.getenv("POSTGRES_URL")
if not POSTGRES_URL:
    print("POSTGRES_URL not set")
    sys.exit(1)

engine = create_engine(POSTGRES_URL)
Session = sessionmaker(bind=engine)

def check_users():
    db = Session()
    try:
        # Get all users
        result = db.execute(text('SELECT id, email, firebase_uid FROM "User"'))
        users = result.fetchall()
        
        print("=== ALL USERS ===")
        for user in users:
            print(f"ID: {user[0]}, Email: {user[1]}, Firebase UID: {user[2]}")
            
            # Check for student profile
            profile_result = db.execute(text('SELECT name, onboard_answers FROM "StudentProfile" WHERE user_id = :uid'), {'uid': user[0]})
            profile = profile_result.fetchone()
            if profile:
                print(f"  -> Student Profile: {profile[0]}, Onboarded: {'Yes' if profile[1] else 'No'}")
            else:
                print(f"  -> No Student Profile")
            print()
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

def find_user_by_email(email):
    db = Session()
    try:
        result = db.execute(text('SELECT id, email, firebase_uid FROM "User" WHERE email = :email'), {'email': email})
        user = result.fetchone()
        
        if user:
            print(f"=== USER FOUND: {email} ===")
            print(f"ID: {user[0]}, Email: {user[1]}, Firebase UID: {user[2]}")
            
            # Check for student profile
            profile_result = db.execute(text('SELECT name, onboard_answers, want_quizzes FROM "StudentProfile" WHERE user_id = :uid'), {'uid': user[0]})
            profile = profile_result.fetchone()
            if profile:
                print(f"Student Profile: {profile[0]}")
                print(f"Onboard Answers: {profile[1]}")
                print(f"Want Quizzes: {profile[2]}")
            else:
                print("No Student Profile found")
        else:
            print(f"No user found with email: {email}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        find_user_by_email(sys.argv[1])
    else:
        check_users() 
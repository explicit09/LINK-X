#!/usr/bin/env python3
"""
Create a test user in the database to match the Supabase authenticated user
"""
import os
import sys
from sqlalchemy import create_engine, text
from datetime import datetime
import uuid

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

# The user ID from the JWT token we saw in the logs
SUPABASE_USER_ID = "b59fa101-fedb-44eb-8782-82d01648ef59"
TEST_EMAIL = "tadiesaemiru@gmail.com"  # From the frontend auth

def create_test_user():
    """Create a test user matching the Supabase authenticated user"""
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.begin() as conn:
            # Check if user already exists
            result = conn.execute(
                text("SELECT id, email, role FROM users WHERE id = :user_id OR email = :email"),
                {"user_id": SUPABASE_USER_ID, "email": TEST_EMAIL}
            )
            existing_user = result.fetchone()
            
            if existing_user:
                print(f"User already exists: {existing_user}")
                return
            
            # Create the user
            print(f"Creating user with ID: {SUPABASE_USER_ID}")
            conn.execute(
                text("""
                    INSERT INTO users (id, email, firebase_uid, role, created_at, updated_at, is_active, email_verified)
                    VALUES (:id, :email, :firebase_uid, :role, :created_at, :updated_at, :is_active, :email_verified)
                """),
                {
                    "id": SUPABASE_USER_ID,
                    "email": TEST_EMAIL,
                    "firebase_uid": SUPABASE_USER_ID,  # Using Supabase ID as firebase_uid
                    "role": "student",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now(),
                    "is_active": True,
                    "email_verified": True
                }
            )
            
            # Create user profile with required fields
            conn.execute(
                text("""
                    INSERT INTO user_profiles (id, email, role, created_at, updated_at)
                    VALUES (:id, :email, :role, :created_at, :updated_at)
                """),
                {
                    "id": SUPABASE_USER_ID,
                    "email": TEST_EMAIL,
                    "role": "student",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                }
            )
            
            print(f"Successfully created user: {TEST_EMAIL}")
            
            # Verify the user was created
            result = conn.execute(
                text("SELECT id, email, role, firebase_uid FROM users WHERE id = :user_id"),
                {"user_id": SUPABASE_USER_ID}
            )
            user = result.fetchone()
            print(f"Verified user in database: {user}")
            
    except Exception as e:
        print(f"Error creating user: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = create_test_user()
    sys.exit(0 if success else 1)
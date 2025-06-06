#!/usr/bin/env python3
"""Fix the user data to match Supabase authentication"""
import os
from sqlalchemy import create_engine, text
from datetime import datetime

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

# The user ID from the JWT token
SUPABASE_USER_ID = "b59fa101-fedb-44eb-8782-82d01648ef59"
CORRECT_EMAIL = "tadiesaemiru@gmail.com"  # From the frontend auth

def fix_user_data():
    """Fix user data to match authentication"""
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        # First, delete the existing user_profile entry
        conn.execute(
            text("DELETE FROM user_profiles WHERE id = :id"),
            {"id": SUPABASE_USER_ID}
        )
        print("Deleted existing user_profile")
        
        # Create the user in users table
        conn.execute(
            text("""
                INSERT INTO users (id, email, firebase_uid, role, created_at, updated_at, is_active, email_verified)
                VALUES (:id, :email, :firebase_uid, :role, :created_at, :updated_at, :is_active, :email_verified)
                ON CONFLICT (id) DO UPDATE SET 
                    email = EXCLUDED.email,
                    updated_at = EXCLUDED.updated_at
            """),
            {
                "id": SUPABASE_USER_ID,
                "email": CORRECT_EMAIL,
                "firebase_uid": SUPABASE_USER_ID,
                "role": "student",
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "is_active": True,
                "email_verified": True
            }
        )
        print(f"Created/updated user: {CORRECT_EMAIL}")
        
        # Create the user profile
        conn.execute(
            text("""
                INSERT INTO user_profiles (id, email, role, created_at, updated_at)
                VALUES (:id, :email, :role, :created_at, :updated_at)
            """),
            {
                "id": SUPABASE_USER_ID,
                "email": CORRECT_EMAIL,
                "role": "student",
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
        )
        print("Created user profile")
        
        # Verify the data
        result = conn.execute(
            text("""
                SELECT u.id, u.email, u.role, u.firebase_uid, 
                       up.email as profile_email, up.role as profile_role
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.id
                WHERE u.id = :id
            """),
            {"id": SUPABASE_USER_ID}
        )
        user_data = result.fetchone()
        print(f"\nVerified user data: {user_data}")
        
        return True

if __name__ == "__main__":
    fix_user_data()
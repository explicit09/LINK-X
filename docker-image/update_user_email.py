#!/usr/bin/env python3
"""Update user email to match the authenticated session"""
import os
from sqlalchemy import create_engine, text
from datetime import datetime

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

# User details from the session
SUPABASE_USER_ID = "b59fa101-fedb-44eb-8782-82d01648ef59"
CORRECT_EMAIL = "tmbuwa09@gmail.com"  # The actual email from the session
FULL_NAME = "TADIWA MBUWAYESANGO"

def update_user_email():
    """Update user email to match authentication"""
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        # Update the users table
        result = conn.execute(
            text("""
                UPDATE users 
                SET email = :email, 
                    full_name = :full_name,
                    updated_at = :updated_at
                WHERE id = :id
                RETURNING id, email, full_name
            """),
            {
                "id": SUPABASE_USER_ID,
                "email": CORRECT_EMAIL,
                "full_name": FULL_NAME,
                "updated_at": datetime.now()
            }
        )
        updated_user = result.fetchone()
        print(f"Updated user: {updated_user}")
        
        # Update the user_profiles table
        result = conn.execute(
            text("""
                UPDATE user_profiles 
                SET email = :email,
                    full_name = :full_name,
                    updated_at = :updated_at
                WHERE id = :id
                RETURNING id, email, full_name
            """),
            {
                "id": SUPABASE_USER_ID,
                "email": CORRECT_EMAIL,
                "full_name": FULL_NAME,
                "updated_at": datetime.now()
            }
        )
        updated_profile = result.fetchone()
        print(f"Updated profile: {updated_profile}")
        
        # Verify the update
        result = conn.execute(
            text("""
                SELECT u.id, u.email, u.full_name, u.role, u.firebase_uid
                FROM users u
                WHERE u.id = :id
            """),
            {"id": SUPABASE_USER_ID}
        )
        final_user = result.fetchone()
        print(f"\nFinal user data: {final_user}")
        
        return True

if __name__ == "__main__":
    update_user_email()
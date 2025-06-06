#!/usr/bin/env python3
"""
Fix user profiles - migrate from user_profiles to proper profile tables
"""
import os
from sqlalchemy import create_engine, text
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

def fix_user_profiles():
    """Migrate data from user_profiles to the correct profile tables"""
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        # First, check what's in user_profiles
        result = conn.execute(text("SELECT * FROM user_profiles"))
        user_profiles = result.fetchall()
        
        logger.info(f"Found {len(user_profiles)} entries in user_profiles table")
        
        for profile in user_profiles:
            user_id = profile[0]
            email = profile[1]
            role = profile[2]
            full_name = profile[3] if len(profile) > 3 else None
            
            logger.info(f"Processing user {user_id} ({email}) with role {role}")
            
            # Check if user exists in users table
            user_result = conn.execute(
                text("SELECT id, role FROM users WHERE id = :id"),
                {"id": user_id}
            )
            user = user_result.fetchone()
            
            if not user:
                logger.warning(f"User {user_id} not found in users table, skipping")
                continue
            
            # Check if role exists
            role_result = conn.execute(
                text("SELECT * FROM roles WHERE user_id = :user_id"),
                {"user_id": user_id}
            )
            if not role_result.fetchone():
                # Create role entry
                conn.execute(
                    text("INSERT INTO roles (user_id, role_type) VALUES (:user_id, :role_type)"),
                    {"user_id": user_id, "role_type": role}
                )
                logger.info(f"Created role entry for user {user_id}")
            
            # Create appropriate profile based on role
            if role == 'student':
                # Check if student profile exists
                sp_result = conn.execute(
                    text("SELECT * FROM student_profiles WHERE user_id = :user_id"),
                    {"user_id": user_id}
                )
                if not sp_result.fetchone():
                    conn.execute(
                        text("""
                            INSERT INTO student_profiles (user_id, name, onboard_answers, want_quizzes)
                            VALUES (:user_id, :name, CAST(:onboard_answers AS jsonb), :want_quizzes)
                        """),
                        {
                            "user_id": user_id,
                            "name": full_name or email.split('@')[0],
                            "onboard_answers": "{}",  # Pass as string for JSONB
                            "want_quizzes": False
                        }
                    )
                    logger.info(f"Created student profile for user {user_id}")
                    
            elif role == 'instructor':
                # Check if instructor profile exists
                ip_result = conn.execute(
                    text("SELECT * FROM instructor_profiles WHERE user_id = :user_id"),
                    {"user_id": user_id}
                )
                if not ip_result.fetchone():
                    conn.execute(
                        text("""
                            INSERT INTO instructor_profiles (user_id, name, university)
                            VALUES (:user_id, :name, :university)
                        """),
                        {
                            "user_id": user_id,
                            "name": full_name or email.split('@')[0],
                            "university": None
                        }
                    )
                    logger.info(f"Created instructor profile for user {user_id}")
                    
            elif role == 'admin':
                # Check if admin profile exists
                ap_result = conn.execute(
                    text("SELECT * FROM admin_profiles WHERE user_id = :user_id"),
                    {"user_id": user_id}
                )
                if not ap_result.fetchone():
                    conn.execute(
                        text("""
                            INSERT INTO admin_profiles (user_id, name)
                            VALUES (:user_id, :name)
                        """),
                        {
                            "user_id": user_id,
                            "name": full_name or email.split('@')[0]
                        }
                    )
                    logger.info(f"Created admin profile for user {user_id}")
        
        # Now we can safely drop the user_profiles table
        logger.info("\nMigration complete. The user_profiles table can now be dropped.")
        # conn.execute(text("DROP TABLE IF EXISTS user_profiles CASCADE"))
        # logger.info("Dropped user_profiles table")
        
        # Verify the migration
        logger.info("\n=== Verification ===")
        
        tables = ['roles', 'student_profiles', 'instructor_profiles', 'admin_profiles']
        for table in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            logger.info(f"{table}: {count} entries")

if __name__ == "__main__":
    fix_user_profiles()
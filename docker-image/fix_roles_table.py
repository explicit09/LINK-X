#!/usr/bin/env python3
"""
Fix roles table structure to match schema.py
"""
import os
from sqlalchemy import create_engine, text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

def fix_roles_table():
    """Fix roles table to match schema.py"""
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        # First, drop the incorrect roles table
        logger.info("Dropping incorrect roles table...")
        conn.execute(text("DROP TABLE IF EXISTS roles CASCADE"))
        
        # Create the correct roles table
        logger.info("Creating correct roles table...")
        
        # Check if role_enum type exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'role_enum'
            )
        """))
        if not result.scalar():
            conn.execute(text("""
                CREATE TYPE role_enum AS ENUM ('admin', 'instructor', 'student');
            """))
        
        conn.execute(text("""
            CREATE TABLE roles (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                role_type role_enum NOT NULL
            );
        """))
        
        # Now add role for our existing user
        logger.info("Adding role for existing user...")
        conn.execute(text("""
            INSERT INTO roles (user_id, role_type) 
            VALUES ('b59fa101-fedb-44eb-8782-82d01648ef59', 'student')
            ON CONFLICT DO NOTHING
        """))
        
        # Verify
        result = conn.execute(text("SELECT * FROM roles"))
        roles = result.fetchall()
        logger.info(f"Roles table now has {len(roles)} entries")
        for role in roles:
            logger.info(f"  - User {role[0]}: {role[1]}")
        
        logger.info("✓ Roles table fixed successfully!")

if __name__ == "__main__":
    fix_roles_table()
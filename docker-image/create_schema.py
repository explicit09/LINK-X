#!/usr/bin/env python3
"""
Create database schema for Supabase migration
Creates users table and related tables if they don't exist
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import logging

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database URL from environment or use the one provided
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

# Schema creation steps - split for better control
SCHEMA_STEPS = [
    # Step 1: Create users table
    """
    CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        firebase_uid VARCHAR(255) UNIQUE,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        full_name VARCHAR(255),
        avatar_url TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}'::jsonb
    )
    """,
    
    # Step 2: Create indexes
    "CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)",
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
    
    # Step 3: Create roles table
    """
    CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    
    # Step 4: Insert default roles
    """
    INSERT INTO roles (name, description) VALUES 
        ('student', 'Student user'),
        ('instructor', 'Instructor/Professor user'),
        ('admin', 'Administrator user')
    ON CONFLICT (name) DO NOTHING
    """,
    
    # Step 5: Create user_profiles table
    """
    CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        preferences JSONB DEFAULT '{}'::jsonb,
        learning_style VARCHAR(50),
        onboarding_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    
    # Step 6: Create trigger function
    """
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
    """,
    
    # Step 7: Create triggers
    "DROP TRIGGER IF EXISTS update_users_updated_at ON users",
    """
    CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    """,
    
    "DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles",
    """
    CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    """
]

def create_schema():
    """Create the database schema"""
    try:
        logger.info(f"Connecting to database...")
        engine = create_engine(DATABASE_URL, echo=True)
        
        # Use begin() for automatic transaction management
        with engine.begin() as conn:
            logger.info("Creating schema...")
            
            # Execute each schema step
            for i, statement in enumerate(SCHEMA_STEPS):
                statement = statement.strip()
                if statement:
                    logger.info(f"Executing step {i+1}: {statement[:50]}...")
                    conn.execute(text(statement))
            
            # Check if tables were created
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'roles', 'user_profiles')
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            logger.info(f"Created/verified tables: {tables}")
            
            # Check if we have any users
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            logger.info(f"Current user count: {user_count}")
            
        logger.info("Schema creation completed successfully!")
        return True
        
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = create_schema()
    sys.exit(0 if success else 1)
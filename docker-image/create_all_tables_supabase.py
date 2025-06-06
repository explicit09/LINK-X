#!/usr/bin/env python3
"""
Create all tables in Supabase database based on schema.py
This creates empty tables - no data migration
"""
import os
import sys
from sqlalchemy import create_engine, text
import logging

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

def create_all_tables():
    """Create all tables from schema.py"""
    try:
        # Import the schema
        from db.schema import Base
        
        logger.info("Creating all tables in Supabase...")
        logger.info(f"Database URL: {DATABASE_URL.split('@')[1]}")  # Log host only for security
        
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Drop all tables first (optional - comment out if you want to preserve existing data)
        # logger.warning("Dropping all existing tables...")
        # Base.metadata.drop_all(engine)
        
        # Create all tables
        logger.info("Creating tables...")
        Base.metadata.create_all(engine)
        
        # Verify what was created
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            logger.info(f"\nCreated {len(tables)} tables:")
            for table in tables:
                # Get row count
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = count_result.scalar()
                logger.info(f"  ✓ {table} ({count} rows)")
        
        # Create any custom indexes or constraints
        logger.info("\nCreating additional indexes...")
        with engine.begin() as conn:
            # Add any custom indexes here
            custom_indexes = [
                "CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id)",
                "CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id)",
                "CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id)",
                "CREATE INDEX IF NOT EXISTS idx_files_course_id ON files(course_id)",
                "CREATE INDEX IF NOT EXISTS idx_files_module_id ON files(module_id)",
                "CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id)",
                "CREATE INDEX IF NOT EXISTS idx_personalized_files_student_file ON personalized_files(student_id, file_id)",
                "CREATE INDEX IF NOT EXISTS idx_todos_student_course ON todos(student_id, course_id)",
                "CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)",
                "CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)",
            ]
            
            for index_sql in custom_indexes:
                try:
                    conn.execute(text(index_sql))
                    logger.info(f"  ✓ {index_sql.split('idx_')[1].split(' ')[0]}")
                except Exception as e:
                    logger.warning(f"  ⚠ Failed to create index: {e}")
        
        logger.info("\n✓ All tables created successfully!")
        
        # Show summary of table relationships
        logger.info("\n=== Table Relationships ===")
        logger.info("User tables: users -> roles, instructor_profiles, student_profiles, admin_profiles")
        logger.info("Course structure: courses -> modules -> files -> file_chunks")
        logger.info("Enrollments: students <-> courses (many-to-many via enrollments)")
        logger.info("Personalization: personalized_files, todos")
        logger.info("Communication: chats -> messages")
        logger.info("Analytics: user_stats, user_activities, user_achievements")
        logger.info("Study planning: study_plans -> study_goals, study_sessions")
        logger.info("Collaboration: study_groups, shared_annotations, peer_discussions")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_sample_data():
    """Optionally create some sample data for testing"""
    logger.info("\nCreating sample data...")
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.begin() as conn:
            # Check if we already have the test user
            result = conn.execute(
                text("SELECT COUNT(*) FROM users WHERE email = :email"),
                {"email": "tmbuwa09@gmail.com"}
            )
            if result.scalar() > 0:
                logger.info("Test user already exists, skipping sample data creation")
                return True
            
            # The test user we already created would be here
            logger.info("Sample data can be added here if needed")
            
        return True
        
    except Exception as e:
        logger.error(f"Failed to create sample data: {e}")
        return False

if __name__ == "__main__":
    logger.info("=== Supabase Table Creation ===")
    
    # Create all tables
    if create_all_tables():
        # Optionally create sample data
        # create_sample_data()
        
        logger.info("\n✓ Setup completed successfully!")
        logger.info("\nNext steps:")
        logger.info("1. If you have existing data, run migrate_to_supabase.py")
        logger.info("2. Otherwise, you can start using the application with empty tables")
    else:
        logger.error("\n✗ Setup failed!")
        sys.exit(1)
#!/usr/bin/env python3
"""
Migrate all tables and data from existing database to Supabase
"""
import os
import sys
from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.orm import sessionmaker
import logging
import json
from datetime import datetime

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URLs
SOURCE_DB_URL = os.getenv('SOURCE_DATABASE_URL', '')  # Your existing database
TARGET_DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

# Tables in dependency order (parents before children)
TABLE_ORDER = [
    # Base user tables
    'users',
    'roles', 
    'instructor_profiles',
    'student_profiles',
    'admin_profiles',
    
    # Course related
    'courses',
    'modules',
    'files',
    'file_chunks',
    'access_codes',
    'enrollments',
    'personalized_files',
    'todos',
    
    # Chat/Message
    'chats',
    'messages',
    
    # Analytics/Stats
    'reports',
    'markets',
    'news',
    'user_stats',
    'user_activities',
    'user_achievements',
    'api_usage_logs',
    
    # Study planning
    'study_plans',
    'study_goals',
    'study_sessions',
    'study_recommendations',
    'goal_progress',
    'session_notes',
    'user_schedule_preferences',
    'session_analytics',
    'ai_session_suggestions',
    
    # Collaboration
    'study_groups',
    'study_group_members',
    'shared_annotations',
    'peer_discussions',
    'discussion_replies',
    'collaborative_notes',
    'note_edit_operations',
    'collaborative_study_sessions',
    'study_session_participants',
    'user_collaboration_preferences',
    'annotation_reactions',
    'discussion_votes'
]

def check_source_database():
    """Check if we can connect to source database and list tables"""
    if not SOURCE_DB_URL:
        logger.error("SOURCE_DATABASE_URL not set. Please set it to your existing database URL.")
        logger.info("Example: export SOURCE_DATABASE_URL='postgresql://user:pass@host:port/dbname'")
        return False
    
    try:
        engine = create_engine(SOURCE_DB_URL)
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            tables = [row[0] for row in result]
            logger.info(f"Found {len(tables)} tables in source database:")
            for table in tables:
                logger.info(f"  - {table}")
            return True
    except Exception as e:
        logger.error(f"Failed to connect to source database: {e}")
        return False

def create_schema_from_file():
    """Create schema in target database from schema.py file"""
    try:
        from db.schema import Base
        
        logger.info("Creating schema in target database...")
        target_engine = create_engine(TARGET_DB_URL)
        
        # Create all tables
        Base.metadata.create_all(target_engine)
        logger.info("Schema created successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to create schema: {e}")
        return False

def migrate_table_data(source_engine, target_engine, table_name):
    """Migrate data from one table to another"""
    try:
        # Check if table exists in source
        with source_engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table_name}'
                )
            """))
            if not result.scalar():
                logger.warning(f"Table {table_name} does not exist in source database, skipping")
                return True
        
        # Get row count
        with source_engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            count = result.scalar()
            
        if count == 0:
            logger.info(f"Table {table_name} is empty, skipping")
            return True
            
        logger.info(f"Migrating {count} rows from {table_name}...")
        
        # For large tables, use chunking
        chunk_size = 1000
        offset = 0
        
        while offset < count:
            with source_engine.connect() as source_conn:
                # Get chunk of data
                result = source_conn.execute(text(f"""
                    SELECT * FROM {table_name} 
                    ORDER BY 1 
                    LIMIT {chunk_size} 
                    OFFSET {offset}
                """))
                
                rows = result.fetchall()
                if not rows:
                    break
                
                # Insert into target
                with target_engine.begin() as target_conn:
                    # Get column names
                    columns = result.keys()
                    
                    # Build insert query
                    placeholders = ', '.join([f':{col}' for col in columns])
                    column_list = ', '.join(columns)
                    
                    insert_query = f"""
                        INSERT INTO {table_name} ({column_list}) 
                        VALUES ({placeholders})
                        ON CONFLICT DO NOTHING
                    """
                    
                    # Execute batch insert
                    for row in rows:
                        row_dict = dict(zip(columns, row))
                        target_conn.execute(text(insert_query), row_dict)
                
                offset += chunk_size
                logger.info(f"  Migrated {min(offset, count)}/{count} rows")
        
        logger.info(f"✓ Completed migration of {table_name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to migrate {table_name}: {e}")
        return False

def migrate_all():
    """Perform complete migration"""
    logger.info("Starting database migration to Supabase...")
    
    # Check source database
    if not check_source_database():
        return False
    
    # Create schema in target
    if not create_schema_from_file():
        return False
    
    # Connect to both databases
    source_engine = create_engine(SOURCE_DB_URL)
    target_engine = create_engine(TARGET_DB_URL)
    
    # Migrate each table
    success_count = 0
    failed_tables = []
    
    for table_name in TABLE_ORDER:
        if migrate_table_data(source_engine, target_engine, table_name):
            success_count += 1
        else:
            failed_tables.append(table_name)
    
    # Summary
    logger.info("\n=== Migration Summary ===")
    logger.info(f"Successfully migrated: {success_count}/{len(TABLE_ORDER)} tables")
    
    if failed_tables:
        logger.error(f"Failed tables: {', '.join(failed_tables)}")
        return False
    
    # Verify target database
    with target_engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        
        logger.info("\nTarget database tables:")
        for row in result:
            logger.info(f"  - {row[0]} ({row[1]} columns)")
    
    logger.info("\n✓ Migration completed successfully!")
    return True

if __name__ == "__main__":
    # First, let's just check what needs to be done
    if not SOURCE_DB_URL:
        logger.info("\n=== Migration Prerequisites ===")
        logger.info("1. Set SOURCE_DATABASE_URL environment variable to your existing database")
        logger.info("   Example: export SOURCE_DATABASE_URL='postgresql://user:pass@host:port/dbname'")
        logger.info("2. Ensure TARGET database (Supabase) is accessible")
        logger.info("3. Run this script again")
        sys.exit(1)
    
    success = migrate_all()
    sys.exit(0 if success else 1)
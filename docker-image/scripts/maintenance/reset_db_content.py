#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_connection():
    """Create a connection to the PostgreSQL database."""
    load_dotenv()
    
    # Get database URL from environment variables
    database_url = os.getenv('POSTGRES_URL')
    if not database_url:
        raise ValueError("POSTGRES_URL environment variable is not set")
    
    try:
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")
        raise

def reset_database_content():
    """Reset all database content while preserving table structure."""
    
    # Tables that need to be cleared
    # Order will be reversed in the loop to respect foreign key constraints
    tables_to_clear = [
        'User',              # Parent table (will be deleted last)
        'Role',              # Child of User
        'AdminProfile',      # Child of User
        'StudentProfile',    # Child of User
        'InstructorProfile', # Child of User
        'Course',            # Child of InstructorProfile and User
        'Report',            # Child of Course
        'AccessCode',        # Child of Course
        'Enrollment',        # Child of StudentProfile and Course
        'Module',            # Child of Course
        'File',              # Child of Module
        'FileChunk',         # Child of File and Course
        'PersonalizedFile',  # Child of StudentProfile and File
        'Chat',              # Child of StudentProfile and File
        'Message',           # Child of Chat
        'Market',            # Independent table
        'News',              # Independent table
        'migrations'         # Clear migration history for fresh start
    ]
    
    try:
        conn = get_connection()
        
        logger.info("Starting database content reset...")
        
        with conn.cursor() as cur:
            # Use DELETE instead of TRUNCATE to avoid permission issues
            # Process tables in reverse order due to foreign key constraints
            
            for table in reversed(tables_to_clear):
                try:
                    # Check if table exists first
                    cur.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = %s
                        );
                    """, (table,))
                    
                    table_exists = cur.fetchone()[0]
                    
                    if table_exists:
                        logger.info(f"Clearing table: {table}")
                        # Use DELETE FROM instead of TRUNCATE for better compatibility
                        cur.execute(f"DELETE FROM \"{table}\";")
                        
                        # Get count of remaining rows to verify
                        cur.execute(f"SELECT COUNT(*) FROM \"{table}\";")
                        remaining_count = cur.fetchone()[0]
                        
                        if remaining_count == 0:
                            logger.info(f"✓ Cleared table: {table}")
                        else:
                            logger.warning(f"⚠️  Table {table} still has {remaining_count} rows")
                    else:
                        logger.warning(f"Table {table} does not exist, skipping...")
                        
                except Exception as e:
                    logger.error(f"Error clearing table {table}: {e}")
                    # Continue with other tables even if one fails
                    continue
            
            # Reset sequences to start from 1 (for any SERIAL columns)
            logger.info("Resetting sequences...")
            cur.execute("""
                SELECT sequence_name FROM information_schema.sequences 
                WHERE sequence_schema = 'public';
            """)
            
            sequences = cur.fetchall()
            for (sequence_name,) in sequences:
                try:
                    cur.execute(f"ALTER SEQUENCE {sequence_name} RESTART WITH 1;")
                    logger.info(f"✓ Reset sequence: {sequence_name}")
                except Exception as e:
                    logger.warning(f"Could not reset sequence {sequence_name}: {e}")
        
        logger.info("✅ Database content reset completed successfully!")
        logger.info("All tables are now empty but structure is preserved.")
        
    except Exception as e:
        logger.error(f"Database reset failed: {e}")
        return 1
    finally:
        if 'conn' in locals():
            conn.close()
    
    return 0

def confirm_reset():
    """Ask for user confirmation before proceeding."""
    print("\n⚠️  WARNING: This will delete ALL data from the database!")
    print("Tables will be preserved, but all content will be permanently lost.")
    print("\nThis includes:")
    print("- All users and profiles")
    print("- All courses and modules")
    print("- All files and content")
    print("- All chats and messages")
    print("- All enrollments")
    print("- All personalized content")
    print("- Market and news data")
    
    response = input("\nAre you sure you want to proceed? (yes/no): ").strip().lower()
    return response in ['yes', 'y']

def main():
    """Main function."""
    print("🗃️  Database Content Reset Tool")
    print("================================")
    
    if not confirm_reset():
        print("❌ Operation cancelled.")
        return 0
    
    return reset_database_content()

if __name__ == "__main__":
    exit(main()) 
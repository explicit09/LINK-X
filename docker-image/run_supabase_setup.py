#!/usr/bin/env python3
"""
Run Supabase setup migrations directly
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('.env')

def run_setup():
    """Run Supabase setup migrations"""
    # Get database URL
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not set")
    
    logger.info(f"Connecting to database...")
    
    # Connect to database
    conn = psycopg2.connect(database_url)
    conn.autocommit = True  # Enable autocommit for DDL statements
    cur = conn.cursor()
    
    try:
        # First, let's check if storage schema exists
        cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'storage';")
        if not cur.fetchone():
            logger.warning("Storage schema not found. This needs to be enabled in Supabase Dashboard.")
            logger.info("Please go to your Supabase Dashboard > Storage and enable Storage.")
            return
        
        # Check if extensions are available
        extensions_to_check = ['vector', 'pgmq', 'pg_net', 'pg_cron', 'hstore']
        for ext in extensions_to_check:
            cur.execute(f"SELECT * FROM pg_available_extensions WHERE name = '{ext}';")
            result = cur.fetchone()
            if result:
                logger.info(f"✓ Extension {ext} is available")
            else:
                logger.warning(f"⚠️  Extension {ext} is not available")
        
        # Create utility functions for storage (in public schema)
        logger.info("\nCreating storage helper functions...")
        
        # Helper function to extract course_id
        cur.execute("""
            CREATE OR REPLACE FUNCTION public.get_course_id_from_path(object_path text)
            RETURNS uuid AS $$
            BEGIN
                RETURN (string_to_array(object_path, '/'))[2]::uuid;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL;
            END;
            $$ LANGUAGE plpgsql IMMUTABLE;
        """)
        logger.info("✓ Created get_course_id_from_path function")
        
        # Helper function to extract module_id
        cur.execute("""
            CREATE OR REPLACE FUNCTION public.get_module_id_from_path(object_path text)
            RETURNS uuid AS $$
            BEGIN
                RETURN (string_to_array(object_path, '/'))[4]::uuid;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL;
            END;
            $$ LANGUAGE plpgsql IMMUTABLE;
        """)
        logger.info("✓ Created get_module_id_from_path function")
        
        # Add columns to support storage
        logger.info("\nUpdating database schema...")
        
        # Update files table
        cur.execute("""
            ALTER TABLE files
            ADD COLUMN IF NOT EXISTS storage_path TEXT,
            ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'course-files',
            ADD COLUMN IF NOT EXISTS storage_metadata JSONB;
        """)
        logger.info("✓ Updated files table")
        
        # Add column to courses table
        cur.execute("""
            ALTER TABLE courses 
            ADD COLUMN IF NOT EXISTS allow_student_uploads BOOLEAN DEFAULT false;
        """)
        logger.info("✓ Updated courses table")
        
        # Create index
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_files_storage_path ON files(storage_path);
        """)
        logger.info("✓ Created storage path index")
        
        # Update file_chunks table for embeddings
        cur.execute("""
            ALTER TABLE file_chunks
            ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP;
        """)
        logger.info("✓ Updated file_chunks table")
        
        # Create indexes for embedding management
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_file_chunks_missing_embeddings 
            ON file_chunks(id) 
            WHERE embedding IS NULL AND content IS NOT NULL;
        """)
        logger.info("✓ Created missing embeddings index")
        
        logger.info("\n✅ Database setup completed successfully!")
        logger.info("\n⚠️  IMPORTANT NEXT STEPS:")
        logger.info("1. Enable Storage in Supabase Dashboard if not already enabled")
        logger.info("2. Create 'course-files' bucket in Storage section")
        logger.info("3. Enable required extensions: pgmq, pg_net, pg_cron")
        logger.info("4. Deploy the Edge Function for automatic embeddings")
        logger.info("5. Set up storage policies using the SQL in migrations/supabase_storage_setup.sql")
        
    except Exception as e:
        logger.error(f"Error during setup: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_setup()
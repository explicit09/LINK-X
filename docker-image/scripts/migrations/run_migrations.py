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

def run_migration(conn, migration_file):
    """Run a single migration file."""
    try:
        with open(migration_file, 'r') as f:
            sql = f.read()
            
        with conn.cursor() as cur:
            logger.info(f"Running migration: {migration_file}")
            cur.execute(sql)
            logger.info(f"Successfully applied migration: {migration_file}")
            
    except Exception as e:
        logger.error(f"Error running migration {migration_file}: {e}")
        raise

def get_migration_files():
    """Get all migration files in order."""
    migrations_dir = os.path.join(os.path.dirname(__file__), 'db', 'migrations')
    migration_files = []
    
    for filename in sorted(os.listdir(migrations_dir)):
        if filename.endswith('.sql'):
            migration_files.append(os.path.join(migrations_dir, filename))
    
    return migration_files

def check_migrations_table(conn):
    """Check if migrations table exists, create if not."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)

def get_applied_migrations(conn):
    """Get list of already applied migrations."""
    with conn.cursor() as cur:
        cur.execute("SELECT filename FROM migrations ORDER BY id")
        return [row[0] for row in cur.fetchall()]

def mark_migration_applied(conn, filename):
    """Mark a migration as applied."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO migrations (filename) VALUES (%s) ON CONFLICT DO NOTHING",
            (os.path.basename(filename),)
        )

def main():
    """Main function to run all pending migrations."""
    try:
        conn = get_connection()
        
        # Ensure migrations table exists
        check_migrations_table(conn)
        
        # Get applied migrations
        applied_migrations = get_applied_migrations(conn)
        
        # Get all migration files
        migration_files = get_migration_files()
        
        # Run pending migrations
        for migration_file in migration_files:
            filename = os.path.basename(migration_file)
            if filename not in applied_migrations:
                run_migration(conn, migration_file)
                mark_migration_applied(conn, migration_file)
        
        logger.info("All migrations completed successfully")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return 1
    finally:
        if 'conn' in locals():
            conn.close()
    
    return 0

if __name__ == "__main__":
    exit(main())

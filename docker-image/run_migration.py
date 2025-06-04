#!/usr/bin/env python3
"""
Run database migration to create gamification tables
"""
import os
import sys
import psycopg2
from urllib.parse import urlparse

def run_migration():
    """Run the gamification migration SQL"""
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        return False
    
    # Read migration file
    migration_path = '/app/src/db/migrations/0013_add_gamification_tables.sql'
    try:
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
    except FileNotFoundError:
        print(f"ERROR: Migration file not found: {migration_path}")
        return False
    
    # Connect to database and run migration
    try:
        # Parse database URL
        parsed = urlparse(database_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],  # Remove leading slash
            user=parsed.username,
            password=parsed.password
        )
        
        with conn.cursor() as cursor:
            print("Running gamification migration...")
            cursor.execute(migration_sql)
            conn.commit()
            print("Migration completed successfully!")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"ERROR running migration: {e}")
        return False

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)
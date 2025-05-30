# Migration script to add description column to Module table

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

def run_migration():
    try:
        print("Starting migration to add description column to Module table...")
        
        # Get database connection details from environment
        database_url = os.environ.get('DATABASE_URL')
        
        if database_url:
            from urllib.parse import urlparse
            parsed = urlparse(database_url)
            db_host = parsed.hostname
            db_name = parsed.path[1:]
            db_user = parsed.username
            db_password = parsed.password
        else:
            db_host = os.environ.get('DATABASE_HOST', os.environ.get('POSTGRES_HOST'))
            db_name = os.environ.get('DATABASE_NAME', os.environ.get('POSTGRES_DB'))
            db_user = os.environ.get('DATABASE_USER', os.environ.get('POSTGRES_USER'))
            db_password = os.environ.get('DATABASE_PASSWORD', os.environ.get('POSTGRES_PASSWORD'))
        
        if not all([db_host, db_name, db_user, db_password]):
            raise ValueError("Missing required database configuration")
        
        # Try different host names that might work in Docker
        hosts_to_try = ['postgres', 'db', 'localhost', '127.0.0.1']
        
        # Try to connect to each host
        connected = False
        for host in hosts_to_try:
            try:
                print(f"Trying to connect to database at {host}...")
                conn = psycopg2.connect(
                    host=host,
                    dbname=db_name,
                    user=db_user,
                    password=db_password,
                    connect_timeout=3
                )
                connected = True
                print(f"Successfully connected to database at {host}")
                break
            except Exception as e:
                print(f"Failed to connect to {host}: {str(e)}")
        
        if not connected:
            print("Could not connect to database. Please check your connection settings.")
            return False
        
        # Set isolation level to autocommit
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        # Create cursor and execute the ALTER TABLE statement
        with conn.cursor() as cursor:
            print("Executing ALTER TABLE statement...")
            cursor.execute('ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;')
            print("SQL command executed successfully")
        
        # Close connection
        conn.close()
        print("Migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)

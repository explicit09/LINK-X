# Direct approach to fix the Module table schema
# This script will be executed inside the backend container

import os
import sys
import psycopg2

def run_migration():
    try:
        print("Starting migration to add description column to Module table...")
        
        # Read database connection details from environment variables
        # Support both DATABASE_URL and individual variables
        database_url = os.environ.get('DATABASE_URL')
        
        if database_url:
            # Parse DATABASE_URL
            from urllib.parse import urlparse
            parsed = urlparse(database_url)
            db_host = parsed.hostname
            db_port = parsed.port or 5432
            db_name = parsed.path[1:]  # Remove leading slash
            db_user = parsed.username
            db_password = parsed.password
        else:
            # Use individual environment variables
            db_host = os.environ.get('DATABASE_HOST', os.environ.get('POSTGRES_HOST'))
            db_port = os.environ.get('DATABASE_PORT', os.environ.get('POSTGRES_PORT', '5432'))
            db_name = os.environ.get('DATABASE_NAME', os.environ.get('POSTGRES_DB'))
            db_user = os.environ.get('DATABASE_USER', os.environ.get('POSTGRES_USER'))
            db_password = os.environ.get('DATABASE_PASSWORD', os.environ.get('POSTGRES_PASSWORD'))
        
        # Validate required configuration
        if not all([db_host, db_name, db_user, db_password]):
            print("ERROR: Missing required database configuration")
            print("Please set either DATABASE_URL or DATABASE_HOST, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD")
            return False
        
        # Try different host names if connection fails
        hosts_to_try = [db_host, 'postgres', 'db', 'localhost', '127.0.0.1']
        
        conn = None
        for host in hosts_to_try:
            try:
                conn_string = f"host={host} port={db_port} dbname={db_name} user={db_user} password={db_password}"
                # Never log connection string with password
                print(f"Trying to connect to: host={host} port={db_port} dbname={db_name} user={db_user}")
                conn = psycopg2.connect(conn_string, connect_timeout=5)
                print(f"Successfully connected to {host}")
                break
            except Exception as e:
                print(f"Failed to connect to {host}: {str(e)}")
                continue
        
        if not conn:
            print("Could not connect to any database host")
            return False
        
        # Set autocommit mode
        conn.autocommit = True
        
        # Create cursor and execute the ALTER TABLE statement
        cursor = conn.cursor()
        print("Executing ALTER TABLE statement...")
        cursor.execute('ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;')
        
        # Close cursor and connection
        cursor.close()
        conn.close()
        
        print("Migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

if __name__ == '__main__':
    run_migration()

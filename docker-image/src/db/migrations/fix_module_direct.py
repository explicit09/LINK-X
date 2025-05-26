# Direct approach to fix the Module table schema
# This script will be executed inside the backend container

import os
import sys
import psycopg2

def run_migration():
    try:
        print("Starting migration to add description column to Module table...")
        
        # Try to read database connection details from environment variables
        db_host = os.environ.get('POSTGRES_HOST')
        db_port = os.environ.get('POSTGRES_PORT', '5432')
        db_name = os.environ.get('POSTGRES_DB')
        db_user = os.environ.get('POSTGRES_USER')
        db_password = os.environ.get('POSTGRES_PASSWORD')
        
        # If any of these are missing, try common defaults
        if not db_host:
            db_host = 'postgres'
        if not db_name:
            db_name = 'coralx'
        if not db_user:
            db_user = 'postgres'
        if not db_password:
            db_password = 'postgres'
        
        # Try different host names if connection fails
        hosts_to_try = [db_host, 'postgres', 'db', 'localhost', '127.0.0.1']
        
        conn = None
        for host in hosts_to_try:
            try:
                conn_string = f"host={host} port={db_port} dbname={db_name} user={db_user} password={db_password}"
                print(f"Trying to connect to: {conn_string}")
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

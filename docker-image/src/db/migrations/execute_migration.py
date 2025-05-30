import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def run_migration():
    try:
        print("Starting migration to add description column to Module table...")
        
        # Get database connection parameters from environment variables
        database_url = os.environ.get('DATABASE_URL')
        
        if database_url:
            # Parse DATABASE_URL
            from urllib.parse import urlparse
            parsed = urlparse(database_url)
            db_host = parsed.hostname
            db_port = parsed.port or 5432
            db_name = parsed.path[1:]
            db_user = parsed.username
            db_password = parsed.password
        else:
            # Use individual variables (no defaults for security)
            db_host = os.environ.get('DATABASE_HOST', os.environ.get('POSTGRES_HOST'))
            db_port = os.environ.get('DATABASE_PORT', os.environ.get('POSTGRES_PORT', '5432'))
            db_name = os.environ.get('DATABASE_NAME', os.environ.get('POSTGRES_DB'))
            db_user = os.environ.get('DATABASE_USER', os.environ.get('POSTGRES_USER'))
            db_password = os.environ.get('DATABASE_PASSWORD', os.environ.get('POSTGRES_PASSWORD'))
        
        if not all([db_host, db_name, db_user, db_password]):
            raise ValueError("Missing required database configuration. Please set DATABASE_URL or individual DATABASE_* variables.")
        
        # Connect directly using psycopg2
        conn_string = f"host={db_host} port={db_port} dbname={db_name} user={db_user} password={db_password}"
        # Never log connection string with password
        print(f"Connecting to database: host={db_host} port={db_port} dbname={db_name} user={db_user}")
        
        conn = psycopg2.connect(conn_string)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # Execute the ALTER TABLE statement
        print("Executing ALTER TABLE statement...")
        cursor.execute('ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;')
        
        # Close the cursor and connection
        cursor.close()
        conn.close()
        
        print("Migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

if __name__ == '__main__':
    run_migration()

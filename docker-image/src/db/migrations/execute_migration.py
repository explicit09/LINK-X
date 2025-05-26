import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def run_migration():
    try:
        print("Starting migration to add description column to Module table...")
        
        # Get database connection parameters from environment variables
        db_host = os.environ.get('POSTGRES_HOST', 'db')
        db_port = os.environ.get('POSTGRES_PORT', '5432')
        db_name = os.environ.get('POSTGRES_DB', 'coralx')
        db_user = os.environ.get('POSTGRES_USER', 'postgres')
        db_password = os.environ.get('POSTGRES_PASSWORD', 'postgres')
        
        # Connect directly using psycopg2
        conn_string = f"host={db_host} port={db_port} dbname={db_name} user={db_user} password={db_password}"
        print(f"Connecting to database: {conn_string}")
        
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

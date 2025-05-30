from sqlalchemy import create_engine, text
import os

def run_migration():
    try:
        print("Starting migration to add description column to Module table...")
        # Get database URL from environment (same as in connection.py)
        postgres_url = os.getenv("POSTGRES_URL")
        if not postgres_url:
            raise ValueError("POSTGRES_URL environment variable not set")
            
        print(f"Connecting to database...")
        engine = create_engine(postgres_url)
        
        with engine.connect() as conn:
            print(f"Executing ALTER TABLE statement...")
            conn.execute(text('ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;'))
            conn.commit()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {str(e)}")

if __name__ == '__main__':
    run_migration()

# Simple script to add the description column to the Module table
# This script uses the existing SQLAlchemy engine from the backend

from sqlalchemy import text
from src.db.connection import engine

def run_migration():
    try:
        print("Starting migration to add description column to Module table...")
        
        with engine.connect() as conn:
            print("Executing ALTER TABLE statement...")
            conn.execute(text('ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;'))
            conn.commit()
            
        print("Migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

if __name__ == '__main__':
    run_migration()

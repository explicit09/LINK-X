# Simple script to add description column to Module table
# This script uses the existing database connection in the application

from sqlalchemy import text
import sys

# Import the database session from your application
from db.connection import engine

def add_description_column():
    try:
        print("Starting to add description column to Module table...")
        
        # Execute the ALTER TABLE statement
        with engine.connect() as conn:
            print("Executing ALTER TABLE statement...")
            conn.execute(text('ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;'))
            conn.commit()
            print("SQL command executed successfully")
        
        print("Column added successfully!")
        return True
    except Exception as e:
        print(f"Failed to add column: {str(e)}")
        return False

if __name__ == '__main__':
    success = add_description_column()
    sys.exit(0 if success else 1)

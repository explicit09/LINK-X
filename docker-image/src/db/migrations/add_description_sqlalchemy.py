# Migration script using SQLAlchemy to add description column to Module table

from sqlalchemy import create_engine, text
import os
import sys

# This script will be executed inside the Flask app context
# to leverage the existing database connection

def run_migration():
    try:
        print("Starting migration to add description column to Module table...")
        
        # Import the app and get the database connection
        from src.app import app, db
        
        with app.app_context():
            # Execute raw SQL using SQLAlchemy
            print("Executing ALTER TABLE statement...")
            db.session.execute(text('ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;'))
            db.session.commit()
            print("SQL command executed successfully")
        
        print("Migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)

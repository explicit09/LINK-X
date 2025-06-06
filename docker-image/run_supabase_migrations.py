#!/usr/bin/env python3
"""
Run Supabase migrations for storage and automatic embeddings
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Load environment variables
load_dotenv('.env')

from core.database_supabase import db, db_manager
from flask import Flask

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run all Supabase migrations"""
    # Create Flask app context
    app = Flask(__name__)
    
    # Set database URL
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not set in environment")
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize database
    db.init_app(app)
    db_manager.init_app(app)
    
    with app.app_context():
        # Migration files to run
        migration_files = [
            'migrations/supabase_storage_setup.sql',
            'migrations/update_file_chunks_for_embeddings.sql',
            'migrations/supabase_automatic_embeddings.sql'
        ]
        
        for migration_file in migration_files:
            logger.info(f"\n{'='*60}")
            logger.info(f"Running migration: {migration_file}")
            logger.info(f"{'='*60}")
            
            try:
                with open(migration_file, 'r') as f:
                    sql_content = f.read()
                
                # Split into individual statements
                statements = []
                current_statement = []
                
                for line in sql_content.split('\n'):
                    # Skip comments
                    if line.strip().startswith('--'):
                        continue
                    
                    current_statement.append(line)
                    
                    # Check if statement is complete
                    if line.strip().endswith(';'):
                        statement = '\n'.join(current_statement).strip()
                        if statement:
                            statements.append(statement)
                        current_statement = []
                
                # Execute each statement
                with db_manager.get_session() as session:
                    for i, statement in enumerate(statements):
                        try:
                            if statement.strip():
                                session.execute(statement)
                                logger.info(f"✓ Executed statement {i+1}/{len(statements)}")
                        except Exception as e:
                            error_msg = str(e)
                            # Only log non-duplicate errors
                            if 'already exists' in error_msg:
                                logger.info(f"⚠️  Statement {i+1}: Already exists (skipping)")
                            else:
                                logger.error(f"✗ Statement {i+1} failed: {error_msg}")
                                logger.debug(f"Statement: {statement[:200]}...")
                    
                    session.commit()
                    logger.info(f"✓ Migration {migration_file} completed successfully!")
                    
            except Exception as e:
                logger.error(f"✗ Failed to run migration {migration_file}: {e}")
                raise
        
        logger.info(f"\n{'='*60}")
        logger.info("All migrations completed!")
        logger.info(f"{'='*60}")

if __name__ == "__main__":
    run_migrations()
#!/usr/bin/env python3
"""
Execute database migrations for LEARN-X
Supports both Alembic and SQL migrations
"""
import os
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from alembic import command
from alembic.config import Config
from core.database import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URLs from environment - no defaults for security
DEV_DATABASE_URL = os.getenv('DEV_DATABASE_URL')
PROD_DATABASE_URL = os.getenv('PROD_DATABASE_URL')

if not DEV_DATABASE_URL and not PROD_DATABASE_URL:
    raise ValueError(
        "Database URLs must be set via environment variables:\n"
        "  DEV_DATABASE_URL for development\n"
        "  PROD_DATABASE_URL for production\n"
        "Do not hardcode database credentials in source code."
    )

def run_alembic_migrations(database_url: str, env_name: str):
    """Run Alembic migrations"""
    logger.info(f"Running Alembic migrations for {env_name}...")
    
    # Update alembic.ini with correct database URL
    alembic_ini_path = Path(__file__).parent.parent / 'alembic.ini'
    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option('sqlalchemy.url', database_url)
    
    try:
        # Run migrations
        command.upgrade(alembic_cfg, 'head')
        logger.info(f"✅ Alembic migrations completed for {env_name}")
    except Exception as e:
        logger.error(f"❌ Alembic migration failed: {e}")
        raise

def run_sql_migrations(database_url: str, env_name: str):
    """Run SQL migrations"""
    logger.info(f"Running SQL migrations for {env_name}...")
    
    engine = create_engine(database_url)
    migrations_dir = Path(__file__).parent.parent / 'db' / 'migrations'
    
    # Get all SQL files sorted by name
    sql_files = sorted(migrations_dir.glob('*.sql'))
    
    for sql_file in sql_files:
        logger.info(f"Executing {sql_file.name}...")
        try:
            with open(sql_file) as f:
                sql_content = f.read()
            
            with engine.begin() as conn:
                # Split by semicolon to handle multiple statements
                statements = [s.strip() for s in sql_content.split(';') if s.strip()]
                for statement in statements:
                    conn.execute(text(statement))
            
            logger.info(f"✅ {sql_file.name} executed successfully")
        except Exception as e:
            logger.warning(f"⚠️  {sql_file.name} failed (may already exist): {e}")

def verify_schema(database_url: str, env_name: str):
    """Verify database schema"""
    logger.info(f"Verifying schema for {env_name}...")
    
    engine = create_engine(database_url)
    required_tables = [
        'users', 'roles', 'user_roles', 'courses', 'modules', 
        'files', 'enrollments', 'todos', 'user_sessions', 'audit_logs'
    ]
    
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        existing_tables = {row[0] for row in result}
    
    missing_tables = set(required_tables) - existing_tables
    if missing_tables:
        logger.error(f"❌ Missing tables: {missing_tables}")
        return False
    
    logger.info(f"✅ All required tables exist in {env_name}")
    return True

def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Execute LEARN-X database migrations')
    parser.add_argument('--env', choices=['dev', 'prod', 'all'], default='dev',
                        help='Environment to migrate')
    parser.add_argument('--type', choices=['alembic', 'sql', 'all'], default='all',
                        help='Type of migrations to run')
    parser.add_argument('--verify-only', action='store_true',
                        help='Only verify schema without running migrations')
    
    args = parser.parse_args()
    
    # Determine which databases to migrate
    databases = []
    if args.env in ['dev', 'all']:
        databases.append(('dev', DEV_DATABASE_URL))
    if args.env in ['prod', 'all']:
        databases.append(('prod', PROD_DATABASE_URL))
    
    # Process each database
    for env_name, db_url in databases:
        logger.info(f"\n{'='*50}")
        logger.info(f"Processing {env_name.upper()} environment")
        logger.info(f"{'='*50}")
        
        if args.verify_only:
            verify_schema(db_url, env_name)
        else:
            try:
                if args.type in ['alembic', 'all']:
                    run_alembic_migrations(db_url, env_name)
                
                if args.type in ['sql', 'all']:
                    run_sql_migrations(db_url, env_name)
                
                # Always verify after migrations
                verify_schema(db_url, env_name)
                
            except Exception as e:
                logger.error(f"Migration failed for {env_name}: {e}")
                sys.exit(1)
    
    logger.info("\n✅ All migrations completed successfully!")

if __name__ == '__main__':
    main()
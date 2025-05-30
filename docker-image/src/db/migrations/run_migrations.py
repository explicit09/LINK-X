# Database migration utilities

from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

def run_migrations(engine):
    """Run all pending database migrations"""
    try:
        logger.info("Running database migrations...")
        
        # Add migrations here
        add_module_description_column(engine)
        
        logger.info("Database migrations completed successfully")
    except Exception as e:
        logger.error(f"Error running migrations: {str(e)}")

def add_module_description_column(engine):
    """Add description column to Module table if it doesn't exist"""
    try:
        logger.info("Adding description column to Module table...")
        
        with engine.connect() as conn:
            # Check if the column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'Module' AND column_name = 'description'
            """))
            
            # Only add the column if it doesn't exist
            if result.rowcount == 0:
                logger.info("Description column does not exist, adding it now...")
                conn.execute(text('ALTER TABLE "Module" ADD COLUMN description TEXT;'))
                conn.commit()
                logger.info("Description column added successfully")
            else:
                logger.info("Description column already exists, skipping")
                
        return True
    except Exception as e:
        logger.error(f"Failed to add description column: {str(e)}")
        return False

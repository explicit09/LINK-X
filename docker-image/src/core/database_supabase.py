"""
Database Configuration for Supabase
Replaces the existing database.py when migrating
"""
import os
import logging
from contextlib import contextmanager
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import NullPool, QueuePool
from flask_sqlalchemy import SQLAlchemy

from core.supabase_config import get_database_url

logger = logging.getLogger(__name__)

# Flask-SQLAlchemy instance
db = SQLAlchemy()

# SQLAlchemy base for models
Base = declarative_base()


class DatabaseManager:
    """
    Database manager for Supabase PostgreSQL
    Handles connections, sessions, and health checks
    """
    
    def __init__(self, app=None):
        self.engine = None
        self.session_factory = None
        self.Session = None
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize database with Flask app"""
        try:
            # Get database URL from Supabase config
            database_url = get_database_url()
            
            if not database_url:
                logger.warning("No database URL configured - running without database")
                return
            
            # Configure SQLAlchemy
            app.config['SQLALCHEMY_DATABASE_URI'] = database_url
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            # Supabase-optimized settings
            if app.config.get('FLASK_ENV') == 'production':
                # Production settings with connection pooling
                app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                    'pool_size': 20,  # Supabase handles pooling
                    'max_overflow': 40,
                    'pool_timeout': 30,
                    'pool_recycle': 1800,  # 30 minutes
                    'pool_pre_ping': True,
                    'connect_args': {
                        'connect_timeout': 10,
                        'application_name': 'learn-x-backend'
                    }
                }
            else:
                # Development settings
                app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                    'pool_size': 5,
                    'max_overflow': 10,
                    'pool_timeout': 30,
                    'pool_recycle': 1800,
                    'pool_pre_ping': True
                }
            
            # Initialize Flask-SQLAlchemy only if not already initialized
            if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
                db.init_app(app)
            
            # Create engine for direct access
            self.engine = create_engine(
                database_url,
                **app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {})
            )
            
            # Test the connection during startup
            try:
                with self.engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    result.fetchone()
                logger.info("Database connection test successful")
            except Exception as e:
                logger.error(f"Database connection test failed: {e}")
                logger.warning("Continuing without database - authentication will work but data operations will fail")
                # Don't raise - allow app to start for authentication testing
            
            # Create session factory
            self.session_factory = sessionmaker(bind=self.engine)
            self.Session = scoped_session(self.session_factory)
            
            # Add event listeners
            self._setup_listeners()
            
            logger.info("Database manager initialized with Supabase")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            logger.warning("Continuing without database - authentication will work but data operations will fail")
            # Don't raise - allow app to start for authentication testing
    
    def _setup_listeners(self):
        """Set up SQLAlchemy event listeners"""
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            # Set PostgreSQL specific settings
            cursor = dbapi_connection.cursor()
            cursor.execute("SET TIME ZONE 'UTC'")
            cursor.close()
    
    @contextmanager
    def session_scope(self):
        """
        Provide a transactional scope for database operations
        
        Usage:
            with db_manager.session_scope() as session:
                user = session.query(User).first()
        """
        session = self.Session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    def health_check(self) -> bool:
        """Check database connectivity"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    def get_pool_status(self) -> dict:
        """Get connection pool statistics"""
        pool = self.engine.pool
        return {
            'size': pool.size() if hasattr(pool, 'size') else 'N/A',
            'checked_in': pool.checkedin() if hasattr(pool, 'checkedin') else 'N/A',
            'checked_out': pool.checkedout() if hasattr(pool, 'checkedout') else 'N/A',
            'overflow': pool.overflow() if hasattr(pool, 'overflow') else 'N/A',
            'total': pool.total() if hasattr(pool, 'total') else 'N/A'
        }
    
    def close_session(self):
        """Close current database session"""
        if self.Session:
            try:
                self.Session.remove()
            except Exception as e:
                logger.debug(f"Error closing session: {e}")
    
    def close_all_connections(self):
        """Close all database connections"""
        if self.Session:
            self.Session.remove()
        if self.engine:
            self.engine.dispose()
        logger.info("All database connections closed")
    
    def get_session(self):
        """Get a new database session"""
        if not self.Session:
            raise RuntimeError("Database not initialized")
        return self.Session()
    
    def execute_raw(self, query: str, params: dict = None):
        """Execute raw SQL query"""
        with self.session_scope() as session:
            result = session.execute(text(query), params or {})
            if result.returns_rows:
                return result.fetchall()
            return result.rowcount


# Global instance
db_manager = DatabaseManager()


# Helper functions for backward compatibility
def get_db():
    """Get database session for use in repositories"""
    session = db_manager.Session()
    try:
        yield session
    finally:
        session.close()


def init_db(app):
    """Initialize database with app"""
    db_manager.init_app(app)
    return db_manager
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
        self._database_url = None
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize database with Flask app"""
        try:
            # Get database URL from Supabase config
            database_url = get_database_url()
            self._database_url = database_url
            
            if not database_url:
                logger.error("No database URL configured - creating dummy session factory for compatibility")
                # Create a dummy session factory to prevent NoneType errors
                self.session_factory = sessionmaker()
                self.Session = scoped_session(self.session_factory)
                return
            
            # Configure SQLAlchemy
            app.config['SQLALCHEMY_DATABASE_URI'] = database_url
            app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
            
            # Railway-optimized settings for memory-constrained environment
            if os.getenv('RAILWAY_ENVIRONMENT') or app.config.get('FLASK_ENV') == 'production':
                # Railway production settings with aggressive connection pooling
                app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                    'pool_size': 3,  # Very small pool for Railway
                    'max_overflow': 7,  # Small overflow
                    'pool_timeout': 30,  # Reduced timeout
                    'pool_recycle': 1800,  # 30 minutes
                    'pool_pre_ping': True,
                    'pool_reset_on_return': 'rollback',
                    'connect_args': {
                        'connect_timeout': 20,
                        'application_name': f'learn-x-railway-{os.getpid()}',
                        'sslmode': 'require'
                    }
                }
            else:
                # Development settings with minimal connections
                app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                    'pool_size': 2,  # Very small pool for dev
                    'max_overflow': 3,
                    'pool_timeout': 30,
                    'pool_recycle': 1800,  # 30 minutes
                    'pool_pre_ping': True,
                    'pool_reset_on_return': 'rollback',
                    'connect_args': {
                        'connect_timeout': 15,
                        'application_name': 'learn-x-backend',
                        'sslmode': 'require'
                    }
                }
            
            # Initialize Flask-SQLAlchemy only if not already initialized
            if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
                db.init_app(app)
            
            # Create engine for direct access
            self.engine = create_engine(
                database_url,
                **app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {})
            )
            
            # Create session factory BEFORE testing connection
            self.session_factory = sessionmaker(bind=self.engine)
            self.Session = scoped_session(self.session_factory)
            
            # Test the connection during startup (non-blocking)
            try:
                with self.engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    result.fetchone()
                logger.info("Database connection test successful")
            except Exception as e:
                logger.error(f"Database connection test failed: {e}")
                logger.warning("Session factory created but database connection failed - retrying later")
                # Don't raise - allow app to start for authentication testing
            
            # Add event listeners if engine exists
            if self.engine:
                self._setup_listeners()
            
            logger.info("Database manager initialized with Supabase")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            logger.warning("Creating fallback session factory for compatibility")
            # Create a minimal session factory to prevent NoneType errors
            try:
                if self._database_url:
                    self.engine = create_engine(
                        self._database_url,
                        pool_size=1,
                        max_overflow=0,
                        pool_timeout=10,
                        pool_pre_ping=True
                    )
                    self.session_factory = sessionmaker(bind=self.engine)
                else:
                    self.session_factory = sessionmaker()
                self.Session = scoped_session(self.session_factory)
            except Exception as inner_e:
                logger.error(f"Failed to create fallback session factory: {inner_e}")
                # Last resort: create an unbound session factory
                self.session_factory = sessionmaker()
                self.Session = scoped_session(self.session_factory)
    
    def _setup_listeners(self):
        """Set up SQLAlchemy event listeners"""
        if not self.engine:
            return
            
        @event.listens_for(self.engine, "connect")
        def set_postgresql_settings(dbapi_connection, connection_record):
            # Set PostgreSQL specific settings
            try:
                cursor = dbapi_connection.cursor()
                cursor.execute("SET TIME ZONE 'UTC'")
                cursor.close()
            except Exception as e:
                logger.warning(f"Failed to set PostgreSQL settings: {e}")
    
    @contextmanager
    def session_scope(self):
        """
        Provide a transactional scope for database operations
        
        Usage:
            with db_manager.session_scope() as session:
                user = session.query(User).first()
        """
        if not self.Session:
            raise RuntimeError("Database session factory not initialized")
            
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
        if not self.engine:
            logger.warning("No database engine available for health check")
            return False
            
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
        if not self.engine or not hasattr(self.engine, 'pool'):
            return {'status': 'No pool available'}
            
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

    def init_standalone(self, database_url: str = None, worker_id: str = "worker"):
        """Initialize database for standalone workers (without Flask app)"""
        try:
            # Get database URL from parameter or environment
            if not database_url:
                database_url = get_database_url()
            
            if not database_url:
                logger.warning("No database URL configured for standalone worker")
                # Create fallback session factory
                self.session_factory = sessionmaker()
                self.Session = scoped_session(self.session_factory)
                return
            
            # Worker-optimized settings for minimal resource usage
            engine_options = {
                'pool_size': 1,  # Minimal pool for workers
                'max_overflow': 2,
                'pool_timeout': 30,
                'pool_recycle': 1800,  # 30 minutes
                'pool_pre_ping': True,
                'pool_reset_on_return': 'rollback',
                'connect_args': {
                    'connect_timeout': 15,
                    'application_name': f'learn-x-{worker_id}',
                    'sslmode': 'require'
                }
            }
            
            # Create engine
            self.engine = create_engine(database_url, **engine_options)
            
            # Create session factory first
            self.session_factory = sessionmaker(bind=self.engine)
            self.Session = scoped_session(self.session_factory)
            
            # Test the connection
            try:
                with self.engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    result.fetchone()
                logger.info(f"Database connection test successful for {worker_id}")
            except Exception as e:
                logger.error(f"Database connection test failed for {worker_id}: {e}")
                # Keep session factory even if connection fails
            
            # Add event listeners
            self._setup_listeners()
            
            logger.info(f"Database manager initialized for standalone worker: {worker_id}")
            
        except Exception as e:
            logger.error(f"Standalone database initialization failed: {e}")
            # Create fallback session factory
            self.session_factory = sessionmaker()
            self.Session = scoped_session(self.session_factory)


# Global instance
db_manager = DatabaseManager()


# Helper functions for backward compatibility
def get_db():
    """Get database session for use in repositories"""
    if not db_manager.Session:
        raise RuntimeError("Database session factory not initialized")
    session = db_manager.Session()
    try:
        yield session
    finally:
        session.close()


def init_db(app):
    """Initialize database with app"""
    db_manager.init_app(app)
    return db_manager
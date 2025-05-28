from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

db = SQLAlchemy()

class DatabaseManager:
    """Database connection manager"""
    def __init__(self, app=None):
        self.engine = None
        self.session_factory = None
        self.Session = None
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize database with Flask app"""
        # Don't initialize db here as it's already initialized in the main app
        # db.init_app(app) is called in initialize_extensions
        
        # Create engine and session factory
        self.engine = create_engine(
            app.config['SQLALCHEMY_DATABASE_URI'],
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.Session = scoped_session(self.session_factory)
    
    def get_session(self):
        """Get a new database session"""
        return self.Session()
    
    def close_session(self):
        """Close the current session"""
        self.Session.remove()

# Global database manager instance
db_manager = DatabaseManager()
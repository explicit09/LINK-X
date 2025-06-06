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
        
        # Create engine and session factory with Neon-optimized settings
        self.engine = create_engine(
            app.config['SQLALCHEMY_DATABASE_URI'],
            pool_pre_ping=True,
            pool_size=5,  # Reduced for Neon
            max_overflow=10,  # Reduced for Neon
            pool_timeout=30,
            pool_recycle=300,  # 5 minutes - shorter for Neon
            connect_args={
                "sslmode": "require",
                "connect_timeout": 10,
                "application_name": "learn-x-backend"
            }
        )
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.Session = scoped_session(self.session_factory)
    
    def get_session(self):
        """Get a new database session"""
        return self.Session()
    
    def close_session(self):
        """Close the current session"""
        if self.Session:
            try:
                self.Session.remove()
            except Exception as e:
                # Ignore errors during session cleanup
                pass

# Global database manager instance
db_manager = DatabaseManager()
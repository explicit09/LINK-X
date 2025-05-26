"""
Database connection management module with retry logic.

This module provides functions for creating and managing database connections,
including connection pooling and retry logic for handling transient connection errors.
"""
import os
import time
import logging
from typing import Optional, Callable, Any
from functools import wraps

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError, DBAPIError

# Configure logging
logger = logging.getLogger(__name__)

# Connection parameters
MAX_RETRIES = 3
RETRY_DELAY = 0.5  # seconds
POOL_SIZE = 10
POOL_TIMEOUT = 30
POOL_RECYCLE = 1800  # 30 minutes

# Get database URL from environment
POSTGRES_URL = os.getenv("POSTGRES_URL")
if not POSTGRES_URL:
    raise RuntimeError("POSTGRES_URL not set")

# Create engine with connection pooling
engine = create_engine(
    POSTGRES_URL,
    pool_pre_ping=True,      # Validate connections before use
    pool_recycle=POOL_RECYCLE,  # Recycle connections every 30 minutes
    pool_size=POOL_SIZE,     # Maximum number of connections to keep
    max_overflow=20,         # Maximum number of connections above pool_size
    pool_timeout=POOL_TIMEOUT  # Seconds to wait for a connection from the pool
)

# Create sessionmaker
SessionFactory = sessionmaker(bind=engine, expire_on_commit=False)

def get_db_session() -> Session:
    """
    Get a new database session with connection pooling.
    
    Returns:
        A new SQLAlchemy Session object
    """
    return SessionFactory()

def with_db_retry(max_retries: int = MAX_RETRIES, retry_delay: float = RETRY_DELAY) -> Callable:
    """
    Decorator to retry database operations on connection errors.
    
    Args:
        max_retries: Maximum number of retry attempts
        retry_delay: Delay between retry attempts in seconds
    
    Returns:
        Decorated function with retry logic
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            retries = 0
            last_error = None
            
            while retries <= max_retries:
                try:
                    return func(*args, **kwargs)
                except (OperationalError, DBAPIError) as e:
                    last_error = e
                    error_message = str(e).lower()
                    
                    # Check if this is a connection error we should retry
                    if "connection" in error_message or "ssl" in error_message:
                        retries += 1
                        if retries <= max_retries:
                            logger.warning(
                                f"Database connection error: {e}. "
                                f"Retrying ({retries}/{max_retries}) in {retry_delay}s..."
                            )
                            time.sleep(retry_delay * retries)  # Exponential backoff
                            continue
                    
                    # If not a retryable error or max retries exceeded, re-raise
                    logger.error(f"Database error: {e}")
                    raise
            
            # We should only get here if we've exceeded max_retries
            logger.error(f"Max retries ({max_retries}) exceeded. Last error: {last_error}")
            raise last_error
        
        return wrapper
    
    return decorator

def execute_with_retry(db_func: Callable, *args, **kwargs) -> Any:
    """
    Execute a database function with retry logic.
    
    This function is useful when you don't want to decorate an entire function
    but need retry logic for a specific database operation.
    
    Args:
        db_func: The database function to execute
        *args: Arguments to pass to the function
        **kwargs: Keyword arguments to pass to the function
    
    Returns:
        The result of the database function
    """
    @with_db_retry()
    def execute():
        return db_func(*args, **kwargs)
    
    return execute() 
"""
LINK-X Backend Package
Main package initialization with unified app factory
"""

# Re-export the main app factory from app.py
from .app import create_app

# Export commonly used utilities
from .core.database import db
from .core.config import get_config

__all__ = ['create_app', 'db', 'get_config']
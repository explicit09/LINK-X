"""WSGI entry point for the application."""

import os
import sys

# Add src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the existing app
from app import app as application
from celery_app import app as celery

# For compatibility with existing deployment scripts
app = application

if __name__ == '__main__':
    application.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 8000)),
        debug=os.environ.get('FLASK_ENV') == 'development'
    )
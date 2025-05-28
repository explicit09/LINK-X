#!/usr/bin/env python3
"""
Refactored LINK-X1 Application Entry Point
This replaces the monolithic app.py with a clean modular structure
"""
import os
from . import create_app, init_celery

# Create Flask app
app = create_app()

# Initialize Celery if needed
if os.environ.get('CELERY_WORKER'):
    celery = init_celery(app)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = app.config.get('DEBUG', False)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
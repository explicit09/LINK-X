"""WSGI entry point for the application."""

import os
from . import create_app, init_celery

# Create the Flask application
app = create_app(os.environ.get('FLASK_ENV', 'production'))

# Initialize Celery if needed
celery = init_celery(app)

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 8000)),
        debug=os.environ.get('FLASK_ENV') == 'development'
    )
"""
Flask integration for performance monitoring
"""
import time
import logging
from flask import g
from prometheus_client import generate_latest

logger = logging.getLogger(__name__)

def get_metrics() -> str:
    """Get Prometheus metrics in text format"""
    return generate_latest()

def setup_performance_monitoring(app):
    """Setup performance monitoring for Flask app"""
    
    @app.before_request
    def before_request():
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            response.headers['X-Response-Time'] = f"{duration:.3f}"
        return response
    
    # Add metrics endpoint
    @app.route('/metrics')
    def metrics():
        return get_metrics(), 200, {'Content-Type': 'text/plain'}
    
    logger.info("Performance monitoring initialized")

# Alias for backward compatibility
setup_monitoring = setup_performance_monitoring
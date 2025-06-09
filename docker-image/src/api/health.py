"""Health check endpoints for monitoring and load balancer integration."""

from flask import Blueprint, jsonify, request
from sqlalchemy import text
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
import time
import os
import logging
from core.database_supabase import db, db_manager
from core.cache import cache
from core.config import get_config

logger = logging.getLogger(__name__)
bp = Blueprint('health', __name__)

@bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint optimized for Railway load balancer."""
    try:
        # Basic application health - just check if we can respond
        return jsonify({
            'status': 'healthy',
            'service': 'link-x-backend',
            'timestamp': time.time(),
            'environment': os.getenv('FLASK_ENV', 'development'),
            'railway': bool(os.getenv('RAILWAY_ENVIRONMENT'))
        }), 200
    except Exception as e:
        logger.error(f"Basic health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': time.time()
        }), 503

@bp.route('/api/v2/health', methods=['GET'])
def api_health_check():
    """API health check endpoint for Railway health checks."""
    return health_check()

@bp.route('/health/detailed', methods=['GET'])
def detailed_health_check():
    """Detailed health check with component status."""
    config = get_config()
    
    health_status = {
        'status': 'healthy',
        'service': 'link-x-backend',
        'timestamp': time.time(),
        'environment': os.getenv('FLASK_ENV', 'development'),
        'railway': bool(os.getenv('RAILWAY_ENVIRONMENT')),
        'components': {}
    }
    
    # Check database with retry logic
    db_health = check_database_health()
    health_status['components']['database'] = db_health
    if db_health['status'] == 'unhealthy':
        health_status['status'] = 'unhealthy'
    elif db_health['status'] == 'degraded':
        health_status['status'] = 'degraded'
    
    # Check Redis (non-critical)
    redis_health = check_redis_health(config)
    health_status['components']['redis'] = redis_health
    if redis_health['status'] == 'unhealthy' and health_status['status'] == 'healthy':
        health_status['status'] = 'degraded'
    
    # Check Supabase Storage (non-critical)
    storage_health = check_storage_health()
    health_status['components']['storage'] = storage_health
    
    # Add memory and worker info for Railway monitoring
    health_status['system'] = get_system_info()
    
    status_code = 200
    if health_status['status'] == 'unhealthy':
        status_code = 503
    elif health_status['status'] == 'degraded':
        status_code = 207
    
    return jsonify(health_status), status_code

def check_database_health():
    """Check database health with retry logic."""
    try:
        # First try using Flask-SQLAlchemy
        with db.engine.connect() as conn:
            result = conn.execute(text('SELECT 1 as health_check'))
            row = result.fetchone()
            if row and row[0] == 1:
                return {
                    'status': 'healthy',
                    'message': 'Database connection successful (Flask-SQLAlchemy)',
                    'method': 'flask_sqlalchemy'
                }
    except Exception as e:
        logger.warning(f"Flask-SQLAlchemy health check failed: {e}")
        
        # Fallback to db_manager
        try:
            if db_manager.health_check():
                return {
                    'status': 'healthy',
                    'message': 'Database connection successful (db_manager)',
                    'method': 'db_manager'
                }
            else:
                return {
                    'status': 'degraded',
                    'message': 'Database health check returned false',
                    'method': 'db_manager'
                }
        except Exception as e2:
            logger.error(f"Database health check failed completely: {e2}")
            return {
                'status': 'unhealthy',
                'message': f'Database connection failed: {str(e2)}',
                'method': 'none'
            }

def check_redis_health(config):
    """Check Redis health (non-critical)."""
    if not REDIS_AVAILABLE:
        return {
            'status': 'not_available',
            'message': 'Redis module not installed'
        }
    
    try:
        if hasattr(config, 'REDIS_URL') and config.REDIS_URL:
            redis_client = redis.from_url(config.REDIS_URL, socket_timeout=5)
            redis_client.ping()
            return {
                'status': 'healthy',
                'message': 'Redis connection successful'
            }
        else:
            return {
                'status': 'not_configured',
                'message': 'Redis URL not configured'
            }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'message': f'Redis connection failed: {str(e)}'
        }

def check_storage_health():
    """Check Supabase Storage health (non-critical)."""
    try:
        from core.supabase_config import get_supabase_client
        supabase = get_supabase_client()
        if not supabase:
            return {
                'status': 'not_available',
                'message': 'Supabase client not available'
            }
        
        # Try to list files in the bucket (limit 1 to make it fast)
        result = supabase.storage.from_('course-files').list(limit=1)
        return {
            'status': 'healthy',
            'message': 'Supabase storage accessible'
        }
    except Exception as e:
        return {
            'status': 'degraded',
            'message': f'Storage check failed: {str(e)}'
        }

def get_system_info():
    """Get system information for monitoring."""
    try:
        import psutil
        return {
            'memory_usage_mb': round(psutil.virtual_memory().used / 1024 / 1024, 2),
            'memory_percent': psutil.virtual_memory().percent,
            'cpu_percent': psutil.cpu_percent(interval=1),
            'workers': os.getenv('GUNICORN_WORKERS', 'unknown'),
            'process_id': os.getpid()
        }
    except ImportError:
        return {
            'workers': os.getenv('GUNICORN_WORKERS', 'unknown'),
            'process_id': os.getpid(),
            'memory_info': 'psutil not available'
        }
    except Exception as e:
        return {
            'error': f'System info collection failed: {str(e)}',
            'process_id': os.getpid()
        }

@bp.route('/ready', methods=['GET'])
def readiness_check():
    """Readiness probe for Kubernetes and Railway."""
    try:
        # Check if the application can serve requests
        db_health = check_database_health()
        if db_health['status'] in ['healthy', 'degraded']:
            return jsonify({
                'status': 'ready',
                'timestamp': time.time(),
                'database': db_health['status']
            }), 200
        else:
            return jsonify({
                'status': 'not_ready',
                'error': db_health['message'],
                'timestamp': time.time()
            }), 503
    except Exception as e:
        return jsonify({
            'status': 'not_ready',
            'error': str(e),
            'timestamp': time.time()
        }), 503

@bp.route('/live', methods=['GET'])
def liveness_check():
    """Liveness probe for Kubernetes and Railway."""
    return jsonify({
        'status': 'alive',
        'timestamp': time.time(),
        'process_id': os.getpid(),
        'railway': bool(os.getenv('RAILWAY_ENVIRONMENT'))
    }), 200

@bp.route('/cors-test', methods=['GET', 'OPTIONS'])
def cors_test():
    """Test endpoint for CORS functionality."""
    return jsonify({
        'message': 'CORS test successful',
        'timestamp': time.time(),
        'origin': request.headers.get('Origin'),
        'method': request.method
    }), 200
"""Health check endpoints for monitoring and load balancer integration."""

from flask import Blueprint, jsonify, request
from sqlalchemy import text
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
import time
from core.database_supabase import db
from core.cache import cache
from core.config import get_config

bp = Blueprint('health', __name__)

@bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'link-x-backend',
        'timestamp': time.time()
    }), 200

@bp.route('/health/detailed', methods=['GET'])
def detailed_health_check():
    """Detailed health check with component status."""
    config = get_config()
    
    health_status = {
        'status': 'healthy',
        'service': 'link-x-backend',
        'timestamp': time.time(),
        'components': {}
    }
    
    # Check database
    try:
        db.session.execute(text('SELECT 1'))
        health_status['components']['database'] = {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['components']['database'] = {
            'status': 'unhealthy',
            'message': str(e)
        }
    
    # Check Redis
    if REDIS_AVAILABLE:
        try:
            redis_client = redis.from_url(config.REDIS_URL)
            redis_client.ping()
            health_status['components']['redis'] = {
                'status': 'healthy',
                'message': 'Redis connection successful'
            }
        except Exception as e:
            health_status['status'] = 'degraded'
            health_status['components']['redis'] = {
                'status': 'unhealthy',
                'message': str(e)
            }
    else:
        health_status['components']['redis'] = {
            'status': 'not_available',
            'message': 'Redis module not installed'
        }
    
    # Check S3 (optional, don't fail health check)
    try:
        import boto3
        s3 = boto3.client('s3')
        s3.head_bucket(Bucket=config.S3_BUCKET_NAME)
        health_status['components']['s3'] = {
            'status': 'healthy',
            'message': 'S3 bucket accessible'
        }
    except Exception as e:
        health_status['components']['s3'] = {
            'status': 'degraded',
            'message': str(e)
        }
    
    status_code = 200
    if health_status['status'] == 'unhealthy':
        status_code = 503
    elif health_status['status'] == 'degraded':
        status_code = 207
    
    return jsonify(health_status), status_code

@bp.route('/ready', methods=['GET'])
def readiness_check():
    """Readiness probe for Kubernetes."""
    try:
        # Check if the application can serve requests
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'ready',
            'timestamp': time.time()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'not_ready',
            'error': str(e),
            'timestamp': time.time()
        }), 503

@bp.route('/live', methods=['GET'])
def liveness_check():
    """Liveness probe for Kubernetes."""
    return jsonify({
        'status': 'alive',
        'timestamp': time.time()
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
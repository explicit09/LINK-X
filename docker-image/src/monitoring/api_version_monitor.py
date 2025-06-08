"""
API Version Monitoring
Tracks API version usage and provides metrics for deprecation monitoring
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from collections import defaultdict
import json
import logging
from flask import Blueprint, jsonify, request, g
from sqlalchemy import text

from core.database_supabase import db
from core.decorators_unified import auth_required
from core.cache import cache

logger = logging.getLogger(__name__)

# Create monitoring blueprint
monitoring_bp = Blueprint('api_monitoring', __name__, url_prefix='/api/monitoring')


class APIVersionMonitor:
    """Monitor API version usage and deprecation metrics"""
    
    def __init__(self):
        self.metrics_cache_key = "api_version_metrics"
        self.cache_ttl = 300  # 5 minutes
    
    def log_request(self, version: str, endpoint: str, method: str, user_id: Optional[str] = None):
        """Log an API request for monitoring"""
        try:
            # Create log entry
            log_entry = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'version': version,
                'endpoint': endpoint,
                'method': method,
                'user_id': str(user_id) if user_id else None,
                'hour': datetime.now(timezone.utc).strftime('%Y-%m-%d-%H')
            }
            
            # Store in database for persistent tracking
            db.session.execute(
                text("""
                    INSERT INTO api_usage_logs 
                    (timestamp, version, endpoint, method, user_id, hour)
                    VALUES (:timestamp, :version, :endpoint, :method, :user_id, :hour)
                """),
                log_entry
            )
            db.session.commit()
            
            # Update cached metrics
            self._update_cached_metrics(log_entry)
            
        except Exception as e:
            logger.error(f"Failed to log API request: {e}")
    
    def _update_cached_metrics(self, log_entry: Dict):
        """Update cached metrics for real-time monitoring"""
        try:
            # Get current metrics from cache
            metrics = cache.get(self.metrics_cache_key) or self._init_metrics()
            
            # Update counters
            version = log_entry['version']
            metrics['total_requests'] += 1
            metrics['requests_by_version'][version] += 1
            metrics['requests_by_endpoint'][f"{version}:{log_entry['endpoint']}"] += 1
            
            # Track unique users
            if log_entry['user_id']:
                metrics['unique_users'][version].add(log_entry['user_id'])
            
            # Update hourly stats
            hour = log_entry['hour']
            metrics['hourly_requests'][hour][version] += 1
            
            # Cache updated metrics
            cache.set(self.metrics_cache_key, metrics, timeout=self.cache_ttl)
            
        except Exception as e:
            logger.error(f"Failed to update cached metrics: {e}")
    
    def _init_metrics(self) -> Dict:
        """Initialize empty metrics structure"""
        return {
            'total_requests': 0,
            'requests_by_version': defaultdict(int),
            'requests_by_endpoint': defaultdict(int),
            'unique_users': defaultdict(set),
            'hourly_requests': defaultdict(lambda: defaultdict(int)),
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
    
    def get_metrics(self, hours: int = 24) -> Dict:
        """Get API usage metrics for the specified time period"""
        try:
            # Try cache first
            cached_metrics = cache.get(self.metrics_cache_key)
            if cached_metrics:
                return self._format_metrics(cached_metrics)
            
            # Query database for metrics
            since = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            # Total requests by version
            version_stats = db.session.execute(
                text("""
                    SELECT version, COUNT(*) as count
                    FROM api_usage_logs
                    WHERE timestamp >= :since
                    GROUP BY version
                """),
                {'since': since}
            ).fetchall()
            
            # Unique users by version
            user_stats = db.session.execute(
                text("""
                    SELECT version, COUNT(DISTINCT user_id) as unique_users
                    FROM api_usage_logs
                    WHERE timestamp >= :since AND user_id IS NOT NULL
                    GROUP BY version
                """),
                {'since': since}
            ).fetchall()
            
            # Top endpoints by version
            endpoint_stats = db.session.execute(
                text("""
                    SELECT version, endpoint, method, COUNT(*) as count
                    FROM api_usage_logs
                    WHERE timestamp >= :since
                    GROUP BY version, endpoint, method
                    ORDER BY count DESC
                    LIMIT 20
                """),
                {'since': since}
            ).fetchall()
            
            # Hourly breakdown
            hourly_stats = db.session.execute(
                text("""
                    SELECT 
                        DATE_TRUNC('hour', timestamp) as hour,
                        version,
                        COUNT(*) as count
                    FROM api_usage_logs
                    WHERE timestamp >= :since
                    GROUP BY hour, version
                    ORDER BY hour
                """),
                {'since': since}
            ).fetchall()
            
            # Format and return metrics
            return {
                'period_hours': hours,
                'since': since.isoformat(),
                'total_by_version': {row.version: row.count for row in version_stats},
                'unique_users_by_version': {row.version: row.unique_users for row in user_stats},
                'top_endpoints': [
                    {
                        'version': row.version,
                        'endpoint': row.endpoint,
                        'method': row.method,
                        'count': row.count
                    }
                    for row in endpoint_stats
                ],
                'hourly_breakdown': self._format_hourly_stats(hourly_stats),
                'deprecation_stats': self._get_deprecation_stats(version_stats)
            }
            
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return {'error': str(e)}
    
    def _format_metrics(self, metrics: Dict) -> Dict:
        """Format cached metrics for response"""
        return {
            'total_requests': metrics['total_requests'],
            'requests_by_version': dict(metrics['requests_by_version']),
            'unique_users_by_version': {
                version: len(users) 
                for version, users in metrics['unique_users'].items()
            },
            'top_endpoints': self._get_top_endpoints(metrics['requests_by_endpoint']),
            'last_updated': metrics['last_updated']
        }
    
    def _get_top_endpoints(self, endpoint_counts: Dict, limit: int = 10) -> List[Dict]:
        """Get top endpoints from counts"""
        sorted_endpoints = sorted(
            endpoint_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        return [
            {
                'version': endpoint.split(':')[0],
                'endpoint': endpoint.split(':')[1],
                'count': count
            }
            for endpoint, count in sorted_endpoints
        ]
    
    def _format_hourly_stats(self, hourly_stats) -> List[Dict]:
        """Format hourly statistics"""
        hourly_data = defaultdict(lambda: {'hour': None, 'v1': 0, 'v2': 0})
        
        for row in hourly_stats:
            hour_str = row.hour.isoformat()
            hourly_data[hour_str]['hour'] = hour_str
            hourly_data[hour_str][row.version] = row.count
        
        return list(hourly_data.values())
    
    def _get_deprecation_stats(self, version_stats) -> Dict:
        """Calculate deprecation statistics"""
        total = sum(row.count for row in version_stats)
        v1_count = next((row.count for row in version_stats if row.version == 'v1'), 0)
        v2_count = next((row.count for row in version_stats if row.version == 'v2'), 0)
        
        return {
            'v1_percentage': round((v1_count / total * 100), 2) if total > 0 else 0,
            'v2_percentage': round((v2_count / total * 100), 2) if total > 0 else 0,
            'migration_progress': round((v2_count / total * 100), 2) if total > 0 else 0,
            'days_until_sunset': (datetime(2025, 12, 31) - datetime.now()).days
        }
    
    def get_user_migration_status(self) -> List[Dict]:
        """Get migration status for all active users"""
        try:
            # Get users still using v1 in the last 7 days
            v1_users = db.session.execute(
                text("""
                    SELECT 
                        u.user_id,
                        u.email,
                        COUNT(DISTINCT l.endpoint) as v1_endpoints_used,
                        MAX(l.timestamp) as last_v1_request
                    FROM (
                        SELECT DISTINCT user_id
                        FROM api_usage_logs
                        WHERE version = 'v1' 
                        AND timestamp >= :since
                        AND user_id IS NOT NULL
                    ) AS v1_user_ids
                    JOIN users u ON u.id = v1_user_ids.user_id
                    JOIN api_usage_logs l ON l.user_id = u.id AND l.version = 'v1'
                    WHERE l.timestamp >= :since
                    GROUP BY u.user_id, u.email
                    ORDER BY v1_endpoints_used DESC
                """),
                {'since': datetime.now(timezone.utc) - timedelta(days=7)}
            ).fetchall()
            
            return [
                {
                    'user_id': str(row.user_id),
                    'email': row.email,
                    'v1_endpoints_used': row.v1_endpoints_used,
                    'last_v1_request': row.last_v1_request.isoformat()
                }
                for row in v1_users
            ]
            
        except Exception as e:
            logger.error(f"Failed to get user migration status: {e}")
            return []


# Initialize monitor
api_monitor = APIVersionMonitor()


# Monitoring endpoints
@monitoring_bp.route('/version-usage', methods=['GET'])
@auth_required()
def get_version_usage():
    """Get API version usage statistics"""
    # Check if user is admin
    user = g.current_user
    if not user.role or user.role.role_type != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Get time period from query params
    hours = request.args.get('hours', 24, type=int)
    hours = min(hours, 168)  # Max 7 days
    
    metrics = api_monitor.get_metrics(hours)
    return jsonify(metrics), 200


@monitoring_bp.route('/migration-status', methods=['GET'])
@auth_required()
def get_migration_status():
    """Get user migration status"""
    # Check if user is admin
    user = g.current_user
    if not user.role or user.role.role_type != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    users = api_monitor.get_user_migration_status()
    return jsonify({
        'users_still_on_v1': len(users),
        'users': users
    }), 200


@monitoring_bp.route('/deprecation-report', methods=['GET'])
@auth_required()
def get_deprecation_report():
    """Get comprehensive deprecation report"""
    # Check if user is admin
    user = g.current_user
    if not user.role or user.role.role_type != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Get metrics for different time periods
    daily_metrics = api_monitor.get_metrics(24)
    weekly_metrics = api_monitor.get_metrics(168)
    
    # Get user migration status
    migration_status = api_monitor.get_user_migration_status()
    
    report = {
        'summary': {
            'days_until_sunset': (datetime(2025, 12, 31) - datetime.now()).days,
            'sunset_date': '2025-12-31',
            'current_date': datetime.now().date().isoformat()
        },
        'daily_stats': daily_metrics.get('deprecation_stats', {}),
        'weekly_stats': weekly_metrics.get('deprecation_stats', {}),
        'users_requiring_migration': len(migration_status),
        'migration_urgency': 'high' if len(migration_status) > 10 else 'medium',
        'recommendations': _get_migration_recommendations(migration_status, weekly_metrics)
    }
    
    return jsonify(report), 200


def _get_migration_recommendations(migration_status: List[Dict], metrics: Dict) -> List[str]:
    """Generate migration recommendations based on current status"""
    recommendations = []
    
    # Check v1 usage percentage
    v1_percentage = metrics.get('deprecation_stats', {}).get('v1_percentage', 0)
    if v1_percentage > 50:
        recommendations.append("High v1 usage detected. Consider sending migration reminders to all users.")
    elif v1_percentage > 20:
        recommendations.append("Moderate v1 usage. Target heavy v1 users with personalized migration assistance.")
    
    # Check user count
    if len(migration_status) > 20:
        recommendations.append("Many users still on v1. Consider hosting migration webinars or providing dedicated support.")
    elif len(migration_status) > 0:
        recommendations.append(f"Contact the {len(migration_status)} remaining v1 users directly to assist with migration.")
    
    # Time-based recommendations
    days_until_sunset = (datetime(2025, 12, 31) - datetime.now()).days
    if days_until_sunset < 30:
        recommendations.append("URGENT: Less than 30 days until sunset. Implement forced migration plan.")
    elif days_until_sunset < 90:
        recommendations.append("Less than 90 days until sunset. Increase migration communications frequency.")
    
    return recommendations


# Create table for API usage logs if it doesn't exist
def create_api_usage_table():
    """Create API usage logs table"""
    try:
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS api_usage_logs (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
                version VARCHAR(10) NOT NULL,
                endpoint VARCHAR(255) NOT NULL,
                method VARCHAR(10) NOT NULL,
                user_id UUID,
                hour VARCHAR(13) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_timestamp (timestamp),
                INDEX idx_version (version),
                INDEX idx_user_version (user_id, version),
                INDEX idx_hour_version (hour, version)
            )
        """))
        db.session.commit()
    except Exception as e:
        logger.error(f"Failed to create API usage table: {e}")
        db.session.rollback()
"""
Modular metrics package.
Provides organized metric collection and endpoint handling for various types of application metrics.

This package is organized into:
- endpoints.py: Flask blueprint with all metric endpoints
- collectors/: Metric collection classes organized by domain
- queries/: Database query classes organized by concern

Usage:
    from api.metrics import register_metrics_routes
    register_metrics_routes(app)

Or for individual components:
    from api.metrics.collectors.prometheus import PrometheusMetricsCollector
    from api.metrics.collectors.business import BusinessMetricsCollector
    from api.metrics.collectors.system import SystemMetricsCollector
"""

# Main exports for backward compatibility
from .endpoints import metrics_bp, register_metrics_routes

# Collector exports for advanced usage
from .collectors.prometheus import PrometheusMetricsCollector
from .collectors.business import BusinessMetricsCollector
from .collectors.system import SystemMetricsCollector

# Query exports for direct database access
from .queries.user_metrics import UserMetricsQueries
from .queries.course_metrics import CourseMetricsQueries
from .queries.performance_metrics import PerformanceMetricsQueries

__all__ = [
    # Main exports
    'metrics_bp',
    'register_metrics_routes',
    
    # Collectors
    'PrometheusMetricsCollector',
    'BusinessMetricsCollector', 
    'SystemMetricsCollector',
    
    # Queries
    'UserMetricsQueries',
    'CourseMetricsQueries',
    'PerformanceMetricsQueries'
]
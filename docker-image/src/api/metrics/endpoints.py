"""
Metrics API endpoints.
Flask blueprints for all metrics-related endpoints using the modular collector system.
"""
import logging
from datetime import datetime
from typing import Dict, Any
from flask import Blueprint, jsonify, request

from core.dependencies import get_db
from core.decorators_unified import require_auth
from core.monitoring import apm_collector, tracer
from monitoring.task_monitor import TaskMonitor

from .collectors.prometheus import PrometheusMetricsCollector
from .collectors.business import BusinessMetricsCollector
from .collectors.system import SystemMetricsCollector

logger = logging.getLogger(__name__)

# Create blueprint
metrics_bp = Blueprint('metrics', __name__, url_prefix='/api/metrics')

# Initialize collectors
prometheus_collector = PrometheusMetricsCollector()
business_collector = BusinessMetricsCollector()
system_collector = SystemMetricsCollector()


@metrics_bp.route('/prometheus')
def prometheus_metrics():
    """Standard Prometheus metrics endpoint."""
    try:
        metrics_response = prometheus_collector.get_standard_metrics()
        return metrics_response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
    except Exception as e:
        logger.error(f"Error generating Prometheus metrics: {e}")
        return f"# Error generating metrics: {str(e)}\n", 500


@metrics_bp.route('/custom')
def custom_application_metrics():
    """Custom application metrics for Prometheus scraping."""
    try:
        db = get_db()
        metrics_lines = prometheus_collector.collect_custom_metrics(db)
        
        # Add file processing queue metrics
        from monitoring.task_monitor import TaskMonitor
        task_monitor = TaskMonitor()
        queue_stats = task_monitor.get_queue_stats()
        
        for queue_name, size in queue_stats.items():
            metrics_lines.append(f"learn_x_file_queue_size {{queue=\"{queue_name}\"}} {size}")
        
        response = prometheus_collector.format_response(metrics_lines)
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating custom metrics: {e}")
        return f"# Error generating custom metrics: {str(e)}\n", 500


@metrics_bp.route('/business')
def business_metrics():
    """Business metrics endpoint."""
    try:
        db = get_db()
        metrics_lines = business_collector.collect_all_business_metrics(db)
        
        response = business_collector.format_response(metrics_lines)
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating business metrics: {e}")
        return f"# Error generating business metrics: {str(e)}\n", 500


@metrics_bp.route('/security')
def security_metrics():
    """Security-focused metrics endpoint."""
    try:
        db = get_db()
        metrics_lines = system_collector.collect_security_metrics(db)
        
        response = system_collector.format_response(metrics_lines)
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating security metrics: {e}")
        return f"# Error generating security metrics: {str(e)}\n", 500


@metrics_bp.route('/streaming')
def streaming_metrics():
    """Streaming service metrics endpoint."""
    try:
        db = get_db()
        metrics_lines = system_collector.collect_streaming_metrics(db)
        
        response = system_collector.format_response(metrics_lines)
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating streaming metrics: {e}")
        return f"# Error generating streaming metrics: {str(e)}\n", 500


@metrics_bp.route('/files')
def file_processing_metrics():
    """File processing metrics endpoint."""
    try:
        db = get_db()
        metrics_lines = system_collector.collect_file_processing_metrics(db)
        
        response = system_collector.format_response(metrics_lines)
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating file processing metrics: {e}")
        return f"# Error generating file processing metrics: {str(e)}\n", 500


@metrics_bp.route('/health')
def health_metrics():
    """System health metrics endpoint."""
    try:
        metrics_lines = system_collector.collect_health_metrics()
        
        response = system_collector.format_response(metrics_lines)
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating health metrics: {e}")
        return f"# Error generating health metrics: {str(e)}\n", 500


@metrics_bp.route('/dashboard')
@require_auth
def metrics_dashboard():
    """Metrics dashboard for internal monitoring."""
    try:
        # Get performance summary
        performance_summary = apm_collector.get_performance_summary(hours=24)
        
        # Get recent traces
        recent_traces = tracer.get_recent_traces(limit=20)
        
        # Get system metrics
        system_metrics = apm_collector.collect_system_metrics()
        
        # Get task monitoring health
        task_monitor = TaskMonitor()
        health_report = task_monitor.get_health_report()
        
        dashboard_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "performance_summary": performance_summary,
            "recent_traces": recent_traces,
            "system_metrics": system_metrics,
            "health_report": health_report,
            "active_spans": len(tracer.get_active_spans())
        }
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        logger.error(f"Error generating metrics dashboard: {e}")
        return jsonify({"error": str(e)}), 500


# Register the blueprint
def register_metrics_routes(app):
    """Register metrics routes with the Flask app."""
    app.register_blueprint(metrics_bp)
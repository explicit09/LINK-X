"""
API endpoints for custom metrics collection.
Provides specialized metric endpoints for different aspects of the application.
"""
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from flask import Blueprint, jsonify, request
from sqlalchemy import text, func

from core.monitoring import (
    get_metrics,
    apm_collector,
    tracer,
    track_user_action,
    update_file_processing_queue,
    update_course_completion_rate,
    track_streaming_connection,
    track_security_event,
    update_system_metrics
)
from core.dependencies import get_db
from core.decorators_unified import require_auth
from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from repositories.file_repository import FileRepository
from monitoring.task_monitor import TaskMonitor

logger = logging.getLogger(__name__)

# Create blueprint
metrics_bp = Blueprint('metrics', __name__, url_prefix='/api/metrics')

@metrics_bp.route('/prometheus')
def prometheus_metrics():
    """Standard Prometheus metrics endpoint"""
    try:
        return get_metrics(), 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
    except Exception as e:
        logger.error(f"Error generating Prometheus metrics: {e}")
        return f"# Error generating metrics: {str(e)}\n", 500

@metrics_bp.route('/custom')
def custom_application_metrics():
    """Custom application metrics for Prometheus scraping"""
    try:
        db = get_db()
        metrics_lines = []
        
        # User session metrics
        with tracer.trace("metrics.user_sessions"):
            active_sessions = db.execute(text("""
                SELECT COUNT(DISTINCT user_id) as active_users
                FROM "UserSession" 
                WHERE last_activity > :cutoff
            """), {"cutoff": datetime.utcnow() - timedelta(minutes=30)}).scalar()
            
            if active_sessions:
                metrics_lines.append(f"learn_x_active_users {active_sessions}")
        
        # Database connection pool metrics
        with tracer.trace("metrics.db_pool"):
            pool_info = db.get_bind().pool.status()
            metrics_lines.append(f"learn_x_db_pool_size {{state=\"total\"}} {db.get_bind().pool.size()}")
            metrics_lines.append(f"learn_x_db_pool_checked_in {pool_info.get('checked_in', 0)}")
            metrics_lines.append(f"learn_x_db_pool_checked_out {pool_info.get('checked_out', 0)}")
        
        # Course engagement metrics
        with tracer.trace("metrics.course_engagement"):
            course_stats = db.execute(text("""
                SELECT 
                    COUNT(DISTINCT c.id) as total_courses,
                    COUNT(DISTINCT e.user_id) as enrolled_users,
                    AVG(CASE WHEN mp.progress_percentage >= 100 THEN 1 ELSE 0 END) as completion_rate
                FROM "Course" c
                LEFT JOIN "Enrollment" e ON c.id = e.course_id
                LEFT JOIN "ModuleProgress" mp ON e.id = mp.enrollment_id
                WHERE c.created_at > :week_ago
            """), {"week_ago": datetime.utcnow() - timedelta(days=7)}).fetchone()
            
            if course_stats:
                metrics_lines.append(f"learn_x_total_courses {course_stats[0] or 0}")
                metrics_lines.append(f"learn_x_enrolled_users {course_stats[1] or 0}")
                metrics_lines.append(f"learn_x_avg_completion_rate {course_stats[2] or 0}")
        
        # File processing queue metrics
        with tracer.trace("metrics.file_processing"):
            task_monitor = TaskMonitor()
            queue_stats = task_monitor.get_queue_stats()
            
            for queue_name, size in queue_stats.items():
                metrics_lines.append(f"learn_x_file_queue_size {{queue=\"{queue_name}\"}} {size}")
                update_file_processing_queue(queue_name, size)
        
        # AI API usage metrics
        with tracer.trace("metrics.ai_usage"):
            ai_usage = db.execute(text("""
                SELECT 
                    COUNT(*) as total_requests,
                    AVG(response_time) as avg_response_time,
                    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
                FROM "AIAPILog" 
                WHERE created_at > :hour_ago
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchone()
            
            if ai_usage:
                metrics_lines.append(f"learn_x_ai_requests_hourly {ai_usage[0] or 0}")
                metrics_lines.append(f"learn_x_ai_avg_response_time {ai_usage[1] or 0}")
                metrics_lines.append(f"learn_x_ai_errors_hourly {ai_usage[2] or 0}")
        
        # Search performance metrics
        with tracer.trace("metrics.search_performance"):
            search_stats = db.execute(text("""
                SELECT 
                    COUNT(*) as total_searches,
                    AVG(response_time) as avg_response_time,
                    AVG(result_count) as avg_results
                FROM "SearchLog" 
                WHERE created_at > :hour_ago
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchone()
            
            if search_stats:
                metrics_lines.append(f"learn_x_search_queries_hourly {search_stats[0] or 0}")
                metrics_lines.append(f"learn_x_search_avg_response_time {search_stats[1] or 0}")
                metrics_lines.append(f"learn_x_search_avg_results {search_stats[2] or 0}")
        
        response = "\n".join(metrics_lines) + "\n"
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating custom metrics: {e}")
        return f"# Error generating custom metrics: {str(e)}\n", 500

@metrics_bp.route('/business')
def business_metrics():
    """Business metrics endpoint"""
    try:
        db = get_db()
        metrics_lines = []
        
        # Course enrollment trends
        with tracer.trace("metrics.enrollment_trends"):
            enrollment_data = db.execute(text("""
                SELECT 
                    c.id,
                    c.title,
                    COUNT(e.id) as enrollment_count,
                    AVG(CASE WHEN mp.progress_percentage >= 100 THEN 1 ELSE 0 END) as completion_rate
                FROM "Course" c
                LEFT JOIN "Enrollment" e ON c.id = e.course_id
                LEFT JOIN "ModuleProgress" mp ON e.id = mp.enrollment_id
                WHERE c.created_at > :month_ago
                GROUP BY c.id, c.title
            """), {"month_ago": datetime.utcnow() - timedelta(days=30)}).fetchall()
            
            for row in enrollment_data:
                course_id, title, enrollments, completion_rate = row
                metrics_lines.append(f"learn_x_course_enrollments {{course_id=\"{course_id}\",title=\"{title[:20]}\"}} {enrollments or 0}")
                metrics_lines.append(f"learn_x_course_completion_rate {{course_id=\"{course_id}\"}} {completion_rate or 0}")
                
                # Update monitoring metrics
                update_course_completion_rate(str(course_id), completion_rate or 0)
        
        # User engagement metrics
        with tracer.trace("metrics.user_engagement"):
            engagement_data = db.execute(text("""
                SELECT 
                    DATE_TRUNC('day', created_at) as day,
                    COUNT(DISTINCT user_id) as active_users,
                    COUNT(*) as total_actions
                FROM "UserActivity" 
                WHERE created_at > :week_ago
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY day DESC
            """), {"week_ago": datetime.utcnow() - timedelta(days=7)}).fetchall()
            
            for row in engagement_data:
                day, active_users, total_actions = row
                day_str = day.strftime('%Y-%m-%d')
                metrics_lines.append(f"learn_x_daily_active_users {{date=\"{day_str}\"}} {active_users}")
                metrics_lines.append(f"learn_x_daily_actions {{date=\"{day_str}\"}} {total_actions}")
        
        # Revenue/subscription metrics (if applicable)
        with tracer.trace("metrics.revenue"):
            revenue_data = db.execute(text("""
                SELECT 
                    SUM(amount) as total_revenue,
                    COUNT(*) as transaction_count,
                    COUNT(DISTINCT user_id) as paying_users
                FROM "Payment" 
                WHERE created_at > :month_ago
                AND status = 'completed'
            """), {"month_ago": datetime.utcnow() - timedelta(days=30)}).fetchone()
            
            if revenue_data:
                metrics_lines.append(f"learn_x_monthly_revenue {revenue_data[0] or 0}")
                metrics_lines.append(f"learn_x_monthly_transactions {revenue_data[1] or 0}")
                metrics_lines.append(f"learn_x_paying_users {revenue_data[2] or 0}")
        
        response = "\n".join(metrics_lines) + "\n"
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating business metrics: {e}")
        return f"# Error generating business metrics: {str(e)}\n", 500

@metrics_bp.route('/security')
def security_metrics():
    """Security-focused metrics endpoint"""
    try:
        db = get_db()
        metrics_lines = []
        
        # Authentication metrics
        with tracer.trace("metrics.auth_security"):
            auth_data = db.execute(text("""
                SELECT 
                    COUNT(CASE WHEN success = true THEN 1 END) as successful_logins,
                    COUNT(CASE WHEN success = false THEN 1 END) as failed_logins,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    COUNT(DISTINCT user_id) as unique_users
                FROM "AuthAttempt" 
                WHERE created_at > :hour_ago
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchone()
            
            if auth_data:
                metrics_lines.append(f"learn_x_successful_logins_hourly {auth_data[0] or 0}")
                metrics_lines.append(f"learn_x_failed_logins_hourly {auth_data[1] or 0}")
                metrics_lines.append(f"learn_x_unique_login_ips_hourly {auth_data[2] or 0}")
                metrics_lines.append(f"learn_x_unique_login_users_hourly {auth_data[3] or 0}")
        
        # Suspicious activity detection
        with tracer.trace("metrics.suspicious_activity"):
            suspicious_data = db.execute(text("""
                SELECT 
                    activity_type,
                    COUNT(*) as count
                FROM "SuspiciousActivity" 
                WHERE created_at > :hour_ago
                GROUP BY activity_type
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchall()
            
            for row in suspicious_data:
                activity_type, count = row
                metrics_lines.append(f"learn_x_suspicious_activity {{type=\"{activity_type}\"}} {count}")
        
        # Rate limiting metrics
        with tracer.trace("metrics.rate_limiting"):
            rate_limit_data = db.execute(text("""
                SELECT 
                    endpoint,
                    COUNT(*) as hits
                FROM "RateLimitHit" 
                WHERE created_at > :hour_ago
                GROUP BY endpoint
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchall()
            
            for row in rate_limit_data:
                endpoint, hits = row
                metrics_lines.append(f"learn_x_rate_limit_hits {{endpoint=\"{endpoint}\"}} {hits}")
        
        # IP-based security metrics
        with tracer.trace("metrics.ip_security"):
            ip_data = db.execute(text("""
                SELECT 
                    ip_address,
                    COUNT(*) as request_count,
                    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
                FROM "RequestLog" 
                WHERE created_at > :hour_ago
                GROUP BY ip_address
                HAVING COUNT(*) > 100  -- High activity IPs
                ORDER BY request_count DESC
                LIMIT 10
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchall()
            
            for row in ip_data:
                ip_address, request_count, error_count = row
                # Anonymize IP for privacy
                anonymized_ip = ".".join(ip_address.split('.')[:-1] + ['xxx'])
                metrics_lines.append(f"learn_x_high_activity_ip_requests {{ip=\"{anonymized_ip}\"}} {request_count}")
                metrics_lines.append(f"learn_x_high_activity_ip_errors {{ip=\"{anonymized_ip}\"}} {error_count}")
        
        response = "\n".join(metrics_lines) + "\n"
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating security metrics: {e}")
        return f"# Error generating security metrics: {str(e)}\n", 500

@metrics_bp.route('/streaming')
def streaming_metrics():
    """Streaming service metrics endpoint"""
    try:
        db = get_db()
        metrics_lines = []
        
        # Active streaming connections
        with tracer.trace("metrics.streaming_connections"):
            streaming_data = db.execute(text("""
                SELECT 
                    COUNT(*) as active_connections,
                    COUNT(DISTINCT user_id) as unique_users,
                    AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))) as avg_duration
                FROM "StreamingSession" 
                WHERE ended_at IS NULL
            """)).fetchone()
            
            if streaming_data:
                active_connections = streaming_data[0] or 0
                unique_users = streaming_data[1] or 0
                avg_duration = streaming_data[2] or 0
                
                metrics_lines.append(f"learn_x_streaming_connections_active {active_connections}")
                metrics_lines.append(f"learn_x_streaming_unique_users {unique_users}")
                metrics_lines.append(f"learn_x_streaming_avg_duration_seconds {avg_duration}")
                
                # Update global streaming metrics
                track_streaming_connection(True)  # This will be managed properly in practice
        
        # Streaming performance metrics
        with tracer.trace("metrics.streaming_performance"):
            performance_data = db.execute(text("""
                SELECT 
                    AVG(latency_ms) as avg_latency,
                    MAX(latency_ms) as max_latency,
                    COUNT(CASE WHEN latency_ms > 1000 THEN 1 END) as slow_responses
                FROM "StreamingMetrics" 
                WHERE created_at > :minute_ago
            """), {"minute_ago": datetime.utcnow() - timedelta(minutes=1)}).fetchone()
            
            if performance_data:
                metrics_lines.append(f"learn_x_streaming_avg_latency_ms {performance_data[0] or 0}")
                metrics_lines.append(f"learn_x_streaming_max_latency_ms {performance_data[1] or 0}")
                metrics_lines.append(f"learn_x_streaming_slow_responses {performance_data[2] or 0}")
        
        # Content delivery metrics
        with tracer.trace("metrics.content_delivery"):
            content_data = db.execute(text("""
                SELECT 
                    content_type,
                    COUNT(*) as delivery_count,
                    AVG(size_bytes) as avg_size
                FROM "ContentDelivery" 
                WHERE created_at > :hour_ago
                GROUP BY content_type
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchall()
            
            for row in content_data:
                content_type, delivery_count, avg_size = row
                metrics_lines.append(f"learn_x_content_deliveries {{type=\"{content_type}\"}} {delivery_count}")
                metrics_lines.append(f"learn_x_content_avg_size_bytes {{type=\"{content_type}\"}} {avg_size or 0}")
        
        response = "\n".join(metrics_lines) + "\n"
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating streaming metrics: {e}")
        return f"# Error generating streaming metrics: {str(e)}\n", 500

@metrics_bp.route('/files')
def file_processing_metrics():
    """File processing metrics endpoint"""
    try:
        db = get_db()
        task_monitor = TaskMonitor()
        metrics_lines = []
        
        # File processing queue status
        with tracer.trace("metrics.file_queues"):
            queue_stats = task_monitor.get_queue_stats()
            
            for queue_name, size in queue_stats.items():
                metrics_lines.append(f"learn_x_file_queue_length {{queue=\"{queue_name}\"}} {size}")
        
        # File processing rates
        with tracer.trace("metrics.file_processing_rates"):
            processing_data = db.execute(text("""
                SELECT 
                    file_type,
                    COUNT(*) as processed_count,
                    AVG(processing_time_seconds) as avg_processing_time,
                    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
                FROM "FileProcessingLog" 
                WHERE created_at > :hour_ago
                GROUP BY file_type
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchall()
            
            for row in processing_data:
                file_type, processed_count, avg_processing_time, error_count = row
                metrics_lines.append(f"learn_x_files_processed_hourly {{type=\"{file_type}\"}} {processed_count}")
                metrics_lines.append(f"learn_x_file_avg_processing_time {{type=\"{file_type}\"}} {avg_processing_time or 0}")
                metrics_lines.append(f"learn_x_file_processing_errors {{type=\"{file_type}\"}} {error_count}")
        
        # Chunk generation metrics
        with tracer.trace("metrics.chunk_generation"):
            chunk_data = db.execute(text("""
                SELECT 
                    COUNT(*) as total_chunks,
                    AVG(chunk_size) as avg_chunk_size,
                    COUNT(DISTINCT file_id) as files_with_chunks
                FROM "FileChunk" 
                WHERE created_at > :hour_ago
            """), {"hour_ago": datetime.utcnow() - timedelta(hours=1)}).fetchone()
            
            if chunk_data:
                metrics_lines.append(f"learn_x_chunks_generated_hourly {chunk_data[0] or 0}")
                metrics_lines.append(f"learn_x_avg_chunk_size_bytes {chunk_data[1] or 0}")
                metrics_lines.append(f"learn_x_files_chunked_hourly {chunk_data[2] or 0}")
        
        # Storage metrics
        with tracer.trace("metrics.storage"):
            storage_data = db.execute(text("""
                SELECT 
                    SUM(size_bytes) as total_storage,
                    COUNT(*) as total_files,
                    AVG(size_bytes) as avg_file_size
                FROM "File" 
                WHERE created_at > :day_ago
            """), {"day_ago": datetime.utcnow() - timedelta(days=1)}).fetchone()
            
            if storage_data:
                metrics_lines.append(f"learn_x_storage_used_bytes {storage_data[0] or 0}")
                metrics_lines.append(f"learn_x_total_files {storage_data[1] or 0}")
                metrics_lines.append(f"learn_x_avg_file_size_bytes {storage_data[2] or 0}")
        
        response = "\n".join(metrics_lines) + "\n"
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating file processing metrics: {e}")
        return f"# Error generating file processing metrics: {str(e)}\n", 500

@metrics_bp.route('/health')
def health_metrics():
    """System health metrics endpoint"""
    try:
        # Get system metrics from APM collector
        system_metrics = apm_collector.collect_system_metrics()
        trace_metrics = apm_collector.collect_trace_metrics()
        
        metrics_lines = []
        
        # System resource metrics
        if system_metrics:
            memory_mb = system_metrics.get('memory', {}).get('rss', 0) / 1024 / 1024
            cpu_percent = system_metrics.get('cpu', {}).get('percent', 0)
            
            metrics_lines.append(f"learn_x_process_memory_mb {memory_mb}")
            metrics_lines.append(f"learn_x_process_cpu_percent {cpu_percent}")
            metrics_lines.append(f"learn_x_process_threads {system_metrics.get('threads', 0)}")
            
            # Update global metrics
            update_system_metrics("application", int(memory_mb * 1024 * 1024), cpu_percent)
            
            if 'system' in system_metrics:
                sys_metrics = system_metrics['system']
                metrics_lines.append(f"learn_x_system_cpu_percent {sys_metrics.get('cpu_percent', 0)}")
                metrics_lines.append(f"learn_x_system_memory_percent {sys_metrics.get('memory_percent', 0)}")
                metrics_lines.append(f"learn_x_system_disk_percent {sys_metrics.get('disk_usage', 0)}")
        
        # Trace metrics
        if trace_metrics:
            metrics_lines.append(f"learn_x_active_traces {trace_metrics.get('active_spans', 0)}")
            metrics_lines.append(f"learn_x_avg_trace_duration {trace_metrics.get('avg_trace_duration', 0)}")
            metrics_lines.append(f"learn_x_trace_error_rate {trace_metrics.get('error_rate', 0)}")
        
        # Task monitoring health
        task_monitor = TaskMonitor()
        health_report = task_monitor.get_health_report()
        
        health_status = 1 if health_report['status'] == 'healthy' else 0
        metrics_lines.append(f"learn_x_health_status {health_status}")
        metrics_lines.append(f"learn_x_health_issues {len(health_report.get('issues', []))}")
        
        response = "\n".join(metrics_lines) + "\n"
        return response, 200, {'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'}
        
    except Exception as e:
        logger.error(f"Error generating health metrics: {e}")
        return f"# Error generating health metrics: {str(e)}\n", 500

@metrics_bp.route('/dashboard')
@require_auth
def metrics_dashboard():
    """Metrics dashboard for internal monitoring"""
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
    """Register metrics routes with the Flask app"""
    app.register_blueprint(metrics_bp)
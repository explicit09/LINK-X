"""
System metrics collector.
Handles collection of system performance, security, streaming, and file processing metrics.
"""
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from core.monitoring import (
    tracer, apm_collector, track_streaming_connection, 
    update_file_processing_queue, update_system_metrics
)
from monitoring.task_monitor import TaskMonitor
from ..queries.user_metrics import UserMetricsQueries
from ..queries.performance_metrics import PerformanceMetricsQueries

logger = logging.getLogger(__name__)


class SystemMetricsCollector:
    """Collector for system performance and operational metrics."""
    
    def __init__(self):
        self.user_queries = UserMetricsQueries()
        self.performance_queries = PerformanceMetricsQueries()
        self.task_monitor = TaskMonitor()
    
    def collect_security_metrics(self, db: Session) -> List[str]:
        """Collect security-focused metrics."""
        metrics_lines = []
        
        try:
            # Authentication metrics
            with tracer.trace("metrics.auth_security"):
                auth_data = self.user_queries.get_authentication_metrics(db)
                if auth_data:
                    metrics_lines.append(f"learn_x_successful_logins_hourly {auth_data[0] or 0}")
                    metrics_lines.append(f"learn_x_failed_logins_hourly {auth_data[1] or 0}")
                    metrics_lines.append(f"learn_x_unique_login_ips_hourly {auth_data[2] or 0}")
                    metrics_lines.append(f"learn_x_unique_login_users_hourly {auth_data[3] or 0}")
            
            # Suspicious activity detection
            with tracer.trace("metrics.suspicious_activity"):
                suspicious_data = self.performance_queries.get_suspicious_activity_metrics(db)
                for row in suspicious_data:
                    activity_type, count = row
                    metrics_lines.append(f"learn_x_suspicious_activity {{type=\"{activity_type}\"}} {count}")
            
            # Rate limiting metrics
            with tracer.trace("metrics.rate_limiting"):
                rate_limit_data = self.performance_queries.get_rate_limit_metrics(db)
                for row in rate_limit_data:
                    endpoint, hits = row
                    metrics_lines.append(f"learn_x_rate_limit_hits {{endpoint=\"{endpoint}\"}} {hits}")
            
            # IP-based security metrics
            with tracer.trace("metrics.ip_security"):
                ip_data = self.user_queries.get_high_activity_ips(db)
                for row in ip_data:
                    ip_address, request_count, error_count = row
                    # Anonymize IP for privacy
                    anonymized_ip = ".".join(ip_address.split('.')[:-1] + ['xxx'])
                    metrics_lines.append(f"learn_x_high_activity_ip_requests {{ip=\"{anonymized_ip}\"}} {request_count}")
                    metrics_lines.append(f"learn_x_high_activity_ip_errors {{ip=\"{anonymized_ip}\"}} {error_count}")
        
        except Exception as e:
            logger.error(f"Error collecting security metrics: {e}")
            metrics_lines.append(f"# Error collecting security metrics: {str(e)}")
        
        return metrics_lines
    
    def collect_streaming_metrics(self, db: Session) -> List[str]:
        """Collect streaming service metrics."""
        metrics_lines = []
        
        try:
            # Active streaming connections
            with tracer.trace("metrics.streaming_connections"):
                streaming_data = self.performance_queries.get_streaming_connection_metrics(db)
                if streaming_data:
                    active_connections = streaming_data[0] or 0
                    unique_users = streaming_data[1] or 0
                    avg_duration = streaming_data[2] or 0
                    
                    metrics_lines.append(f"learn_x_streaming_connections_active {active_connections}")
                    metrics_lines.append(f"learn_x_streaming_unique_users {unique_users}")
                    metrics_lines.append(f"learn_x_streaming_avg_duration_seconds {avg_duration}")
                    
                    # Update global streaming metrics
                    track_streaming_connection(True)
            
            # Streaming performance metrics
            with tracer.trace("metrics.streaming_performance"):
                performance_data = self.performance_queries.get_streaming_performance_metrics(db)
                if performance_data:
                    metrics_lines.append(f"learn_x_streaming_avg_latency_ms {performance_data[0] or 0}")
                    metrics_lines.append(f"learn_x_streaming_max_latency_ms {performance_data[1] or 0}")
                    metrics_lines.append(f"learn_x_streaming_slow_responses {performance_data[2] or 0}")
            
            # Content delivery metrics
            with tracer.trace("metrics.content_delivery"):
                from ..queries.course_metrics import CourseMetricsQueries
                course_queries = CourseMetricsQueries()
                content_data = course_queries.get_content_delivery_metrics(db)
                for row in content_data:
                    content_type, delivery_count, avg_size = row
                    metrics_lines.append(f"learn_x_content_deliveries {{type=\"{content_type}\"}} {delivery_count}")
                    metrics_lines.append(f"learn_x_content_avg_size_bytes {{type=\"{content_type}\"}} {avg_size or 0}")
        
        except Exception as e:
            logger.error(f"Error collecting streaming metrics: {e}")
            metrics_lines.append(f"# Error collecting streaming metrics: {str(e)}")
        
        return metrics_lines
    
    def collect_file_processing_metrics(self, db: Session) -> List[str]:
        """Collect file processing metrics."""
        metrics_lines = []
        
        try:
            # File processing queue status
            with tracer.trace("metrics.file_queues"):
                queue_stats = self.task_monitor.get_queue_stats()
                for queue_name, size in queue_stats.items():
                    metrics_lines.append(f"learn_x_file_queue_length {{queue=\"{queue_name}\"}} {size}")
                    update_file_processing_queue(queue_name, size)
            
            # File processing rates
            with tracer.trace("metrics.file_processing_rates"):
                processing_data = self.performance_queries.get_file_processing_rates(db)
                for row in processing_data:
                    file_type, processed_count, avg_processing_time, error_count = row
                    metrics_lines.append(f"learn_x_files_processed_hourly {{type=\"{file_type}\"}} {processed_count}")
                    metrics_lines.append(f"learn_x_file_avg_processing_time {{type=\"{file_type}\"}} {avg_processing_time or 0}")
                    metrics_lines.append(f"learn_x_file_processing_errors {{type=\"{file_type}\"}} {error_count}")
            
            # Chunk generation metrics
            with tracer.trace("metrics.chunk_generation"):
                chunk_data = self.performance_queries.get_chunk_generation_metrics(db)
                if chunk_data:
                    metrics_lines.append(f"learn_x_chunks_generated_hourly {chunk_data[0] or 0}")
                    metrics_lines.append(f"learn_x_avg_chunk_size_bytes {chunk_data[1] or 0}")
                    metrics_lines.append(f"learn_x_files_chunked_hourly {chunk_data[2] or 0}")
            
            # Storage metrics
            with tracer.trace("metrics.storage"):
                storage_data = self.performance_queries.get_storage_metrics(db)
                if storage_data:
                    metrics_lines.append(f"learn_x_storage_used_bytes {storage_data[0] or 0}")
                    metrics_lines.append(f"learn_x_total_files {storage_data[1] or 0}")
                    metrics_lines.append(f"learn_x_avg_file_size_bytes {storage_data[2] or 0}")
        
        except Exception as e:
            logger.error(f"Error collecting file processing metrics: {e}")
            metrics_lines.append(f"# Error collecting file processing metrics: {str(e)}")
        
        return metrics_lines
    
    def collect_health_metrics(self) -> List[str]:
        """Collect system health metrics."""
        metrics_lines = []
        
        try:
            # Get system metrics from APM collector
            system_metrics = apm_collector.collect_system_metrics()
            trace_metrics = apm_collector.collect_trace_metrics()
            
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
            health_report = self.task_monitor.get_health_report()
            health_status = 1 if health_report['status'] == 'healthy' else 0
            metrics_lines.append(f"learn_x_health_status {health_status}")
            metrics_lines.append(f"learn_x_health_issues {len(health_report.get('issues', []))}")
        
        except Exception as e:
            logger.error(f"Error collecting health metrics: {e}")
            metrics_lines.append(f"# Error collecting health metrics: {str(e)}")
        
        return metrics_lines
    
    def format_response(self, metrics_lines: List[str]) -> str:
        """Format metrics lines into response format."""
        return "\n".join(metrics_lines) + "\n"
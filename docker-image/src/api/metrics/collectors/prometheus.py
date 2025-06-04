"""
Prometheus metrics collector.
Handles standard Prometheus metrics collection and formatting.
"""
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from core.monitoring import get_metrics
from ..queries.user_metrics import UserMetricsQueries
from ..queries.course_metrics import CourseMetricsQueries
from ..queries.performance_metrics import PerformanceMetricsQueries

logger = logging.getLogger(__name__)


class PrometheusMetricsCollector:
    """Collector for Prometheus-formatted metrics."""
    
    def __init__(self):
        self.user_queries = UserMetricsQueries()
        self.course_queries = CourseMetricsQueries()
        self.performance_queries = PerformanceMetricsQueries()
    
    def get_standard_metrics(self) -> str:
        """Get standard Prometheus metrics."""
        try:
            return get_metrics()
        except Exception as e:
            logger.error(f"Error generating standard Prometheus metrics: {e}")
            return f"# Error generating metrics: {str(e)}\n"
    
    def collect_custom_metrics(self, db: Session) -> List[str]:
        """Collect custom application metrics for Prometheus."""
        metrics_lines = []
        
        try:
            # User session metrics
            with tracer.trace("metrics.user_sessions"):
                active_sessions = self.user_queries.get_active_sessions(db)
                if active_sessions:
                    metrics_lines.append(f"learn_x_active_users {active_sessions}")
            
            # Database connection pool metrics
            with tracer.trace("metrics.db_pool"):
                pool_info = self.performance_queries.get_database_pool_info(db)
                metrics_lines.append(f"learn_x_db_pool_size {{state=\"total\"}} {pool_info['total_size']}")
                metrics_lines.append(f"learn_x_db_pool_checked_in {pool_info['checked_in']}")
                metrics_lines.append(f"learn_x_db_pool_checked_out {pool_info['checked_out']}")
            
            # Course engagement metrics
            with tracer.trace("metrics.course_engagement"):
                course_stats = self.course_queries.get_course_engagement_stats(db)
                if course_stats:
                    metrics_lines.append(f"learn_x_total_courses {course_stats[0] or 0}")
                    metrics_lines.append(f"learn_x_enrolled_users {course_stats[1] or 0}")
                    metrics_lines.append(f"learn_x_avg_completion_rate {course_stats[2] or 0}")
            
            # AI API usage metrics
            with tracer.trace("metrics.ai_usage"):
                ai_usage = self.course_queries.get_ai_usage_metrics(db)
                if ai_usage:
                    metrics_lines.append(f"learn_x_ai_requests_hourly {ai_usage[0] or 0}")
                    metrics_lines.append(f"learn_x_ai_avg_response_time {ai_usage[1] or 0}")
                    metrics_lines.append(f"learn_x_ai_errors_hourly {ai_usage[2] or 0}")
            
            # Search performance metrics
            with tracer.trace("metrics.search_performance"):
                search_stats = self.course_queries.get_search_performance_metrics(db)
                if search_stats:
                    metrics_lines.append(f"learn_x_search_queries_hourly {search_stats[0] or 0}")
                    metrics_lines.append(f"learn_x_search_avg_response_time {search_stats[1] or 0}")
                    metrics_lines.append(f"learn_x_search_avg_results {search_stats[2] or 0}")
        
        except Exception as e:
            logger.error(f"Error collecting custom metrics: {e}")
            metrics_lines.append(f"# Error collecting custom metrics: {str(e)}")
        
        return metrics_lines
    
    def format_response(self, metrics_lines: List[str]) -> str:
        """Format metrics lines into Prometheus response format."""
        return "\n".join(metrics_lines) + "\n"
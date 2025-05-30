"""
Business metrics collector.
Handles collection of business-related metrics like enrollment trends, revenue, and user engagement.
"""
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from core.monitoring import tracer, update_course_completion_rate
from ..queries.user_metrics import UserMetricsQueries
from ..queries.course_metrics import CourseMetricsQueries

logger = logging.getLogger(__name__)


class BusinessMetricsCollector:
    """Collector for business-focused metrics."""
    
    def __init__(self):
        self.user_queries = UserMetricsQueries()
        self.course_queries = CourseMetricsQueries()
    
    def collect_enrollment_metrics(self, db: Session) -> List[str]:
        """Collect course enrollment and completion metrics."""
        metrics_lines = []
        
        try:
            with tracer.trace("metrics.enrollment_trends"):
                enrollment_data = self.course_queries.get_enrollment_trends(db)
                
                for row in enrollment_data:
                    course_id, title, enrollments, completion_rate = row
                    # Truncate title for metric label
                    safe_title = title[:20] if title else "Unknown"
                    
                    metrics_lines.append(
                        f"learn_x_course_enrollments {{course_id=\"{course_id}\",title=\"{safe_title}\"}} {enrollments or 0}"
                    )
                    metrics_lines.append(
                        f"learn_x_course_completion_rate {{course_id=\"{course_id}\"}} {completion_rate or 0}"
                    )
                    
                    # Update monitoring metrics
                    update_course_completion_rate(str(course_id), completion_rate or 0)
        
        except Exception as e:
            logger.error(f"Error collecting enrollment metrics: {e}")
            metrics_lines.append(f"# Error collecting enrollment metrics: {str(e)}")
        
        return metrics_lines
    
    def collect_user_engagement_metrics(self, db: Session) -> List[str]:
        """Collect user engagement metrics."""
        metrics_lines = []
        
        try:
            with tracer.trace("metrics.user_engagement"):
                engagement_data = self.user_queries.get_user_engagement_data(db)
                
                for row in engagement_data:
                    day, active_users, total_actions = row
                    day_str = day.strftime('%Y-%m-%d')
                    metrics_lines.append(f"learn_x_daily_active_users {{date=\"{day_str}\"}} {active_users}")
                    metrics_lines.append(f"learn_x_daily_actions {{date=\"{day_str}\"}} {total_actions}")
        
        except Exception as e:
            logger.error(f"Error collecting user engagement metrics: {e}")
            metrics_lines.append(f"# Error collecting user engagement metrics: {str(e)}")
        
        return metrics_lines
    
    def collect_revenue_metrics(self, db: Session) -> List[str]:
        """Collect revenue and subscription metrics."""
        metrics_lines = []
        
        try:
            with tracer.trace("metrics.revenue"):
                revenue_data = self.user_queries.get_revenue_metrics(db)
                
                if revenue_data:
                    metrics_lines.append(f"learn_x_monthly_revenue {revenue_data[0] or 0}")
                    metrics_lines.append(f"learn_x_monthly_transactions {revenue_data[1] or 0}")
                    metrics_lines.append(f"learn_x_paying_users {revenue_data[2] or 0}")
        
        except Exception as e:
            logger.error(f"Error collecting revenue metrics: {e}")
            metrics_lines.append(f"# Error collecting revenue metrics: {str(e)}")
        
        return metrics_lines
    
    def collect_all_business_metrics(self, db: Session) -> List[str]:
        """Collect all business metrics."""
        metrics_lines = []
        
        metrics_lines.extend(self.collect_enrollment_metrics(db))
        metrics_lines.extend(self.collect_user_engagement_metrics(db))
        metrics_lines.extend(self.collect_revenue_metrics(db))
        
        return metrics_lines
    
    def format_response(self, metrics_lines: List[str]) -> str:
        """Format metrics lines into response format."""
        return "\n".join(metrics_lines) + "\n"
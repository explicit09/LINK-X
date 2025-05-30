"""
Course-related metric queries.
Handles queries for course enrollment, completion, and engagement metrics.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session


class CourseMetricsQueries:
    """Database queries for course-related metrics."""
    
    @staticmethod
    def get_course_engagement_stats(db: Session, days: int = 7) -> Optional[Tuple]:
        """Get overall course engagement statistics."""
        week_ago = datetime.utcnow() - timedelta(days=days)
        return db.execute(text("""
            SELECT 
                COUNT(DISTINCT c.id) as total_courses,
                COUNT(DISTINCT e.user_id) as enrolled_users,
                AVG(CASE WHEN mp.progress_percentage >= 100 THEN 1 ELSE 0 END) as completion_rate
            FROM "Course" c
            LEFT JOIN "Enrollment" e ON c.id = e.course_id
            LEFT JOIN "ModuleProgress" mp ON e.id = mp.enrollment_id
            WHERE c.created_at > :week_ago
        """), {"week_ago": week_ago}).fetchone()
    
    @staticmethod
    def get_enrollment_trends(db: Session, days: int = 30) -> List[Tuple]:
        """Get enrollment trends by course."""
        month_ago = datetime.utcnow() - timedelta(days=days)
        return db.execute(text("""
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
        """), {"month_ago": month_ago}).fetchall()
    
    @staticmethod
    def get_ai_usage_metrics(db: Session, hours: int = 1) -> Optional[Tuple]:
        """Get AI API usage metrics for courses."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                COUNT(*) as total_requests,
                AVG(response_time) as avg_response_time,
                COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
            FROM "AIAPILog" 
            WHERE created_at > :hour_ago
        """), {"hour_ago": hour_ago}).fetchone()
    
    @staticmethod
    def get_search_performance_metrics(db: Session, hours: int = 1) -> Optional[Tuple]:
        """Get search performance metrics for course content."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                COUNT(*) as total_searches,
                AVG(response_time) as avg_response_time,
                AVG(result_count) as avg_results
            FROM "SearchLog" 
            WHERE created_at > :hour_ago
        """), {"hour_ago": hour_ago}).fetchone()
    
    @staticmethod
    def get_content_delivery_metrics(db: Session, hours: int = 1) -> List[Tuple]:
        """Get content delivery metrics by type."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                content_type,
                COUNT(*) as delivery_count,
                AVG(size_bytes) as avg_size
            FROM "ContentDelivery" 
            WHERE created_at > :hour_ago
            GROUP BY content_type
        """), {"hour_ago": hour_ago}).fetchall()
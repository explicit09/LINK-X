"""
User-related metric queries.
Handles queries for user sessions, engagement, and authentication metrics.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session


class UserMetricsQueries:
    """Database queries for user-related metrics."""
    
    @staticmethod
    def get_active_sessions(db: Session, minutes: int = 30) -> int:
        """Get count of active user sessions."""
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        result = db.execute(text("""
            SELECT COUNT(DISTINCT user_id) as active_users
            FROM "UserSession" 
            WHERE last_activity > :cutoff
        """), {"cutoff": cutoff}).scalar()
        return result or 0
    
    @staticmethod
    def get_user_engagement_data(db: Session, days: int = 7) -> List[Tuple]:
        """Get daily user engagement data."""
        week_ago = datetime.utcnow() - timedelta(days=days)
        return db.execute(text("""
            SELECT 
                DATE_TRUNC('day', created_at) as day,
                COUNT(DISTINCT user_id) as active_users,
                COUNT(*) as total_actions
            FROM "UserActivity" 
            WHERE created_at > :week_ago
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY day DESC
        """), {"week_ago": week_ago}).fetchall()
    
    @staticmethod
    def get_authentication_metrics(db: Session, hours: int = 1) -> Optional[Tuple]:
        """Get authentication success/failure metrics."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                COUNT(CASE WHEN success = true THEN 1 END) as successful_logins,
                COUNT(CASE WHEN success = false THEN 1 END) as failed_logins,
                COUNT(DISTINCT ip_address) as unique_ips,
                COUNT(DISTINCT user_id) as unique_users
            FROM "AuthAttempt" 
            WHERE created_at > :hour_ago
        """), {"hour_ago": hour_ago}).fetchone()
    
    @staticmethod
    def get_high_activity_ips(db: Session, hours: int = 1, min_requests: int = 100) -> List[Tuple]:
        """Get IPs with high activity for security monitoring."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                ip_address,
                COUNT(*) as request_count,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
            FROM "RequestLog" 
            WHERE created_at > :hour_ago
            GROUP BY ip_address
            HAVING COUNT(*) > :min_requests
            ORDER BY request_count DESC
            LIMIT 10
        """), {"hour_ago": hour_ago, "min_requests": min_requests}).fetchall()
    
    @staticmethod
    def get_revenue_metrics(db: Session, days: int = 30) -> Optional[Tuple]:
        """Get revenue and subscription metrics."""
        month_ago = datetime.utcnow() - timedelta(days=days)
        return db.execute(text("""
            SELECT 
                SUM(amount) as total_revenue,
                COUNT(*) as transaction_count,
                COUNT(DISTINCT user_id) as paying_users
            FROM "Payment" 
            WHERE created_at > :month_ago
            AND status = 'completed'
        """), {"month_ago": month_ago}).fetchone()
"""
Performance-related metric queries.
Handles queries for system performance, streaming, file processing, and security metrics.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session


class PerformanceMetricsQueries:
    """Database queries for performance-related metrics."""
    
    @staticmethod
    def get_streaming_connection_metrics(db: Session) -> Optional[Tuple]:
        """Get active streaming connection metrics."""
        return db.execute(text("""
            SELECT 
                COUNT(*) as active_connections,
                COUNT(DISTINCT user_id) as unique_users,
                AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))) as avg_duration
            FROM "StreamingSession" 
            WHERE ended_at IS NULL
        """)).fetchone()
    
    @staticmethod
    def get_streaming_performance_metrics(db: Session, minutes: int = 1) -> Optional[Tuple]:
        """Get streaming performance metrics."""
        minute_ago = datetime.utcnow() - timedelta(minutes=minutes)
        return db.execute(text("""
            SELECT 
                AVG(latency_ms) as avg_latency,
                MAX(latency_ms) as max_latency,
                COUNT(CASE WHEN latency_ms > 1000 THEN 1 END) as slow_responses
            FROM "StreamingMetrics" 
            WHERE created_at > :minute_ago
        """), {"minute_ago": minute_ago}).fetchone()
    
    @staticmethod
    def get_file_processing_rates(db: Session, hours: int = 1) -> List[Tuple]:
        """Get file processing rates by type."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                file_type,
                COUNT(*) as processed_count,
                AVG(processing_time_seconds) as avg_processing_time,
                COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
            FROM "FileProcessingLog" 
            WHERE created_at > :hour_ago
            GROUP BY file_type
        """), {"hour_ago": hour_ago}).fetchall()
    
    @staticmethod
    def get_chunk_generation_metrics(db: Session, hours: int = 1) -> Optional[Tuple]:
        """Get file chunk generation metrics."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                COUNT(*) as total_chunks,
                AVG(chunk_size) as avg_chunk_size,
                COUNT(DISTINCT file_id) as files_with_chunks
            FROM "FileChunk" 
            WHERE created_at > :hour_ago
        """), {"hour_ago": hour_ago}).fetchone()
    
    @staticmethod
    def get_storage_metrics(db: Session, days: int = 1) -> Optional[Tuple]:
        """Get storage usage metrics."""
        day_ago = datetime.utcnow() - timedelta(days=days)
        return db.execute(text("""
            SELECT 
                SUM(size_bytes) as total_storage,
                COUNT(*) as total_files,
                AVG(size_bytes) as avg_file_size
            FROM "File" 
            WHERE created_at > :day_ago
        """), {"day_ago": day_ago}).fetchone()
    
    @staticmethod
    def get_suspicious_activity_metrics(db: Session, hours: int = 1) -> List[Tuple]:
        """Get suspicious activity metrics by type."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                activity_type,
                COUNT(*) as count
            FROM "SuspiciousActivity" 
            WHERE created_at > :hour_ago
            GROUP BY activity_type
        """), {"hour_ago": hour_ago}).fetchall()
    
    @staticmethod
    def get_rate_limit_metrics(db: Session, hours: int = 1) -> List[Tuple]:
        """Get rate limiting metrics by endpoint."""
        hour_ago = datetime.utcnow() - timedelta(hours=hours)
        return db.execute(text("""
            SELECT 
                endpoint,
                COUNT(*) as hits
            FROM "RateLimitHit" 
            WHERE created_at > :hour_ago
            GROUP BY endpoint
        """), {"hour_ago": hour_ago}).fetchall()
    
    @staticmethod
    def get_database_pool_info(db: Session) -> Dict[str, Any]:
        """Get database connection pool information."""
        try:
            pool_info = db.get_bind().pool.status()
            return {
                'total_size': db.get_bind().pool.size(),
                'checked_in': pool_info.get('checked_in', 0),
                'checked_out': pool_info.get('checked_out', 0)
            }
        except Exception:
            return {'total_size': 0, 'checked_in': 0, 'checked_out': 0}
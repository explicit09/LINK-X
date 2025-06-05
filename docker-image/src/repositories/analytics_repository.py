"""
Analytics Repository
Handles database operations for learning analytics and engagement tracking
"""
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

from .base_repository import BaseRepository
from db.schema import User, StudentProfile, Course, File, Module

logger = logging.getLogger(__name__)

class AnalyticsRepository(BaseRepository):
    """Repository for analytics-related database operations"""
    
    def track_engagement_event(
        self,
        user_id: str,
        event_type: str,
        content_id: str,
        engagement_metrics: Dict[str, Any],
        session: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Track an engagement event and calculate engagement score"""
        def _track(session: Session):
            # Extract metrics
            interaction_count = engagement_metrics.get('interaction_count', 0)
            scroll_depth = engagement_metrics.get('scroll_depth_percentage', 0)
            time_on_content = engagement_metrics.get('time_on_content_seconds', 0)
            pause_count = engagement_metrics.get('pause_count', 0)
            session_duration = engagement_metrics.get('session_duration_seconds', 0)
            
            # Calculate engagement score using database function
            result = session.execute(
                text("""
                    SELECT calculate_engagement_score(:interaction_count, :scroll_depth, 
                                                    :time_on_content, :pause_count, 
                                                    :session_duration)
                """),
                {
                    'interaction_count': interaction_count,
                    'scroll_depth': scroll_depth,
                    'time_on_content': time_on_content,
                    'pause_count': pause_count,
                    'session_duration': session_duration
                }
            )
            engagement_score = result.scalar()
            
            # Insert session analytics record
            session.execute(
                text("""
                    INSERT INTO session_analytics (
                        user_id, event_type, engagement_score, interaction_count,
                        scroll_depth_percentage, time_on_content, pause_count,
                        analytics_metadata, event_timestamp
                    )
                    VALUES (:user_id, :event_type, :engagement_score, :interaction_count,
                            :scroll_depth, :time_on_content, :pause_count, :metadata, :timestamp)
                """),
                {
                    'user_id': user_id,
                    'event_type': event_type,
                    'engagement_score': engagement_score,
                    'interaction_count': interaction_count,
                    'scroll_depth': scroll_depth,
                    'time_on_content': time_on_content,
                    'pause_count': pause_count,
                    'metadata': {
                        'content_id': content_id,
                        'content_type': engagement_metrics.get('content_type'),
                        'device_type': engagement_metrics.get('device_type', 'unknown'),
                        'timestamp': datetime.utcnow().isoformat()
                    },
                    'timestamp': datetime.utcnow()
                }
            )
            
            # Log user activity
            session.execute(
                text("""
                    INSERT INTO user_activities (
                        user_id, activity_type, session_duration, 
                        content_completion_percentage, activity_metadata
                    )
                    VALUES (:user_id, :activity_type, :session_duration, 
                            :completion_percentage, :metadata)
                """),
                {
                    'user_id': user_id,
                    'activity_type': f"{event_type}_engagement",
                    'session_duration': session_duration,
                    'completion_percentage': engagement_metrics.get('completion_percentage', 0),
                    'metadata': {
                        'content_id': content_id,
                        'engagement_score': float(engagement_score),
                        'file_id': content_id if event_type == 'file_view' else None
                    }
                }
            )
            
            return {
                'engagement_score': float(engagement_score),
                'tracked_at': datetime.utcnow().isoformat()
            }
        
        if session:
            return _track(session)
        else:
            with self.get_session() as session:
                result = _track(session)
                session.commit()
                return result
    
    def get_student_analytics_overview(
        self, 
        user_id: str, 
        days: int = 30,
        session: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Get comprehensive analytics overview for a student"""
        def _get_overview(session: Session):
            # Get main analytics data
            result = session.execute(
                text("""
                    SELECT * FROM student_learning_analytics 
                    WHERE user_id = :user_id
                """),
                {'user_id': user_id}
            ).fetchone()
            
            if not result:
                return None
            
            analytics = dict(result._mapping)
            
            # Get engagement trends
            trends = session.execute(
                text("""
                    SELECT 
                        DATE(event_timestamp) as date,
                        AVG(engagement_score) as avg_engagement,
                        COUNT(*) as session_count,
                        AVG(time_on_content) as avg_time_on_content
                    FROM session_analytics 
                    WHERE user_id = :user_id 
                    AND event_timestamp >= CURRENT_DATE - INTERVAL ':days days'
                    AND engagement_score IS NOT NULL
                    GROUP BY DATE(event_timestamp)
                    ORDER BY date
                """),
                {'user_id': user_id, 'days': days}
            ).fetchall()
            
            # Get learning patterns
            patterns = session.execute(
                text("""
                    SELECT pattern_type, pattern_data, confidence_score, last_updated
                    FROM learning_patterns 
                    WHERE user_id = :user_id
                """),
                {'user_id': user_id}
            ).fetchall()
            
            return {
                'overview': analytics,
                'trends': [dict(row._mapping) for row in trends],
                'patterns': {row[0]: {
                    'data': row[1],
                    'confidence': float(row[2]),
                    'last_updated': row[3].isoformat()
                } for row in patterns}
            }
        
        if session:
            return _get_overview(session)
        else:
            with self.get_session() as session:
                return _get_overview(session)
    
    def get_course_engagement_insights(
        self, 
        course_id: str,
        session: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Get engagement insights for a course"""
        def _get_insights(session: Session):
            # Generate fresh insights
            session.execute(
                text("SELECT generate_engagement_insights(:course_id)"),
                {'course_id': course_id}
            )
            
            # Get insights
            insights = session.execute(
                text("""
                    SELECT insight_type, insight_data, generated_at
                    FROM engagement_insights 
                    WHERE course_id = :course_id 
                    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                    ORDER BY generated_at DESC
                """),
                {'course_id': course_id}
            ).fetchall()
            
            # Get course summary stats
            summary = session.execute(
                text("""
                    SELECT 
                        COUNT(DISTINCT e.user_id) as total_students,
                        AVG(CASE WHEN sa.event_timestamp >= CURRENT_DATE - INTERVAL '7 days' 
                            THEN sa.engagement_score END) as week_avg_engagement,
                        COUNT(CASE WHEN sa.event_timestamp >= CURRENT_DATE - INTERVAL '7 days' 
                            THEN 1 END) as week_total_sessions,
                        COUNT(DISTINCT CASE WHEN sa.event_timestamp >= CURRENT_DATE - INTERVAL '7 days' 
                            THEN sa.user_id END) as week_active_students
                    FROM "Enrollment" e
                    LEFT JOIN session_analytics sa ON sa.user_id = e.user_id
                    WHERE e.course_id = :course_id
                """),
                {'course_id': course_id}
            ).fetchone()
            
            # Get module completion data
            modules = session.execute(
                text("""
                    SELECT 
                        m.id, m.title, m.ordering,
                        COUNT(DISTINCT f.id) as total_files,
                        AVG(f.completion_rate) as avg_completion_rate,
                        AVG(f.avg_engagement_score) as avg_engagement_score
                    FROM "Module" m
                    LEFT JOIN "File" f ON f.module_id = m.id
                    WHERE m.course_id = :course_id
                    GROUP BY m.id, m.title, m.ordering
                    ORDER BY m.ordering
                """),
                {'course_id': course_id}
            ).fetchall()
            
            return {
                'insights': {row[0]: {
                    'data': row[1],
                    'generated_at': row[2].isoformat()
                } for row in insights},
                'summary': dict(summary._mapping) if summary else {},
                'modules': [dict(row._mapping) for row in modules]
            }
        
        if session:
            return _get_insights(session)
        else:
            with self.get_session() as session:
                result = _get_insights(session)
                session.commit()
                return result
    
    def detect_learning_patterns(
        self, 
        user_id: str,
        session: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Detect and update learning patterns for a user"""
        def _detect_patterns(session: Session):
            # Run pattern detection
            session.execute(
                text("SELECT detect_learning_patterns(:user_id)"),
                {'user_id': user_id}
            )
            
            # Get updated patterns
            patterns = session.execute(
                text("""
                    SELECT pattern_type, pattern_data, confidence_score, last_updated
                    FROM learning_patterns 
                    WHERE user_id = :user_id
                """),
                {'user_id': user_id}
            ).fetchall()
            
            return {
                pattern[0]: {
                    'data': pattern[1],
                    'confidence': float(pattern[2]),
                    'last_updated': pattern[3].isoformat()
                } for pattern in patterns
            }
        
        if session:
            return _detect_patterns(session)
        else:
            with self.get_session() as session:
                result = _detect_patterns(session)
                session.commit()
                return result
    
    def get_engagement_summary(
        self, 
        user_id: str, 
        days: int = 7,
        session: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Get high-level engagement summary for a user"""
        def _get_summary(session: Session):
            # Get engagement summary
            summary = session.execute(
                text("""
                    SELECT 
                        COUNT(*) as total_sessions,
                        AVG(engagement_score) as avg_engagement,
                        SUM(time_on_content) as total_time_on_content,
                        AVG(interaction_count) as avg_interactions,
                        COUNT(DISTINCT DATE(event_timestamp)) as active_days
                    FROM session_analytics 
                    WHERE user_id = :user_id 
                    AND event_timestamp >= CURRENT_DATE - INTERVAL ':days days'
                    AND engagement_score IS NOT NULL
                """),
                {'user_id': user_id, 'days': days}
            ).fetchone()
            
            # Get top performing content
            top_content = session.execute(
                text("""
                    SELECT 
                        sa.analytics_metadata->>'content_id' as content_id,
                        AVG(sa.engagement_score) as avg_engagement,
                        COUNT(*) as session_count
                    FROM session_analytics sa
                    WHERE sa.user_id = :user_id 
                    AND sa.event_timestamp >= CURRENT_DATE - INTERVAL ':days days'
                    AND sa.analytics_metadata->>'content_id' IS NOT NULL
                    GROUP BY sa.analytics_metadata->>'content_id'
                    ORDER BY avg_engagement DESC
                    LIMIT 5
                """),
                {'user_id': user_id, 'days': days}
            ).fetchall()
            
            return {
                'summary': dict(summary._mapping) if summary else {},
                'top_content': [dict(row._mapping) for row in top_content]
            }
        
        if session:
            return _get_summary(session)
        else:
            with self.get_session() as session:
                return _get_summary(session)
    
    def update_file_engagement_metrics(
        self, 
        file_id: str,
        session: Optional[Session] = None
    ) -> bool:
        """Update engagement metrics for a file"""
        def _update_metrics(session: Session):
            session.execute(
                text("SELECT update_file_engagement_metrics(:file_id)"),
                {'file_id': file_id}
            )
            return True
        
        if session:
            return _update_metrics(session)
        else:
            with self.get_session() as session:
                result = _update_metrics(session)
                session.commit()
                return result
    
    def get_content_performance_analytics(
        self, 
        user_id: str, 
        days: int = 30,
        session: Optional[Session] = None
    ) -> List[Dict[str, Any]]:
        """Get performance analytics for content accessed by user"""
        def _get_performance(session: Session):
            results = session.execute(
                text("""
                    SELECT 
                        ua.activity_metadata->>'file_id' as file_id,
                        f.title,
                        f.file_type,
                        AVG(ua.content_completion_percentage) as avg_completion,
                        AVG(ua.session_duration) as avg_duration,
                        COUNT(*) as access_count,
                        MAX(ua.created_at) as last_accessed,
                        AVG(sa.engagement_score) as avg_engagement
                    FROM user_activities ua
                    LEFT JOIN "File" f ON f.id = (ua.activity_metadata->>'file_id')::uuid
                    LEFT JOIN session_analytics sa ON sa.user_id = ua.user_id 
                        AND sa.analytics_metadata->>'content_id' = ua.activity_metadata->>'file_id'
                    WHERE ua.user_id = :user_id 
                    AND ua.created_at >= CURRENT_DATE - INTERVAL ':days days'
                    AND ua.activity_metadata->>'file_id' IS NOT NULL
                    GROUP BY ua.activity_metadata->>'file_id', f.title, f.file_type
                    ORDER BY avg_completion DESC, access_count DESC
                """),
                {'user_id': user_id, 'days': days}
            ).fetchall()
            
            return [dict(row._mapping) for row in results]
        
        if session:
            return _get_performance(session)
        else:
            with self.get_session() as session:
                return _get_performance(session)
    
    def get_study_session_analytics(
        self, 
        user_id: str, 
        days: int = 30,
        session: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Get study session analytics for a user"""
        def _get_session_analytics(session: Session):
            result = session.execute(
                text("""
                    SELECT 
                        AVG(actual_duration_minutes) as avg_session_length,
                        AVG(effectiveness_rating) as avg_effectiveness,
                        AVG(focus_score) as avg_focus_score,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_sessions,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions,
                        SUM(xp_earned) as total_xp_earned,
                        AVG(completion_percentage) as avg_completion_percentage
                    FROM study_sessions 
                    WHERE user_id = :user_id 
                    AND created_at >= CURRENT_DATE - INTERVAL ':days days'
                """),
                {'user_id': user_id, 'days': days}
            ).fetchone()
            
            return dict(result._mapping) if result else {}
        
        if session:
            return _get_session_analytics(session)
        else:
            with self.get_session() as session:
                return _get_session_analytics(session)
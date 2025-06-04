"""
Schedule Repository
Provides data access methods for study sessions, user preferences, and schedule analytics
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date, timedelta
from sqlalchemy.orm import sessionmaker, joinedload
from sqlalchemy import and_, or_, func, desc, asc, text
from uuid import UUID
import logging

from .base_repository import BaseRepository
from db.schema import (
    StudySession, SessionNote, UserSchedulePreferences, 
    SessionAnalytics, AISessionSuggestion, Course, StudyGoal
)

logger = logging.getLogger(__name__)


class ScheduleRepository(BaseRepository[StudySession]):
    """Repository for study session management"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(StudySession, session_factory)
        
    def get_user_sessions(self, user_id: UUID, start_date: Optional[date] = None, 
                         end_date: Optional[date] = None, status: Optional[str] = None,
                         course_id: Optional[UUID] = None, session_type: Optional[str] = None,
                         limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get user's sessions within date range with optional filters and pagination"""
        with self.get_session() as session:
            query = session.query(StudySession).options(
                joinedload(StudySession.course),
                joinedload(StudySession.study_goal),
                joinedload(StudySession.notes)
            ).filter(StudySession.user_id == user_id)
            
            if start_date:
                query = query.filter(func.date(StudySession.scheduled_start) >= start_date)
            if end_date:
                query = query.filter(func.date(StudySession.scheduled_start) <= end_date)
            if status:
                query = query.filter(StudySession.status == status)
            if course_id:
                query = query.filter(StudySession.course_id == course_id)
            if session_type:
                query = query.filter(StudySession.session_type == session_type)
                
            # Order by scheduled start time
            query = query.order_by(StudySession.scheduled_start)
            
            # Apply pagination
            if offset:
                query = query.offset(offset)
            if limit:
                query = query.limit(limit)
                
            sessions = query.all()
            
            # Convert to dictionaries for JSON serialization
            session_dicts = []
            for session_obj in sessions:
                session.expunge(session_obj)
                session_dicts.append(session_obj.to_dict())
            return session_dicts
    
    def get_daily_sessions(self, user_id: UUID, target_date: date) -> List[Dict[str, Any]]:
        """Get all sessions for a specific date"""
        return self.get_user_sessions(
            user_id=user_id,
            start_date=target_date,
            end_date=target_date
        )
    
    def get_weekly_sessions(self, user_id: UUID, week_start: date) -> List[Dict[str, Any]]:
        """Get sessions for a week starting from week_start"""
        week_end = week_start + timedelta(days=6)
        return self.get_user_sessions(
            user_id=user_id,
            start_date=week_start,
            end_date=week_end
        )
    
    def get_active_session(self, user_id: UUID) -> Optional[StudySession]:
        """Get user's currently active session"""
        return self.find_by(user_id=user_id, status='active')
    
    def create_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new study session"""
        # Calculate duration if not provided
        if 'duration_minutes' not in session_data and 'scheduled_start' in session_data and 'scheduled_end' in session_data:
            start = session_data['scheduled_start']
            end = session_data['scheduled_end']
            duration = (end - start).total_seconds() / 60
            session_data['duration_minutes'] = int(duration)
        
        session_obj = self.create(**session_data)
        return session_obj.to_dict()
    
    def get_session_by_id(self, session_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get a specific session by ID for a user"""
        with self.get_session() as session:
            study_session = session.query(StudySession).options(
                joinedload(StudySession.course),
                joinedload(StudySession.study_goal),
                joinedload(StudySession.notes)
            ).filter(
                and_(
                    StudySession.id == session_id,
                    StudySession.user_id == user_id
                )
            ).first()
            
            if study_session:
                session.expunge(study_session)
                return study_session.to_dict()
            return None
    
    def check_session_conflicts(self, user_id: UUID, start_time: datetime, 
                               end_time: datetime, exclude_session_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        """Check for session conflicts and return conflict information"""
        conflicts = self.get_session_conflicts(user_id, start_time, end_time, exclude_session_id)
        return [
            {
                'id': str(conflict.id),
                'title': conflict.title,
                'scheduled_start': conflict.scheduled_start.isoformat(),
                'scheduled_end': conflict.scheduled_end.isoformat(),
                'status': conflict.status
            }
            for conflict in conflicts
        ]
    
    def update_session(self, session_id: UUID, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a session with new data"""
        with self.get_session() as session:
            study_session = session.query(StudySession).filter(StudySession.id == session_id).first()
            if study_session:
                for key, value in update_data.items():
                    if hasattr(study_session, key):
                        setattr(study_session, key, value)
                study_session.updated_at = datetime.utcnow()
                session.commit()
                session.expunge(study_session)
                return study_session.to_dict()
            return None
    
    def delete_session(self, session_id: UUID) -> bool:
        """Delete a session by ID"""
        with self.get_session() as session:
            study_session = session.query(StudySession).filter(StudySession.id == session_id).first()
            if study_session:
                session.delete(study_session)
                session.commit()
                return True
            return False
    
    def get_sessions_by_ids(self, session_ids: List[UUID], user_id: UUID) -> List[StudySession]:
        """Get multiple sessions by their IDs for a user"""
        with self.get_session() as session:
            sessions = session.query(StudySession).filter(
                and_(
                    StudySession.id.in_(session_ids),
                    StudySession.user_id == user_id
                )
            ).all()
            
            for session_obj in sessions:
                session.expunge(session_obj)
            return sessions
    
    def bulk_update_sessions(self, update_operations: List[Tuple[UUID, Dict[str, Any]]]) -> List[StudySession]:
        """Bulk update multiple sessions"""
        updated_sessions = []
        for session_id, update_data in update_operations:
            updated_session = self.update_session(session_id, update_data)
            if updated_session:
                updated_sessions.append(updated_session)
        return updated_sessions
    
    def update_session_status(self, session_id: UUID, status: str, 
                             completion_percentage: Optional[int] = None) -> Optional[StudySession]:
        """Update session status and completion"""
        update_data = {'status': status}
        
        if completion_percentage is not None:
            update_data['completion_percentage'] = completion_percentage
            
        if status == 'active':
            update_data['actual_start'] = datetime.utcnow()
        elif status == 'completed':
            update_data['actual_end'] = datetime.utcnow()
            update_data['completion_percentage'] = 100
            
        return self.update(session_id, **update_data)
    
    def reschedule_session(self, session_id: UUID, new_start: datetime, 
                          new_end: Optional[datetime] = None) -> Optional[StudySession]:
        """Reschedule a session to new time"""
        update_data = {
            'scheduled_start': new_start,
            'status': 'scheduled'  # Reset to scheduled if it was missed
        }
        
        if new_end:
            update_data['scheduled_end'] = new_end
            duration = (new_end - new_start).total_seconds() / 60
            update_data['duration_minutes'] = int(duration)
        else:
            # Keep same duration, adjust end time
            session = self.get_by_id(session_id)
            if session:
                new_end = new_start + timedelta(minutes=session.duration_minutes)
                update_data['scheduled_end'] = new_end
        
        return self.update(session_id, **update_data)
    
    def bulk_reschedule_sessions(self, session_updates: List[Dict[str, Any]]) -> int:
        """Bulk reschedule multiple sessions (for drag-drop calendar)"""
        count = 0
        with self.get_session() as session:
            for update in session_updates:
                session_id = update.get('id')
                new_start = update.get('scheduled_start')
                new_end = update.get('scheduled_end')
                
                if session_id and new_start:
                    study_session = session.query(StudySession).filter(
                        StudySession.id == UUID(session_id)
                    ).first()
                    
                    if study_session:
                        study_session.scheduled_start = new_start
                        if new_end:
                            study_session.scheduled_end = new_end
                            duration = (new_end - new_start).total_seconds() / 60
                            study_session.duration_minutes = int(duration)
                        study_session.updated_at = datetime.utcnow()
                        count += 1
        
        return count
    
    def get_urgent_sessions(self, user_id: UUID, hours_ahead: int = 24) -> List[StudySession]:
        """Get urgent sessions due within specified hours"""
        cutoff_time = datetime.utcnow() + timedelta(hours=hours_ahead)
        
        with self.get_session() as session:
            sessions = session.query(StudySession).filter(
                and_(
                    StudySession.user_id == user_id,
                    StudySession.status.in_(['scheduled', 'active']),
                    StudySession.scheduled_start <= cutoff_time,
                    StudySession.urgency.in_(['urgent', 'soon'])
                )
            ).order_by(StudySession.scheduled_start).all()
            
            for session_obj in sessions:
                session.expunge(session_obj)
            return sessions
    
    def get_sessions_by_cognitive_load(self, user_id: UUID, cognitive_load: str, 
                                     start_date: Optional[date] = None) -> List[StudySession]:
        """Get sessions filtered by cognitive load"""
        with self.get_session() as session:
            query = session.query(StudySession).filter(
                and_(
                    StudySession.user_id == user_id,
                    StudySession.cognitive_load == cognitive_load
                )
            )
            
            if start_date:
                query = query.filter(func.date(StudySession.scheduled_start) >= start_date)
                
            sessions = query.order_by(StudySession.scheduled_start).all()
            
            for session_obj in sessions:
                session.expunge(session_obj)
            return sessions
    
    def get_session_conflicts(self, user_id: UUID, start_time: datetime, 
                            end_time: datetime, exclude_session_id: Optional[UUID] = None) -> List[StudySession]:
        """Find sessions that conflict with given time range"""
        with self.get_session() as session:
            query = session.query(StudySession).filter(
                and_(
                    StudySession.user_id == user_id,
                    StudySession.status.in_(['scheduled', 'active']),
                    or_(
                        # Session starts during our time range
                        and_(
                            StudySession.scheduled_start >= start_time,
                            StudySession.scheduled_start < end_time
                        ),
                        # Session ends during our time range
                        and_(
                            StudySession.scheduled_end > start_time,
                            StudySession.scheduled_end <= end_time
                        ),
                        # Session completely encompasses our time range
                        and_(
                            StudySession.scheduled_start <= start_time,
                            StudySession.scheduled_end >= end_time
                        )
                    )
                )
            )
            
            if exclude_session_id:
                query = query.filter(StudySession.id != exclude_session_id)
                
            conflicts = query.all()
            
            for session_obj in conflicts:
                session.expunge(session_obj)
            return conflicts
    
    def get_optimization_candidates(self, user_id: UUID, date_range_days: int = 7) -> List[StudySession]:
        """Get sessions that can be optimized by AI"""
        start_date = datetime.utcnow().date()
        end_date = start_date + timedelta(days=date_range_days)
        
        with self.get_session() as session:
            sessions = session.query(StudySession).filter(
                and_(
                    StudySession.user_id == user_id,
                    StudySession.status == 'scheduled',
                    func.date(StudySession.scheduled_start) >= start_date,
                    func.date(StudySession.scheduled_start) <= end_date
                )
            ).order_by(
                StudySession.urgency.desc(),
                StudySession.priority_score.desc(),
                StudySession.scheduled_start
            ).all()
            
            for session_obj in sessions:
                session.expunge(session_obj)
            return sessions


class SchedulePreferencesRepository(BaseRepository[UserSchedulePreferences]):
    """Repository for user schedule preferences"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(UserSchedulePreferences, session_factory)
    
    def get_user_preferences(self, user_id: UUID) -> Optional[UserSchedulePreferences]:
        """Get user's schedule preferences, creating defaults if none exist"""
        preferences = self.find_by(user_id=user_id)
        
        if not preferences:
            # Create default preferences
            preferences = self.create(user_id=user_id)
            
        return preferences
    
    def update_preferences(self, user_id: UUID, preferences_data: Dict[str, Any]) -> Optional[UserSchedulePreferences]:
        """Update user's schedule preferences"""
        existing = self.find_by(user_id=user_id)
        
        if existing:
            return self.update(user_id, **preferences_data)
        else:
            # Create new preferences with provided data
            preferences_data['user_id'] = user_id
            return self.create(**preferences_data)
    
    def get_core_hours(self, user_id: UUID) -> Tuple[int, int]:
        """Get user's core study hours"""
        preferences = self.get_user_preferences(user_id)
        return (preferences.core_start_hour, preferences.core_end_hour)
    
    def get_course_colors(self, user_id: UUID) -> Dict[str, str]:
        """Get user's custom course colors"""
        preferences = self.get_user_preferences(user_id)
        return preferences.course_colors or {}
    
    def update_course_colors(self, user_id: UUID, course_colors: Dict[str, str]) -> Optional[UserSchedulePreferences]:
        """Update user's course color preferences"""
        return self.update_preferences(user_id, {'course_colors': course_colors})
    
    def update_user_preferences(self, user_id: UUID, update_data: Dict[str, Any]) -> Optional[UserSchedulePreferences]:
        """Update user preferences (alias for update_preferences)"""
        return self.update_preferences(user_id, update_data)


class SessionNotesRepository(BaseRepository[SessionNote]):
    """Repository for session notes management"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(SessionNote, session_factory)
    
    def get_session_notes(self, session_id: UUID, note_type: Optional[str] = None) -> List[SessionNote]:
        """Get notes for a specific session"""
        filters = {'session_id': session_id}
        if note_type:
            filters['note_type'] = note_type
            
        with self.get_session() as session:
            notes = session.query(SessionNote).filter_by(**filters).order_by(
                SessionNote.note_timestamp.desc()
            ).all()
            
            for note in notes:
                session.expunge(note)
            return notes
    
    def add_session_note(self, session_id: UUID, user_id: UUID, content: str, 
                        note_type: str = 'general', metadata: Optional[Dict] = None) -> SessionNote:
        """Add a note to a session"""
        return self.create(
            session_id=session_id,
            user_id=user_id,
            content=content,
            note_type=note_type,
            metadata=metadata
        )
    
    def get_user_notes(self, user_id: UUID, limit: Optional[int] = None) -> List[SessionNote]:
        """Get recent notes for a user across all sessions"""
        with self.get_session() as session:
            query = session.query(SessionNote).options(
                joinedload(SessionNote.session)
            ).filter(SessionNote.user_id == user_id).order_by(
                SessionNote.note_timestamp.desc()
            )
            
            if limit:
                query = query.limit(limit)
                
            notes = query.all()
            
            for note in notes:
                session.expunge(note)
            return notes


class SessionAnalyticsRepository(BaseRepository[SessionAnalytics]):
    """Repository for session analytics and performance tracking"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(SessionAnalytics, session_factory)
    
    def log_event(self, user_id: UUID, event_type: str, session_id: Optional[UUID] = None,
                  metadata: Optional[Dict] = None, **kwargs) -> SessionAnalytics:
        """Log an analytics event"""
        return self.create(
            user_id=user_id,
            session_id=session_id,
            event_type=event_type,
            metadata=metadata,
            **kwargs
        )
    
    def get_user_analytics(self, user_id: UUID, days: int = 30) -> Dict[str, Any]:
        """Get comprehensive analytics for a user"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        with self.get_session() as session:
            # Get session completion stats
            session_stats = session.query(
                func.count(SessionAnalytics.id).label('total_events'),
                func.count(func.distinct(SessionAnalytics.session_id)).label('total_sessions'),
                func.avg(SessionAnalytics.session_satisfaction).label('avg_satisfaction'),
                func.avg(SessionAnalytics.planned_vs_actual_duration).label('avg_duration_variance')
            ).filter(
                and_(
                    SessionAnalytics.user_id == user_id,
                    SessionAnalytics.event_timestamp >= start_date
                )
            ).first()
            
            # Get event type breakdown
            event_breakdown = session.query(
                SessionAnalytics.event_type,
                func.count(SessionAnalytics.id).label('count')
            ).filter(
                and_(
                    SessionAnalytics.user_id == user_id,
                    SessionAnalytics.event_timestamp >= start_date
                )
            ).group_by(SessionAnalytics.event_type).all()
            
            # Get optimization effectiveness - simplified to avoid func.case issues
            optimization_stats = session.query(
                func.avg(SessionAnalytics.suggestion_effectiveness).label('avg_effectiveness'),
                func.count(SessionAnalytics.id).label('total_optimizations')
            ).filter(
                and_(
                    SessionAnalytics.user_id == user_id,
                    SessionAnalytics.event_timestamp >= start_date,
                    SessionAnalytics.optimization_followed.isnot(None)
                )
            ).first()
            
            # Get optimizations followed count separately
            optimizations_followed = session.query(
                func.count(SessionAnalytics.id)
            ).filter(
                and_(
                    SessionAnalytics.user_id == user_id,
                    SessionAnalytics.event_timestamp >= start_date,
                    SessionAnalytics.optimization_followed == True
                )
            ).scalar() or 0
            
            return {
                'period_days': days,
                'session_stats': {
                    'total_events': session_stats.total_events or 0,
                    'total_sessions': session_stats.total_sessions or 0,
                    'avg_satisfaction': float(session_stats.avg_satisfaction or 0),
                    'avg_duration_variance': float(session_stats.avg_duration_variance or 0)
                },
                'event_breakdown': {event.event_type: event.count for event in event_breakdown},
                'optimization_stats': {
                    'avg_effectiveness': float(optimization_stats.avg_effectiveness or 0),
                    'optimizations_followed': optimizations_followed,
                    'total_optimizations': optimization_stats.total_optimizations or 0,
                    'follow_rate': (optimizations_followed / max(optimization_stats.total_optimizations or 1, 1)) if optimization_stats.total_optimizations else 0
                }
            }
    
    def get_performance_trends(self, user_id: UUID, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily performance trends"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        with self.get_session() as session:
            # Simplified query without func.case to avoid SQLAlchemy issues
            trends = session.query(
                func.date(SessionAnalytics.event_timestamp).label('date'),
                func.count(SessionAnalytics.id).label('total_events'),
                func.avg(SessionAnalytics.session_satisfaction).label('avg_satisfaction'),
                func.avg(SessionAnalytics.focus_interruptions).label('avg_interruptions')
            ).filter(
                and_(
                    SessionAnalytics.user_id == user_id,
                    SessionAnalytics.event_timestamp >= start_date
                )
            ).group_by(
                func.date(SessionAnalytics.event_timestamp)
            ).order_by(
                func.date(SessionAnalytics.event_timestamp)
            ).all()
            
            # Get completed sessions separately for each date
            completed_sessions_by_date = {}
            for trend in trends:
                date_completed = session.query(
                    func.count(SessionAnalytics.id)
                ).filter(
                    and_(
                        SessionAnalytics.user_id == user_id,
                        func.date(SessionAnalytics.event_timestamp) == trend.date,
                        SessionAnalytics.event_type == 'session_complete'
                    )
                ).scalar() or 0
                completed_sessions_by_date[trend.date] = date_completed
            
            return [
                {
                    'date': trend.date.isoformat(),
                    'completed_sessions': completed_sessions_by_date.get(trend.date, 0),
                    'avg_satisfaction': float(trend.avg_satisfaction or 0),
                    'avg_interruptions': float(trend.avg_interruptions or 0)
                }
                for trend in trends
            ]
    
    def get_user_analytics_dashboard(self, user_id: UUID, days_back: int = 30) -> Dict[str, Any]:
        """Get comprehensive analytics data for the schedule dashboard"""
        # Get basic analytics
        analytics_data = self.get_user_analytics(user_id, days_back)
        
        # Get performance trends
        trends = self.get_performance_trends(user_id, days_back)
        
        # Additional dashboard-specific metrics
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        with self.get_session() as session:
            # Get time distribution
            time_distribution = session.query(
                func.hour(SessionAnalytics.event_timestamp).label('hour'),
                func.count(SessionAnalytics.id).label('count')
            ).filter(
                and_(
                    SessionAnalytics.user_id == user_id,
                    SessionAnalytics.event_timestamp >= start_date,
                    SessionAnalytics.event_type == 'session_complete'
                )
            ).group_by(
                func.hour(SessionAnalytics.event_timestamp)
            ).all()
            
            # Get weekly patterns
            weekly_patterns = session.query(
                func.dayofweek(SessionAnalytics.event_timestamp).label('day_of_week'),
                func.count(SessionAnalytics.id).label('session_count'),
                func.avg(SessionAnalytics.session_satisfaction).label('avg_satisfaction')
            ).filter(
                and_(
                    SessionAnalytics.user_id == user_id,
                    SessionAnalytics.event_timestamp >= start_date,
                    SessionAnalytics.event_type == 'session_complete'
                )
            ).group_by(
                func.dayofweek(SessionAnalytics.event_timestamp)
            ).all()
            
            return {
                **analytics_data,
                'trends': trends,
                'time_distribution': [
                    {'hour': td.hour, 'count': td.count} for td in time_distribution
                ],
                'weekly_patterns': [
                    {
                        'day_of_week': wp.day_of_week,
                        'session_count': wp.session_count,
                        'avg_satisfaction': float(wp.avg_satisfaction or 0)
                    } for wp in weekly_patterns
                ]
            }
    
    def log_session_event(self, user_id: UUID, event_type: str, session_id: Optional[UUID] = None,
                         metadata: Optional[Dict] = None) -> SessionAnalytics:
        """Log a session-related analytics event"""
        return self.log_event(
            user_id=user_id,
            event_type=event_type,
            session_id=session_id,
            metadata=metadata
        )


class AISessionSuggestionRepository(BaseRepository[AISessionSuggestion]):
    """Repository for AI session suggestions"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(AISessionSuggestion, session_factory)
    
    def get_active_suggestions(self, user_id: UUID, suggestion_type: Optional[str] = None) -> List[AISessionSuggestion]:
        """Get active suggestions for a user"""
        with self.get_session() as session:
            query = session.query(AISessionSuggestion).options(
                joinedload(AISessionSuggestion.suggested_course)
            ).filter(
                and_(
                    AISessionSuggestion.user_id == user_id,
                    AISessionSuggestion.status == 'pending',
                    or_(
                        AISessionSuggestion.expires_at.is_(None),
                        AISessionSuggestion.expires_at > datetime.utcnow()
                    )
                )
            )
            
            if suggestion_type:
                query = query.filter(AISessionSuggestion.suggestion_type == suggestion_type)
                
            suggestions = query.order_by(
                AISessionSuggestion.priority_score.desc(),
                AISessionSuggestion.confidence_score.desc()
            ).all()
            
            for suggestion in suggestions:
                session.expunge(suggestion)
            return suggestions
    
    def create_suggestion(self, user_id: UUID, suggestion_data: Dict[str, Any]) -> AISessionSuggestion:
        """Create a new AI suggestion"""
        suggestion_data['user_id'] = user_id
        return self.create(**suggestion_data)
    
    def apply_suggestion(self, suggestion_id: UUID, user_feedback: Optional[str] = None) -> Optional[AISessionSuggestion]:
        """Mark a suggestion as applied"""
        return self.update(
            suggestion_id,
            status='accepted',
            applied_at=datetime.utcnow(),
            user_feedback=user_feedback
        )
    
    def reject_suggestion(self, suggestion_id: UUID, user_feedback: Optional[str] = None) -> Optional[AISessionSuggestion]:
        """Mark a suggestion as rejected"""
        return self.update(
            suggestion_id,
            status='rejected',
            user_feedback=user_feedback
        )
    
    def expire_old_suggestions(self, user_id: UUID) -> int:
        """Expire suggestions that have passed their expiry date"""
        with self.get_session() as session:
            count = session.query(AISessionSuggestion).filter(
                and_(
                    AISessionSuggestion.user_id == user_id,
                    AISessionSuggestion.status == 'pending',
                    AISessionSuggestion.expires_at < datetime.utcnow()
                )
            ).update({'status': 'expired'})
            return count
    
    def get_suggestion_effectiveness(self, user_id: UUID, algorithm_version: Optional[str] = None) -> Dict[str, Any]:
        """Get effectiveness metrics for AI suggestions"""
        with self.get_session() as session:
            query = session.query(AISessionSuggestion).filter(
                AISessionSuggestion.user_id == user_id
            )
            
            if algorithm_version:
                query = query.filter(AISessionSuggestion.algorithm_version == algorithm_version)
                
            suggestions = query.all()
            
            if not suggestions:
                return {'total': 0, 'accepted': 0, 'rejected': 0, 'acceptance_rate': 0}
                
            total = len(suggestions)
            accepted = len([s for s in suggestions if s.status == 'accepted'])
            rejected = len([s for s in suggestions if s.status == 'rejected'])
            
            return {
                'total': total,
                'accepted': accepted,
                'rejected': rejected,
                'pending': total - accepted - rejected,
                'acceptance_rate': accepted / total if total > 0 else 0,
                'avg_confidence': sum(s.confidence_score for s in suggestions) / total
            }
    
    def get_user_suggestions(self, user_id: UUID, suggestion_type: Optional[str] = None,
                           status: Optional[str] = None, limit: Optional[int] = None) -> List[AISessionSuggestion]:
        """Get user suggestions with optional filters (alias for get_active_suggestions with more flexibility)"""
        with self.get_session() as session:
            query = session.query(AISessionSuggestion).options(
                joinedload(AISessionSuggestion.suggested_course)
            ).filter(AISessionSuggestion.user_id == user_id)
            
            if suggestion_type:
                query = query.filter(AISessionSuggestion.suggestion_type == suggestion_type)
            
            if status:
                query = query.filter(AISessionSuggestion.status == status)
            else:
                # Default to active suggestions if no status specified
                query = query.filter(
                    and_(
                        AISessionSuggestion.status == 'pending',
                        or_(
                            AISessionSuggestion.expires_at.is_(None),
                            AISessionSuggestion.expires_at > datetime.utcnow()
                        )
                    )
                )
                
            query = query.order_by(
                AISessionSuggestion.priority_score.desc(),
                AISessionSuggestion.confidence_score.desc()
            )
            
            if limit:
                query = query.limit(limit)
                
            suggestions = query.all()
            
            for suggestion in suggestions:
                session.expunge(suggestion)
            return suggestions
    
    def get_suggestion_by_id(self, suggestion_id: UUID, user_id: UUID) -> Optional[AISessionSuggestion]:
        """Get a specific suggestion by ID for a user"""
        with self.get_session() as session:
            suggestion = session.query(AISessionSuggestion).options(
                joinedload(AISessionSuggestion.suggested_course)
            ).filter(
                and_(
                    AISessionSuggestion.id == suggestion_id,
                    AISessionSuggestion.user_id == user_id
                )
            ).first()
            
            if suggestion:
                session.expunge(suggestion)
            return suggestion
    
    def update_suggestion(self, suggestion_id: UUID, update_data: Dict[str, Any]) -> Optional[AISessionSuggestion]:
        """Update a suggestion with new data"""
        with self.get_session() as session:
            suggestion = session.query(AISessionSuggestion).filter(AISessionSuggestion.id == suggestion_id).first()
            if suggestion:
                for key, value in update_data.items():
                    if hasattr(suggestion, key):
                        setattr(suggestion, key, value)
                session.commit()
                session.expunge(suggestion)
                return suggestion
            return None
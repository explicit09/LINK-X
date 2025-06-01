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
from ..db.schema import (
    StudySession, SessionNote, UserSchedulePreferences, 
    SessionAnalytics, AISessionSuggestion, Course, StudyGoal
)

logger = logging.getLogger(__name__)


class ScheduleRepository(BaseRepository[StudySession]):
    """Repository for study session management"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(StudySession, session_factory)
        
    def get_user_sessions(self, user_id: UUID, start_date: Optional[date] = None, 
                         end_date: Optional[date] = None, status: Optional[str] = None) -> List[StudySession]:
        """Get user's sessions within date range with optional status filter"""
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
                
            # Order by scheduled start time
            sessions = query.order_by(StudySession.scheduled_start).all()
            
            for session_obj in sessions:
                session.expunge(session_obj)
            return sessions
    
    def get_daily_sessions(self, user_id: UUID, target_date: date) -> List[StudySession]:
        """Get all sessions for a specific date"""
        return self.get_user_sessions(
            user_id=user_id,
            start_date=target_date,
            end_date=target_date
        )
    
    def get_weekly_sessions(self, user_id: UUID, week_start: date) -> List[StudySession]:
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
    
    def create_session(self, user_id: UUID, session_data: Dict[str, Any]) -> StudySession:
        """Create a new study session"""
        session_data['user_id'] = user_id
        
        # Calculate duration if not provided
        if 'duration_minutes' not in session_data and 'scheduled_start' in session_data and 'scheduled_end' in session_data:
            start = session_data['scheduled_start']
            end = session_data['scheduled_end']
            duration = (end - start).total_seconds() / 60
            session_data['duration_minutes'] = int(duration)
        
        return self.create(**session_data)
    
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
            
            # Get optimization effectiveness
            optimization_stats = session.query(
                func.avg(SessionAnalytics.suggestion_effectiveness).label('avg_effectiveness'),
                func.count(
                    func.case(
                        (SessionAnalytics.optimization_followed == True, 1)
                    )
                ).label('optimizations_followed'),
                func.count(SessionAnalytics.id).label('total_optimizations')
            ).filter(
                and_(
                    SessionAnalytics.user_id == user_id,
                    SessionAnalytics.event_timestamp >= start_date,
                    SessionAnalytics.optimization_followed.isnot(None)
                )
            ).first()
            
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
                    'optimizations_followed': optimization_stats.optimizations_followed or 0,
                    'total_optimizations': optimization_stats.total_optimizations or 0,
                    'follow_rate': (optimization_stats.optimizations_followed / max(optimization_stats.total_optimizations, 1)) if optimization_stats.total_optimizations else 0
                }
            }
    
    def get_performance_trends(self, user_id: UUID, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily performance trends"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        with self.get_session() as session:
            trends = session.query(
                func.date(SessionAnalytics.event_timestamp).label('date'),
                func.count(
                    func.case(
                        (SessionAnalytics.event_type == 'session_complete', 1)
                    )
                ).label('completed_sessions'),
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
            
            return [
                {
                    'date': trend.date.isoformat(),
                    'completed_sessions': trend.completed_sessions,
                    'avg_satisfaction': float(trend.avg_satisfaction or 0),
                    'avg_interruptions': float(trend.avg_interruptions or 0)
                }
                for trend in trends
            ]


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
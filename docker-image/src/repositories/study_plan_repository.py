"""
Study Plan Repository
Provides data access methods for study plans and related entities
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from sqlalchemy.orm import sessionmaker, joinedload
from sqlalchemy import and_, or_, func, desc, asc, case
from uuid import UUID
import logging

from .base_repository import BaseRepository
from db.schema import StudyPlan, StudyGoal, StudySession, StudyRecommendation, GoalProgress

logger = logging.getLogger(__name__)


class StudyPlanRepository(BaseRepository[StudyPlan]):
    """Repository for study plan operations"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(StudyPlan, session_factory)
        
    def get_active_plan_by_user(self, user_id: UUID) -> Optional[StudyPlan]:
        """Get user's active study plan with goals loaded"""
        return self.find_by(
            load_options=[joinedload(StudyPlan.goals)],
            user_id=user_id, 
            is_active=True
        )
        
    def get_user_plans(self, user_id: UUID, include_inactive: bool = False) -> List[StudyPlan]:
        """Get all study plans for a user"""
        filters = {'user_id': user_id}
        if not include_inactive:
            filters['is_active'] = True
            
        return self.find_all_by(
            load_options=[joinedload(StudyPlan.goals)],
            **filters
        )
        
    def create_plan_with_goals(self, user_id: UUID, plan_data: Dict[str, Any], 
                              goals_data: List[Dict[str, Any]]) -> StudyPlan:
        """Create a study plan with initial goals"""
        with self.get_session() as session:
            # Create the plan
            plan = StudyPlan(user_id=user_id, **plan_data)
            session.add(plan)
            session.flush()  # Get plan ID
            
            # Create initial goals
            for goal_data in goals_data:
                goal = StudyGoal(
                    user_id=user_id,
                    study_plan_id=plan.id,
                    **goal_data
                )
                session.add(goal)
                
            session.refresh(plan)
            
            # Detach and return
            entity_dict = {c.name: getattr(plan, c.name) 
                          for c in plan.__table__.columns}
            session.expunge(plan)
            return StudyPlan(**entity_dict)
            
    def deactivate_other_plans(self, user_id: UUID, active_plan_id: UUID) -> int:
        """Deactivate all other plans for a user"""
        with self.get_session() as session:
            result = session.query(StudyPlan).filter(
                and_(
                    StudyPlan.user_id == user_id,
                    StudyPlan.id != active_plan_id,
                    StudyPlan.is_active == True
                )
            ).update({'is_active': False})
            return result
            
    def get_plan_analytics(self, plan_id: UUID) -> Dict[str, Any]:
        """Get analytics for a specific study plan"""
        try:
            with self.get_session() as session:
                # Get plan with goals
                plan = session.query(StudyPlan).options(
                    joinedload(StudyPlan.goals)
                ).filter(StudyPlan.id == plan_id).first()
                
                if not plan:
                    return {}
                    
                goals = plan.goals
                total_goals = len(goals)
                completed_goals = len([g for g in goals if g.status == 'completed'])
                active_goals = len([g for g in goals if g.status == 'in_progress'])
                pending_goals = len([g for g in goals if g.status == 'pending'])
                
                # Calculate average completion
                avg_completion = sum(g.completion_percentage for g in goals) / total_goals if total_goals > 0 else 0
                
                # Get study session data with error handling
                try:
                    sessions = session.query(StudySession).filter(
                        StudySession.user_id == plan.user_id
                    ).all()
                    
                    total_study_minutes = sum(s.actual_duration_minutes or 0 for s in sessions)
                    study_days = len(set(s.actual_start.date() for s in sessions if s.actual_start))
                    avg_effectiveness = sum(s.effectiveness_rating or 0 for s in sessions) / len(sessions) if sessions else 0
                    avg_focus_score = sum(s.focus_score or 0 for s in sessions) / len(sessions) if sessions else 0
                except Exception as e:
                    logger.warning(f"Error calculating session analytics for plan {plan_id}: {e}")
                    total_study_minutes = 0
                    study_days = 0
                    avg_effectiveness = 0
                    avg_focus_score = 0
                
                return {
                    'plan_id': str(plan_id),
                    'plan_name': plan.plan_name,
                    'total_goals': total_goals,
                    'completed_goals': completed_goals,
                    'active_goals': active_goals,
                    'pending_goals': pending_goals,
                    'avg_completion': round(avg_completion, 1),
                    'total_study_minutes': total_study_minutes,
                    'total_study_hours': round(total_study_minutes / 60, 1),
                    'study_days': study_days,
                    'avg_effectiveness': round(avg_effectiveness, 1),
                    'avg_focus_score': round(avg_focus_score, 1)
                }
        except Exception as e:
            logger.error(f"Error getting plan analytics for {plan_id}: {e}")
            return {}
            
    def update_plan_preferences(self, plan_id: UUID, preferences: Dict[str, Any]) -> Optional[StudyPlan]:
        """Update study plan preferences"""
        allowed_fields = [
            'weekly_study_hours', 'preferred_session_length', 'break_length',
            'peak_hours', 'learning_style', 'difficulty_preference',
            'reminder_enabled', 'reminder_time'
        ]
        
        # Filter to only allowed fields
        filtered_prefs = {k: v for k, v in preferences.items() if k in allowed_fields}
        
        return self.update(plan_id, **filtered_prefs)


class StudyGoalRepository(BaseRepository[StudyGoal]):
    """Repository for study goal operations"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(StudyGoal, session_factory)
        
    def get_user_goals(self, user_id: UUID, status: Optional[str] = None,
                      priority: Optional[str] = None, limit: Optional[int] = None) -> List[StudyGoal]:
        """Get user's goals with optional filtering"""
        with self.get_session() as session:
            query = session.query(StudyGoal).options(
                joinedload(StudyGoal.course),
                joinedload(StudyGoal.module),
                joinedload(StudyGoal.file)
            ).filter(StudyGoal.user_id == user_id)
            
            if status:
                query = query.filter(StudyGoal.status == status)
            if priority:
                query = query.filter(StudyGoal.priority == priority)
                
            # Order by priority and target date
            # Use case expression for priority ordering
            priority_order = case(
                (StudyGoal.priority == 'urgent', 1),
                (StudyGoal.priority == 'high', 2),
                (StudyGoal.priority == 'medium', 3),
                (StudyGoal.priority == 'low', 4),
                else_=5
            )
            query = query.order_by(priority_order, StudyGoal.target_date.asc())
            
            if limit:
                query = query.limit(limit)
                
            goals = query.all()
            for goal in goals:
                session.expunge(goal)
            return goals
            
    def get_goals_by_plan(self, plan_id: UUID) -> List[StudyGoal]:
        """Get all goals for a specific study plan"""
        return self.find_all_by(
            load_options=[
                joinedload(StudyGoal.course),
                joinedload(StudyGoal.module),
                joinedload(StudyGoal.file),
                joinedload(StudyGoal.progress_records)
            ],
            study_plan_id=plan_id
        )
        
    def get_weekly_goals(self, user_id: UUID, week_start: date) -> List[StudyGoal]:
        """Get goals for a specific week"""
        week_end = week_start + timedelta(days=6)
        
        with self.get_session() as session:
            goals = session.query(StudyGoal).filter(
                and_(
                    StudyGoal.user_id == user_id,
                    or_(
                        StudyGoal.goal_type == 'weekly',
                        and_(
                            StudyGoal.target_date >= week_start,
                            StudyGoal.target_date <= week_end
                        )
                    )
                )
            ).all()
            
            for goal in goals:
                session.expunge(goal)
            return goals
            
    def get_overdue_goals(self, user_id: UUID) -> List[StudyGoal]:
        """Get overdue goals for a user"""
        today = date.today()
        
        with self.get_session() as session:
            goals = session.query(StudyGoal).filter(
                and_(
                    StudyGoal.user_id == user_id,
                    StudyGoal.target_date < today,
                    StudyGoal.status.in_(['pending', 'in_progress'])
                )
            ).all()
            
            for goal in goals:
                session.expunge(goal)
            return goals
            
    def update_goal_progress(self, goal_id: UUID, progress_percentage: int) -> Optional[StudyGoal]:
        """Update goal completion percentage"""
        return self.update(goal_id, completion_percentage=progress_percentage)
        
    def complete_goal(self, goal_id: UUID) -> Optional[StudyGoal]:
        """Mark goal as completed"""
        return self.update(goal_id, status='completed', completion_percentage=100)
        
    def get_goal_with_progress(self, goal_id: UUID) -> Optional[StudyGoal]:
        """Get goal with progress records loaded"""
        return self.get_by_id(
            goal_id,
            load_options=[joinedload(StudyGoal.progress_records)]
        )


class StudySessionRepository(BaseRepository[StudySession]):
    """Repository for study session operations"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(StudySession, session_factory)
        
    def get_user_sessions(self, user_id: UUID, limit: Optional[int] = None,
                         start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[StudySession]:
        """Get user's study sessions with optional date filtering"""
        with self.get_session() as session:
            query = session.query(StudySession).filter(
                StudySession.user_id == user_id
            ).order_by(desc(StudySession.actual_start.nullslast()))
            
            if start_date:
                query = query.filter(
                    or_(
                        StudySession.actual_start >= start_date,
                        and_(StudySession.actual_start.is_(None), StudySession.scheduled_start >= start_date)
                    )
                )
            if end_date:
                query = query.filter(
                    or_(
                        StudySession.actual_start <= end_date,
                        and_(StudySession.actual_start.is_(None), StudySession.scheduled_start <= end_date)
                    )
                )
            if limit:
                query = query.limit(limit)
                
            sessions = query.all()
            for session_obj in sessions:
                session.expunge(session_obj)
            return sessions
            
    def get_active_session(self, user_id: UUID) -> Optional[StudySession]:
        """Get user's current active session (actual_end is None)"""
        return self.find_by(user_id=user_id, actual_end=None)
        
    def start_session(self, user_id: UUID, session_data: Dict[str, Any]) -> StudySession:
        """Start a new study session"""
        now = datetime.utcnow()
        planned_duration = session_data.get('planned_duration', 45)  # Default 45 minutes
        
        session_data.update({
            'user_id': user_id,
            'title': f"Study Session - {now.strftime('%Y-%m-%d %H:%M')}",
            'scheduled_start': now,
            'scheduled_end': now + timedelta(minutes=planned_duration),
            'duration_minutes': planned_duration,
            'actual_start': now,
            'status': 'active'
        })
        return self.create(**session_data)
        
    def end_session(self, session_id: UUID, actual_duration: int,
                   effectiveness_rating: Optional[int] = None,
                   focus_score: Optional[float] = None,
                   notes: Optional[str] = None) -> Optional[StudySession]:
        """End a study session"""
        update_data = {
            'actual_end': datetime.utcnow(),
            'actual_duration_minutes': actual_duration,
            'status': 'completed'
        }
        
        if effectiveness_rating is not None:
            update_data['effectiveness_rating'] = effectiveness_rating
        if focus_score is not None:
            update_data['focus_score'] = focus_score
        if notes is not None:
            update_data['session_notes'] = notes
            
        return self.update(session_id, **update_data)
        
    def get_session_analytics(self, user_id: UUID, days: int = 30) -> Dict[str, Any]:
        """Get session analytics for user over specified days"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            with self.get_session() as session:
                sessions = session.query(StudySession).filter(
                    and_(
                        StudySession.user_id == user_id,
                        or_(
                            StudySession.actual_start >= start_date,
                            and_(StudySession.actual_start.is_(None), StudySession.scheduled_start >= start_date)
                        ),
                        StudySession.actual_duration_minutes.isnot(None)
                    )
                ).all()
                
                if not sessions:
                    return {
                        'total_sessions': 0,
                        'total_minutes': 0,
                        'avg_session_length': 0,
                        'avg_effectiveness': 0,
                        'avg_focus_score': 0,
                        'study_days': 0
                    }
                    
                total_minutes = sum(s.actual_duration_minutes for s in sessions)
                avg_session_length = total_minutes / len(sessions)
                
                # Calculate averages for non-null values
                effectiveness_ratings = [s.effectiveness_rating for s in sessions if s.effectiveness_rating]
                focus_scores = [s.focus_score for s in sessions if s.focus_score]
                
                avg_effectiveness = sum(effectiveness_ratings) / len(effectiveness_ratings) if effectiveness_ratings else 0
                avg_focus_score = sum(focus_scores) / len(focus_scores) if focus_scores else 0
                
                study_days = len(set(s.actual_start.date() for s in sessions if s.actual_start))
                
                return {
                    'total_sessions': len(sessions),
                    'total_minutes': total_minutes,
                    'total_hours': round(total_minutes / 60, 1),
                    'avg_session_length': round(avg_session_length, 1),
                    'avg_effectiveness': round(avg_effectiveness, 1),
                    'avg_focus_score': round(avg_focus_score, 1),
                    'study_days': study_days
                }
        except Exception as e:
            logger.error(f"Error getting session analytics for user {user_id}: {e}")
            return {
                'total_sessions': 0,
                'total_minutes': 0,
                'avg_session_length': 0,
                'avg_effectiveness': 0,
                'avg_focus_score': 0,
                'study_days': 0
            }


class StudyRecommendationRepository(BaseRepository[StudyRecommendation]):
    """Repository for study recommendation operations"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(StudyRecommendation, session_factory)
        
    def get_active_recommendations(self, user_id: UUID, limit: Optional[int] = None) -> List[StudyRecommendation]:
        """Get active recommendations for user, ordered by priority"""
        with self.get_session() as session:
            query = session.query(StudyRecommendation).filter(
                and_(
                    StudyRecommendation.user_id == user_id,
                    StudyRecommendation.status == 'active',
                    or_(
                        StudyRecommendation.expires_at.is_(None),
                        StudyRecommendation.expires_at > datetime.utcnow()
                    )
                )
            ).order_by(desc(StudyRecommendation.priority_score))
            
            if limit:
                query = query.limit(limit)
                
            recommendations = query.all()
            for rec in recommendations:
                session.expunge(rec)
            return recommendations
            
    def create_recommendation(self, user_id: UUID, rec_data: Dict[str, Any]) -> StudyRecommendation:
        """Create a new study recommendation"""
        rec_data['user_id'] = user_id
        return self.create(**rec_data)
        
    def apply_recommendation(self, rec_id: UUID) -> Optional[StudyRecommendation]:
        """Mark recommendation as applied"""
        return self.update(rec_id, status='applied')
        
    def dismiss_recommendation(self, rec_id: UUID) -> Optional[StudyRecommendation]:
        """Mark recommendation as dismissed"""
        return self.update(rec_id, status='dismissed')
        
    def expire_old_recommendations(self, user_id: UUID) -> int:
        """Expire recommendations that have passed their expiry date"""
        with self.get_session() as session:
            count = session.query(StudyRecommendation).filter(
                and_(
                    StudyRecommendation.user_id == user_id,
                    StudyRecommendation.status == 'active',
                    StudyRecommendation.expires_at < datetime.utcnow()
                )
            ).update({'status': 'expired'})
            return count


class GoalProgressRepository(BaseRepository[GoalProgress]):
    """Repository for goal progress tracking"""
    
    def __init__(self, session_factory: sessionmaker):
        super().__init__(GoalProgress, session_factory)
        
    def log_progress(self, goal_id: UUID, user_id: UUID, progress_data: Dict[str, Any]) -> GoalProgress:
        """Log progress for a goal on a specific date"""
        progress_date = progress_data.get('progress_date', date.today())
        
        # Check if progress already exists for this date
        existing = self.find_by(goal_id=goal_id, progress_date=progress_date)
        
        if existing:
            # Update existing progress
            return self.update(existing.id, **progress_data)
        else:
            # Create new progress record
            progress_data.update({
                'goal_id': goal_id,
                'user_id': user_id,
                'progress_date': progress_date
            })
            return self.create(**progress_data)
            
    def get_goal_progress_history(self, goal_id: UUID, limit: Optional[int] = None) -> List[GoalProgress]:
        """Get progress history for a goal"""
        with self.get_session() as session:
            query = session.query(GoalProgress).filter(
                GoalProgress.goal_id == goal_id
            ).order_by(desc(GoalProgress.progress_date))
            
            if limit:
                query = query.limit(limit)
                
            progress_records = query.all()
            for record in progress_records:
                session.expunge(record)
            return progress_records
            
    def get_weekly_progress(self, user_id: UUID, week_start: date) -> List[GoalProgress]:
        """Get progress records for a specific week"""
        week_end = week_start + timedelta(days=6)
        
        with self.get_session() as session:
            records = session.query(GoalProgress).filter(
                and_(
                    GoalProgress.user_id == user_id,
                    GoalProgress.progress_date >= week_start,
                    GoalProgress.progress_date <= week_end
                )
            ).order_by(GoalProgress.progress_date).all()
            
            for record in records:
                session.expunge(record)
            return records
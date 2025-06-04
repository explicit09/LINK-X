"""
Dashboard Repository for user activity and performance data.
Handles dashboard-specific database queries following the repository pattern.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import and_, or_, func, case, desc, asc

from .base_repository import BaseRepository
from db.schema import User, Course, Enrollment, Module, File, Todo, ApiUsageLog

logger = logging.getLogger(__name__)


class DashboardRepository:
    """Repository for dashboard data access operations."""
    
    def __init__(self, session_factory: sessionmaker):
        self.session_factory = session_factory
        
    def get_session(self):
        """Get database session."""
        return self.session_factory()
    
    def get_user_weekly_progress(self, user_id: str, week_start: datetime) -> Dict[str, Any]:
        """Get user's weekly progress metrics."""
        try:
            with self.get_session() as session:
                week_end = week_start + timedelta(days=7)
                
                # Get XP progress (from API usage or activity logs)
                xp_data = self._get_weekly_xp(session, user_id, week_start, week_end)
                
                # Get task completion
                task_data = self._get_weekly_tasks(session, user_id, week_start, week_end)
                
                # Get study time (from file access logs)
                study_data = self._get_weekly_study_time(session, user_id, week_start, week_end)
                
                return {
                    "xp": xp_data,
                    "tasks": task_data,
                    "study_time": study_data
                }
                
        except Exception as e:
            logger.error(f"Error getting weekly progress for user {user_id}: {e}")
            return {
                "xp": {"current": 0, "target": 150},
                "tasks": {"completed": 0, "total": 8},
                "study_time": {"current": 0.0, "target": 12.0}
            }
    
    def get_user_priority_actions(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get prioritized actions for a user."""
        try:
            with self.get_session() as session:
                actions = []
                
                # Get urgent todos
                urgent_todos = self._get_urgent_todos(session, user_id)
                actions.extend(urgent_todos)
                
                # Get overdue assignments (files with due dates)
                overdue_assignments = self._get_overdue_assignments(session, user_id)
                actions.extend(overdue_assignments)
                
                # Get courses needing attention (low engagement)
                attention_courses = self._get_courses_needing_attention(session, user_id)
                actions.extend(attention_courses)
                
                # Sort by urgency and limit
                urgency_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
                actions.sort(key=lambda x: urgency_order.get(x.get("urgency", "low"), 3))
                
                return actions[:limit]
                
        except Exception as e:
            logger.error(f"Error getting priority actions for user {user_id}: {e}")
            return []
    
    def get_user_performance_metrics(self, user_id: str) -> Dict[str, Any]:
        """Get user's performance metrics for dashboard."""
        try:
            with self.get_session() as session:
                # Get current week and last week boundaries
                now = datetime.utcnow()
                current_week_start = now - timedelta(days=now.weekday())
                last_week_start = current_week_start - timedelta(days=7)
                
                # Calculate performance scores
                current_week_score = self._calculate_performance_score(
                    session, user_id, current_week_start, now
                )
                last_week_score = self._calculate_performance_score(
                    session, user_id, last_week_start, current_week_start
                )
                
                # Calculate improvement
                improvement = current_week_score - last_week_score if last_week_score > 0 else 0
                
                # Get ranking (mock for now)
                rank_data = self._get_user_ranking(session, user_id)
                
                return {
                    "improvement_percentage": round(improvement, 1),
                    "current_rank": rank_data.get("rank", 0),
                    "rank_change": rank_data.get("change", 0),
                    "average_score": round(current_week_score, 1)
                }
                
        except Exception as e:
            logger.error(f"Error getting performance metrics for user {user_id}: {e}")
            return {
                "improvement_percentage": 0,
                "current_rank": 0,
                "rank_change": 0,
                "average_score": 0
            }
    
    def get_user_schedule_today(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's schedule for today."""
        try:
            with self.get_session() as session:
                today = datetime.utcnow().date()
                
                # Get todos due today
                todos_query = session.query(Todo).filter(
                    and_(
                        Todo.user_id == user_id,
                        func.date(Todo.due_date) == today
                    )
                ).order_by(Todo.due_date)
                
                schedule_items = []
                for todo in todos_query.all():
                    schedule_items.append({
                        "time": todo.due_date.strftime("%H:%M") if todo.due_date else "TBD",
                        "title": todo.title,
                        "status": "urgent" if todo.priority == "high" else "scheduled",
                        "is_next": not todo.completed,
                        "course_id": None,  # Could be enhanced to link todos to courses
                        "type": "todo"
                    })
                
                # Add some mock scheduled study sessions based on user patterns
                # This would be replaced with actual calendar integration
                if not schedule_items:
                    schedule_items = self._get_default_schedule_items()
                
                return schedule_items
                
        except Exception as e:
            logger.error(f"Error getting today's schedule for user {user_id}: {e}")
            return []
    
    def get_user_courses_overview(self, user_id: str) -> Dict[str, Any]:
        """Get overview of user's courses."""
        try:
            with self.get_session() as session:
                # Get user's enrollments
                enrollments_query = session.query(Enrollment, Course).join(
                    Course, Enrollment.course_id == Course.id
                ).filter(Enrollment.user_id == user_id)
                
                active_courses = 0
                behind_courses = 0
                total_courses = 0
                
                for enrollment, course in enrollments_query.all():
                    total_courses += 1
                    # All enrollments are considered active since there's no status field
                    active_courses += 1
                    
                    # Check if behind (simple heuristic based on last activity)
                    if self._is_course_behind_schedule(session, user_id, course.id):
                        behind_courses += 1
                
                return {
                    "active_courses": active_courses,
                    "behind_courses": behind_courses,
                    "total_courses": total_courses
                }
                
        except Exception as e:
            logger.error(f"Error getting courses overview for user {user_id}: {e}")
            return {"active_courses": 0, "behind_courses": 0, "total_courses": 0}
    
    def get_user_activity_timeline(self, user_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """Get user's activity timeline for the past N days."""
        try:
            with self.get_session() as session:
                start_date = datetime.utcnow() - timedelta(days=days)
                
                # Get recent API usage as activity indicator
                activity_query = session.query(ApiUsageLog).filter(
                    and_(
                        ApiUsageLog.user_id == user_id,
                        ApiUsageLog.timestamp >= start_date
                    )
                ).order_by(desc(ApiUsageLog.timestamp))
                
                activities = []
                for log in activity_query.limit(20).all():  # Limit to recent activities
                    activities.append({
                        "timestamp": log.timestamp,
                        "activity": self._format_activity_description(log),
                        "type": self._classify_activity_type(log),
                        "metadata": {
                            "endpoint": log.endpoint,
                            "method": log.method,
                            "status_code": log.response_status
                        }
                    })
                
                return activities
                
        except Exception as e:
            logger.error(f"Error getting activity timeline for user {user_id}: {e}")
            return []
    
    # Helper methods
    def _get_weekly_xp(self, session: Session, user_id: str, start: datetime, end: datetime) -> Dict[str, int]:
        """Calculate weekly XP based on activity."""
        # Mock calculation - replace with real XP system
        # Could be based on completed todos, file interactions, etc.
        activity_count = session.query(ApiUsageLog).filter(
            and_(
                ApiUsageLog.user_id == user_id,
                ApiUsageLog.timestamp >= start,
                ApiUsageLog.timestamp <= end
            )
        ).count()
        
        current_xp = min(activity_count * 2, 150)  # 2 XP per activity, max 150
        return {"current": current_xp, "target": 150}
    
    def _get_weekly_tasks(self, session: Session, user_id: str, start: datetime, end: datetime) -> Dict[str, int]:
        """Get weekly task completion."""
        completed_todos = session.query(Todo).filter(
            and_(
                Todo.user_id == user_id,
                Todo.completed == True,
                Todo.completed_at >= start,
                Todo.completed_at <= end
            )
        ).count()
        
        total_todos = session.query(Todo).filter(
            and_(
                Todo.user_id == user_id,
                Todo.created_at >= start,
                Todo.created_at <= end
            )
        ).count()
        
        return {"completed": completed_todos, "total": max(total_todos, 8)}  # Minimum 8 for target
    
    def _get_weekly_study_time(self, session: Session, user_id: str, start: datetime, end: datetime) -> Dict[str, float]:
        """Calculate weekly study time from file access logs."""
        # This is a simplified calculation
        # In reality, you'd track session duration, file viewing time, etc.
        file_access_count = session.query(ApiUsageLog).filter(
            and_(
                ApiUsageLog.user_id == user_id,
                ApiUsageLog.endpoint.like('%/files/%'),
                ApiUsageLog.timestamp >= start,
                ApiUsageLog.timestamp <= end
            )
        ).count()
        
        # Estimate 10 minutes per file access
        study_hours = (file_access_count * 10) / 60
        return {"current": min(study_hours, 12.0), "target": 12.0}
    
    def _get_urgent_todos(self, session: Session, user_id: str) -> List[Dict[str, Any]]:
        """Get urgent todos."""
        urgent_todos = session.query(Todo).filter(
            and_(
                Todo.user_id == user_id,
                Todo.completed == False,
                or_(
                    Todo.priority == "high",
                    Todo.due_date <= datetime.utcnow() + timedelta(hours=24)
                )
            )
        ).limit(3).all()
        
        actions = []
        for todo in urgent_todos:
            actions.append({
                "id": f"todo-{todo.id}",
                "title": todo.title,
                "description": todo.description or "Complete this task",
                "urgency": "urgent" if todo.priority == "high" else "medium",
                "time_estimate": "30 min",  # Could be enhanced
                "type": "todo",
                "course": None
            })
        
        return actions
    
    def _get_overdue_assignments(self, session: Session, user_id: str) -> List[Dict[str, Any]]:
        """Get overdue assignments (simplified)."""
        # This is a mock implementation
        # Real implementation would track assignments with due dates
        return []
    
    def _get_courses_needing_attention(self, session: Session, user_id: str) -> List[Dict[str, Any]]:
        """Get courses that need attention."""
        # Mock implementation - courses with low recent activity
        return []
    
    def _calculate_performance_score(self, session: Session, user_id: str, start: datetime, end: datetime) -> float:
        """Calculate performance score for a time period."""
        # Simple scoring based on activity
        activity_count = session.query(ApiUsageLog).filter(
            and_(
                ApiUsageLog.user_id == user_id,
                ApiUsageLog.timestamp >= start,
                ApiUsageLog.timestamp <= end
            )
        ).count()
        
        # Convert to score out of 100
        return min(activity_count * 5, 100)
    
    def _get_user_ranking(self, session: Session, user_id: str) -> Dict[str, Any]:
        """Get user ranking (mock implementation)."""
        # This would involve complex calculations comparing users
        return {"rank": 3, "change": 2}  # Mock data
    
    def _is_course_behind_schedule(self, session: Session, user_id: str, course_id: str) -> bool:
        """Check if user is behind schedule in a course."""
        # Mock implementation - check last activity
        last_week = datetime.utcnow() - timedelta(days=7)
        recent_activity = session.query(ApiUsageLog).filter(
            and_(
                ApiUsageLog.user_id == user_id,
                ApiUsageLog.endpoint.contains(f"courses/{course_id}"),
                ApiUsageLog.timestamp >= last_week
            )
        ).first()
        
        return recent_activity is None
    
    def _get_default_schedule_items(self) -> List[Dict[str, Any]]:
        """Get default schedule items when no todos exist."""
        return [
            {
                "time": "09:00",
                "title": "Morning Study Session",
                "status": "scheduled",
                "is_next": True,
                "course_id": None,
                "type": "study"
            },
            {
                "time": "14:00",
                "title": "Review Notes",
                "status": "scheduled",
                "is_next": False,
                "course_id": None,
                "type": "review"
            }
        ]
    
    def _format_activity_description(self, log: ApiUsageLog) -> str:
        """Format activity description from API log."""
        if "courses" in log.endpoint:
            return "Accessed course materials"
        elif "files" in log.endpoint:
            return "Viewed file"
        elif "todos" in log.endpoint:
            return "Updated tasks"
        else:
            return "General activity"
    
    def _classify_activity_type(self, log: ApiUsageLog) -> str:
        """Classify activity type from API log."""
        if "courses" in log.endpoint:
            return "learning"
        elif "files" in log.endpoint:
            return "study"
        elif "todos" in log.endpoint:
            return "planning"
        else:
            return "general"
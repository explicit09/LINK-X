"""
Dashboard metrics collector for student performance and activity analytics.
Follows the established metrics pattern for dashboard-specific data collection.
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from core.monitoring import monitor_request
from ..queries.user_metrics import UserMetricsQueries
from ..queries.course_metrics import CourseMetricsQueries

logger = logging.getLogger(__name__)


class DashboardMetricsCollector:
    """Collector for dashboard analytics and student performance metrics."""
    
    def __init__(self):
        self.user_queries = UserMetricsQueries()
        self.course_queries = CourseMetricsQueries()
    
    def get_weekly_progress(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Calculate weekly progress metrics for a user."""
        try:
            # Calculate week boundaries
                now = datetime.utcnow()
                week_start = now - timedelta(days=now.weekday())
                week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
                
                # Get user's weekly activity
                weekly_xp = self._get_weekly_xp(db, user_id, week_start)
                weekly_tasks = self._get_weekly_tasks(db, user_id, week_start)
                weekly_study_time = self._get_weekly_study_time(db, user_id, week_start)
                
                # Calculate overall progress percentage
                xp_progress = (weekly_xp['current'] / weekly_xp['target']) * 100 if weekly_xp['target'] > 0 else 0
                task_progress = (weekly_tasks['completed'] / weekly_tasks['total']) * 100 if weekly_tasks['total'] > 0 else 0
                time_progress = (weekly_study_time['current'] / weekly_study_time['target']) * 100 if weekly_study_time['target'] > 0 else 0
                
                overall_progress = (xp_progress + task_progress + time_progress) / 3
                
                return {
                    "overall": min(int(overall_progress), 100),
                    "xp": weekly_xp,
                    "tasks": weekly_tasks,
                    "study_time": weekly_study_time
                }
                
        except Exception as e:
            logger.error(f"Error calculating weekly progress for user {user_id}: {e}")
            return {
                "overall": 0,
                "xp": {"current": 0, "target": 150},
                "tasks": {"completed": 0, "total": 8},
                "study_time": {"current": 0, "target": 12}
            }
    
    def get_priority_actions(self, db: Session, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get prioritized actions for a user based on urgency and performance."""
        try:
            actions = []
                
                # Get urgent assignments
                urgent_assignments = self._get_urgent_assignments(db, user_id)
                actions.extend(urgent_assignments)
                
                # Get weak performance areas
                weak_areas = self._get_weak_performance_areas(db, user_id)
                actions.extend(weak_areas)
                
                # Get streak maintenance
                streaks = self._get_streak_maintenance(db, user_id)
                actions.extend(streaks)
                
                # Sort by urgency and limit
                urgency_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
                actions.sort(key=lambda x: urgency_order.get(x.get("urgency", "low"), 3))
                
                return actions[:limit]
                
        except Exception as e:
            logger.error(f"Error getting priority actions for user {user_id}: {e}")
            return []
    
    def get_performance_pulse(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get performance pulse data for sidebar display."""
        try:
            # Get this week vs last week comparison
                now = datetime.utcnow()
                this_week_start = now - timedelta(days=now.weekday())
                last_week_start = this_week_start - timedelta(days=7)
                
                this_week_score = self._get_week_performance_score(db, user_id, this_week_start)
                last_week_score = self._get_week_performance_score(db, user_id, last_week_start)
                
                improvement = this_week_score - last_week_score if last_week_score > 0 else 0
                
                # Get ranking info
                rank_info = self._get_user_ranking(db, user_id)
                
                return {
                    "improvement_percentage": round(improvement, 1),
                    "current_rank": rank_info.get("rank", 0),
                    "rank_change": rank_info.get("change", 0),
                    "average_score": round(this_week_score, 1)
                }
                
        except Exception as e:
            logger.error(f"Error getting performance pulse for user {user_id}: {e}")
            return {
                "improvement_percentage": 0,
                "current_rank": 0,
                "rank_change": 0,
                "average_score": 0
            }
    
    def get_today_schedule(self, db: Session, user_id: str) -> List[Dict[str, Any]]:
        """Get today's schedule for the user."""
        try:
            today = datetime.utcnow().date()
                
                # Get scheduled items for today
                schedule_items = self._get_scheduled_items(db, user_id, today)
                
                # Format for display
                formatted_schedule = []
                for item in schedule_items:
                    formatted_schedule.append({
                        "time": item.get("scheduled_time", "TBD"),
                        "title": item.get("title", "Unknown"),
                        "status": item.get("status", "scheduled"),
                        "is_next": item.get("is_next", False),
                        "course_id": item.get("course_id")
                    })
                
                return formatted_schedule
                
        except Exception as e:
            logger.error(f"Error getting today's schedule for user {user_id}: {e}")
            return []
    
    def get_course_overview(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get course overview statistics."""
        try:
            # Get user's enrolled courses
                courses = self._get_user_courses(db, user_id)
                
                active_count = sum(1 for c in courses if c.get("status") == "active")
                behind_count = sum(1 for c in courses if c.get("behind_schedule", False))
                
                return {
                    "active_courses": active_count,
                    "behind_courses": behind_count,
                    "total_courses": len(courses)
                }
                
        except Exception as e:
            logger.error(f"Error getting course overview for user {user_id}: {e}")
            return {"active_courses": 0, "behind_courses": 0, "total_courses": 0}
    
    # Helper methods
    def _get_weekly_xp(self, db: Session, user_id: str, week_start: datetime) -> Dict[str, int]:
        """Get weekly XP progress."""
        # Mock implementation - replace with real query
        return {"current": 78, "target": 150}
    
    def _get_weekly_tasks(self, db: Session, user_id: str, week_start: datetime) -> Dict[str, int]:
        """Get weekly task completion."""
        # Mock implementation - replace with real query
        return {"completed": 5, "total": 8}
    
    def _get_weekly_study_time(self, db: Session, user_id: str, week_start: datetime) -> Dict[str, float]:
        """Get weekly study time."""
        # Mock implementation - replace with real query
        return {"current": 8.5, "target": 12.0}
    
    def _get_urgent_assignments(self, db: Session, user_id: str) -> List[Dict[str, Any]]:
        """Get urgent assignments for the user."""
        # Mock implementation - replace with real query
        return [
            {
                "id": "urgent-assignment-1",
                "title": "CS229 Assignment",
                "description": "Neural Networks Project - Due today",
                "urgency": "urgent",
                "time_estimate": "45 min",
                "type": "assignment",
                "course": "CS229"
            }
        ]
    
    def _get_weak_performance_areas(self, db: Session, user_id: str) -> List[Dict[str, Any]]:
        """Get areas where user performance is weak."""
        # Mock implementation - replace with real query
        return [
            {
                "id": "weak-area-1",
                "title": "CS224n Review",
                "description": "Weak score on last quiz",
                "urgency": "medium",
                "time_estimate": "20 min",
                "type": "review",
                "course": "CS224n"
            }
        ]
    
    def _get_streak_maintenance(self, db: Session, user_id: str) -> List[Dict[str, Any]]:
        """Get streak maintenance tasks."""
        # Mock implementation - replace with real query
        return [
            {
                "id": "streak-1",
                "title": "CS231n Practice",
                "description": "Maintain 5-day streak",
                "urgency": "low",
                "time_estimate": "15 min",
                "type": "practice",
                "course": "CS231n"
            }
        ]
    
    def _get_week_performance_score(self, db: Session, user_id: str, week_start: datetime) -> float:
        """Calculate performance score for a given week."""
        # Mock implementation - replace with real calculation
        return 85.5
    
    def _get_user_ranking(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get user's current ranking."""
        # Mock implementation - replace with real query
        return {"rank": 3, "change": 2}
    
    def _get_scheduled_items(self, db: Session, user_id: str, date) -> List[Dict[str, Any]]:
        """Get scheduled items for a specific date."""
        # Mock implementation - replace with real query
        return [
            {
                "scheduled_time": "9:00 AM",
                "title": "CS229 Assignment",
                "status": "urgent",
                "is_next": True,
                "course_id": "cs229"
            },
            {
                "scheduled_time": "11:00 AM",
                "title": "Study Group",
                "status": "scheduled",
                "is_next": False,
                "course_id": "cs224n"
            }
        ]
    
    def _get_user_courses(self, db: Session, user_id: str) -> List[Dict[str, Any]]:
        """Get user's enrolled courses."""
        # Mock implementation - replace with real query
        return [
            {"id": "cs229", "status": "active", "behind_schedule": False},
            {"id": "cs224n", "status": "active", "behind_schedule": False},
            {"id": "cs231n", "status": "active", "behind_schedule": False}
        ]
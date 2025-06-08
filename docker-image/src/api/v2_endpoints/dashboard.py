"""
API v2 Dashboard Endpoints
Provides dashboard data and analytics for students
"""
from flask import Blueprint, request, g
from datetime import datetime, timedelta
import logging

from core.exceptions import ValidationError, NotFoundError
from repositories.dashboard_repository import DashboardRepository
from services.ai.dashboard_ai import DashboardAIService
# from api.metrics.collectors.dashboard import DashboardMetricsCollector
from core.database_supabase import db_manager

from .utils import success_response, error_response, validate_pagination

logger = logging.getLogger(__name__)

# Create dashboard blueprint
dashboard_bp = Blueprint('api_v2_dashboard', __name__)

# Initialize services lazily
dashboard_repo = None
dashboard_ai = None
def get_dashboard_repo():
    """Get dashboard repository instance with lazy initialization"""
    global dashboard_repo
    if dashboard_repo is None:
        session_factory = db_manager.session_factory
        dashboard_repo = DashboardRepository(session_factory)
    return dashboard_repo

def get_dashboard_ai():
    """Get dashboard AI service instance with lazy initialization"""
    global dashboard_ai
    if dashboard_ai is None:
        dashboard_ai = DashboardAIService()
    return dashboard_ai


@dashboard_bp.route('/overview', methods=['GET'])

def get_dashboard_overview_v2():
    """Get comprehensive dashboard overview for the current user"""
    try:
        # Mock user - auth removed
        user_id = str(user.id)
        
        # Get all dashboard data
        repo = get_dashboard_repo()
        ai_service = get_dashboard_ai()
        
        # Get weekly progress
        now = datetime.utcnow()
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        weekly_progress = repo.get_user_weekly_progress(user_id, week_start)
        
        # Calculate overall progress percentage
        xp_progress = (weekly_progress['xp']['current'] / weekly_progress['xp']['target']) * 100 if weekly_progress['xp']['target'] > 0 else 0
        task_progress = (weekly_progress['tasks']['completed'] / weekly_progress['tasks']['total']) * 100 if weekly_progress['tasks']['total'] > 0 else 0
        time_progress = (weekly_progress['study_time']['current'] / weekly_progress['study_time']['target']) * 100 if weekly_progress['study_time']['target'] > 0 else 0
        
        overall_progress = (xp_progress + task_progress + time_progress) / 3
        
        # Get priority actions
        priority_actions = repo.get_user_priority_actions(user_id, limit=5)
        
        # Get AI recommendations
        context = {
            "urgent_assignments": len([a for a in priority_actions if a.get("urgency") == "urgent"]),
            "weekly_progress": weekly_progress,
            "current_hour": now.hour
        }
        ai_recommendations = ai_service.generate_ai_recommendations(user_id, context)
        
        # Get performance metrics
        performance_metrics = repo.get_user_performance_metrics(user_id)
        
        # Get today's schedule
        today_schedule = repo.get_user_schedule_today(user_id)
        
        # Get courses overview
        courses_overview = repo.get_user_courses_overview(user_id)
        
        dashboard_data = {
            "weekly_progress": {
                "overall": min(int(overall_progress), 100),
                "xp": weekly_progress['xp'],
                "tasks": weekly_progress['tasks'],
                "study_time": weekly_progress['study_time']
            },
            "priority_actions": priority_actions,
            "ai_recommendations": ai_recommendations,
            "performance_pulse": performance_metrics,
            "today_schedule": today_schedule,
            "courses_overview": courses_overview,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        return success_response(
            dashboard_data,
            message="Dashboard overview retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Dashboard overview error: {str(e)}")
        return error_response("An error occurred fetching dashboard data", status_code=500)


@dashboard_bp.route('/weekly-progress', methods=['GET'])

def get_weekly_progress_v2():
    """Get detailed weekly progress for the current user"""
    try:
        # Mock user - auth removed
        user_id = str(user.id)
        
        # Parse week parameter (optional)
        week_offset = int(request.args.get('week_offset', 0))  # 0 = current week, -1 = last week, etc.
        
        # Calculate week boundaries
        now = datetime.utcnow()
        base_week_start = now - timedelta(days=now.weekday())
        week_start = base_week_start - timedelta(weeks=abs(week_offset))
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        repo = get_dashboard_repo()
        weekly_progress = repo.get_user_weekly_progress(user_id, week_start)
        
        # Add detailed breakdown
        detailed_progress = {
            "week_start": week_start.isoformat(),
            "week_end": (week_start + timedelta(days=7)).isoformat(),
            "progress": weekly_progress,
            "daily_breakdown": []  # Could be enhanced to show daily progress
        }
        
        return success_response(
            detailed_progress,
            message="Weekly progress retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Weekly progress error: {str(e)}")
        return error_response("An error occurred fetching weekly progress", status_code=500)


@dashboard_bp.route('/ai-recommendations', methods=['GET'])

def get_ai_recommendations_v2():
    """Get AI-powered recommendations for the current user"""
    try:
        # Mock user - auth removed
        user_id = str(user.id)
        
        # Get context for recommendations
        repo = get_dashboard_repo()
        ai_service = get_dashboard_ai()
        
        # Build context
        priority_actions = repo.get_user_priority_actions(user_id)
        performance_metrics = repo.get_user_performance_metrics(user_id)
        
        context = {
            "urgent_assignments": len([a for a in priority_actions if a.get("urgency") == "urgent"]),
            "performance_improvement": performance_metrics.get("improvement_percentage", 0),
            "current_rank": performance_metrics.get("current_rank", 0),
            "current_hour": datetime.utcnow().hour
        }
        
        # Generate recommendations
        recommendations = ai_service.generate_ai_recommendations(user_id, context)
        
        # Get optimal study time prediction
        optimal_time = ai_service.predict_optimal_study_time(user_id)
        
        return success_response({
            "recommendations": recommendations,
            "optimal_study_time": optimal_time,
            "generated_at": datetime.utcnow().isoformat()
        }, message="AI recommendations generated successfully")
        
    except Exception as e:
        logger.error(f"AI recommendations error: {str(e)}")
        return error_response("An error occurred generating recommendations", status_code=500)


@dashboard_bp.route('/performance-pulse', methods=['GET'])

def get_performance_pulse_v2():
    """Get performance pulse data for sidebar display"""
    try:
        # Mock user - auth removed
        user_id = str(user.id)
        
        repo = get_dashboard_repo()
        ai_service = get_dashboard_ai()
        
        # Get performance metrics
        performance_metrics = repo.get_user_performance_metrics(user_id)
        
        # Get AI insights
        insights = ai_service.generate_performance_insights(user_id, performance_metrics)
        
        pulse_data = {
            "metrics": performance_metrics,
            "insights": insights,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        return success_response(
            pulse_data,
            message="Performance pulse retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Performance pulse error: {str(e)}")
        return error_response("An error occurred fetching performance data", status_code=500)


@dashboard_bp.route('/schedule/today', methods=['GET'])

def get_today_schedule_v2():
    """Get today's schedule for the current user"""
    try:
        # Mock user - auth removed
        user_id = str(user.id)
        
        repo = get_dashboard_repo()
        schedule = repo.get_user_schedule_today(user_id)
        
        # Add metadata
        schedule_data = {
            "date": datetime.utcnow().date().isoformat(),
            "items": schedule,
            "total_items": len(schedule),
            "upcoming_items": len([item for item in schedule if not item.get("status") == "completed"])
        }
        
        return success_response(
            schedule_data,
            message="Today's schedule retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Today's schedule error: {str(e)}")
        return error_response("An error occurred fetching today's schedule", status_code=500)


@dashboard_bp.route('/courses-overview', methods=['GET'])

def get_courses_overview_v2():
    """Get courses overview for the current user"""
    try:
        # Mock user - auth removed
        user_id = str(user.id)
        
        repo = get_dashboard_repo()
        overview = repo.get_user_courses_overview(user_id)
        
        return success_response(
            overview,
            message="Courses overview retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Courses overview error: {str(e)}")
        return error_response("An error occurred fetching courses overview", status_code=500)


@dashboard_bp.route('/activity-timeline', methods=['GET'])

def get_activity_timeline_v2():
    """Get user's recent activity timeline"""
    try:
        # Mock user - auth removed
        user_id = str(user.id)
        
        # Parse query parameters
        days = int(request.args.get('days', 7))
        page, per_page = validate_pagination()
        
        repo = get_dashboard_repo()
        activities = repo.get_user_activity_timeline(user_id, days)
        
        # Apply pagination
        total = len(activities)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_activities = activities[start:end]
        
        timeline_data = {
            "activities": paginated_activities,
            "days_range": days,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        }
        
        return success_response(
            timeline_data,
            message="Activity timeline retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Activity timeline error: {str(e)}")
        return error_response("An error occurred fetching activity timeline", status_code=500)


@dashboard_bp.route('/action-plan', methods=['POST'])

def generate_action_plan_v2():
    """Generate adaptive action plan for specific goals"""
    try:
        # Mock user - auth removed
        user_id = str(user.id)
        
        data = request.get_json()
        if not data or 'goal' not in data:
            return error_response("Goal is required")
        
        goal = data['goal']
        ai_service = get_dashboard_ai()
        
        # Generate action plan
        action_plan = ai_service.generate_adaptive_action_plan(user_id, goal)
        
        plan_data = {
            "goal": goal,
            "action_plan": action_plan,
            "generated_at": datetime.utcnow().isoformat(),
            "estimated_completion": None  # Could calculate based on time estimates
        }
        
        return success_response(
            plan_data,
            message="Action plan generated successfully",
            status_code=201
        )
        
    except Exception as e:
        logger.error(f"Action plan generation error: {str(e)}")
        return error_response("An error occurred generating action plan", status_code=500)
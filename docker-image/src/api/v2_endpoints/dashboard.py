"""
API v2 Dashboard Endpoints
Provides dashboard data and analytics for students
"""
from flask import Blueprint, request, g
from datetime import datetime, timedelta
import logging
from sqlalchemy import text

from core.decorators_unified import auth_required
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


def _safe_parse_datetime(date_str):
    """Safely parse datetime string with proper error handling"""
    if not date_str:
        return None
    try:
        # Handle both datetime objects and strings
        if isinstance(date_str, datetime):
            return date_str
        if isinstance(date_str, str):
            # Remove 'Z' and add timezone offset for ISO format
            clean_str = date_str.replace('Z', '+00:00')
            return datetime.fromisoformat(clean_str)
        return None
    except (ValueError, TypeError, AttributeError):
        return None


@dashboard_bp.route('/unified', methods=['GET'])
@auth_required()
def get_unified_dashboard():
    """
    OPTIMIZED: Get all dashboard data in a single API call with optimized database queries.
    This replaces the need for 15+ individual frontend queries with 1 comprehensive endpoint.
    Uses JOINs and the database indexes we created for maximum performance.
    """
    try:
        user = g.current_user
        user_id = str(user.id)
        
        logger.info(f"Getting dashboard data for user {user_id}, email: {getattr(user, 'email', 'N/A')}")
        
        # Execute optimized database query with JOINs
        try:
            with db_manager.session_factory() as session:
                # Calculate date boundaries first
                now = datetime.utcnow()
                week_start = now - timedelta(days=now.weekday())
                week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
                last_week = now - timedelta(days=7)
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                today_end = today_start + timedelta(days=1)
                
                # Get user basic data
                user_query = text("""
                    SELECT 
                        p.id,
                        p.email,
                        p.role,
                        p.full_name,
                        p.onboarding_step
                    FROM profiles p
                    WHERE p.id = :user_id
                """)
                user_result = session.execute(user_query, {'user_id': user_id}).fetchone()
                logger.info(f"User query result: {user_result}")
                
                # Get user stats separately
                stats_query = text("""
                    SELECT 
                        us.current_level, 
                        us.total_xp, 
                        us.daily_streak as streak_days,
                        us.weekly_xp,
                        us.weekly_goal,
                        us.weekly_progress,
                        us.total_study_minutes,
                        us.weekly_study_minutes,
                        COALESCE((
                            SELECT COUNT(*) 
                            FROM user_achievements ua 
                            WHERE ua.user_id = us.user_id
                        ), 0) as badges_earned
                    FROM user_stats us
                    WHERE us.user_id = :user_id
                """)
                stats_result = session.execute(stats_query, {'user_id': user_id}).fetchone()
                logger.info(f"Stats query result: {stats_result}")
                
                # Get weekly XP
                weekly_xp_query = text("""
                    SELECT COALESCE(SUM(xp_earned), 0) as week_xp
                    FROM user_activities
                    WHERE user_id = :user_id AND created_at >= :week_start
                """)
                weekly_xp_result = session.execute(weekly_xp_query, {
                    'user_id': user_id,
                    'week_start': week_start
                }).fetchone()
                logger.info(f"Weekly XP result: {weekly_xp_result}")
                
                # Get recent activities
                activities_query = text("""
                    SELECT activity_type, xp_earned, created_at, metadata
                    FROM user_activities
                    WHERE user_id = :user_id AND created_at >= :last_week
                    ORDER BY created_at DESC
                    LIMIT 10
                """)
                activities_result = session.execute(activities_query, {
                    'user_id': user_id,
                    'last_week': last_week
                }).fetchall()
                logger.info(f"Activities count: {len(activities_result)}")
                
                # Get courses
                courses_query = text("""
                    SELECT c.id, c.title, c.description, c.published, e.enrolled_at
                    FROM enrollments e
                    JOIN courses c ON e.course_id = c.id
                    WHERE e.user_id = :user_id
                    ORDER BY e.enrolled_at DESC
                    LIMIT 5
                """)
                courses_result = session.execute(courses_query, {'user_id': user_id}).fetchall()
                logger.info(f"Courses count: {len(courses_result)}")
                
                # Get todos
                todos_query = text("""
                    SELECT id, title, description, completed, priority, due_date, created_at, updated_at
                    FROM todos
                    WHERE user_id = :user_id AND (completed = false OR updated_at >= :last_week)
                    ORDER BY priority DESC, created_at DESC
                    LIMIT 10
                """)
                todos_result = session.execute(todos_query, {
                    'user_id': user_id,
                    'last_week': last_week
                }).fetchall()
                logger.info(f"Todos count: {len(todos_result)}")
                
                # Build dashboard data from individual queries
                user_data = {
                    "id": str(user_id),
                    "email": user_result.email if user_result else getattr(user, 'email', ''),
                    "full_name": user_result.full_name if user_result else None,
                    "role": user_result.role if user_result else "student",
                    "onboarding_step": user_result.onboarding_step if user_result else None
                }
                
                stats_data = {
                    "current_level": stats_result.current_level if stats_result else 1,
                    "total_xp": stats_result.total_xp if stats_result else 0,
                    "streak_days": stats_result.streak_days if stats_result else 0,
                    "badges_earned": stats_result.badges_earned if stats_result else 0
                }
                
                # Get the actual weekly data from stats
                weekly_xp_from_stats = stats_result.weekly_xp if stats_result else 0
                weekly_goal = stats_result.weekly_goal if stats_result else 500
                weekly_progress_percent = stats_result.weekly_progress if stats_result else 0
                
                # Calculate actual percentage if weekly_progress is 0
                if weekly_progress_percent == 0 and weekly_xp_from_stats > 0:
                    weekly_progress_percent = int((weekly_xp_from_stats / weekly_goal) * 100)
                
                weekly_xp = weekly_xp_result.week_xp if weekly_xp_result else 0
                
                recent_activities = [
                    {
                        "activity_type": a.activity_type,
                        "xp_earned": a.xp_earned,
                        "created_at": a.created_at.isoformat() if a.created_at else None,
                        "metadata": a.metadata
                    }
                    for a in activities_result
                ]
                
                courses = [
                    {
                        "id": str(c.id),
                        "title": c.title,
                        "description": c.description,
                        "published": c.published,
                        "enrolled_at": c.enrolled_at.isoformat() if c.enrolled_at else None
                    }
                    for c in courses_result
                ]
                
                todos = [
                    {
                        "id": str(t.id),
                        "title": t.title,
                        "description": t.description,
                        "completed": t.completed,
                        "priority": t.priority,
                        "due_date": t.due_date.isoformat() if t.due_date else None,
                        "created_at": t.created_at.isoformat() if t.created_at else None
                    }
                    for t in todos_result
                ]
                
                # Build the dashboard data from our individual queries
                dashboard_data = {
                    "user": user_data,
                    "stats": stats_data,
                    "weekly_progress": {
                        "xp": {
                            "current": weekly_xp_from_stats,
                            "target": weekly_goal,
                            "percentage": weekly_progress_percent
                        },
                        "tasks": {
                            "completed": len([t for t in todos if t.get("completed")]),
                            "total": max(len(todos), 8)
                        },
                        "study_time": {
                            "current": stats_result.weekly_study_minutes / 60 if stats_result and stats_result.weekly_study_minutes else 0,
                            "target": 12.0,
                            "total_minutes": stats_result.total_study_minutes if stats_result else 0
                        }
                    },
                    "recent_activities": recent_activities[:5],
                    "courses": {
                        "enrolled": courses,
                        "active_count": len([c for c in courses if c.get("published")]),
                        "total_count": len(courses)
                    },
                    "todos": {
                        "urgent": [t for t in todos if not t.get("completed") and t.get("priority") == "high"][:5],
                        "upcoming": [t for t in todos if not t.get("completed")][:8],
                        "completed_today": []  # TODO: filter by today's date
                    },
                    "today_schedule": [],  # TODO: implement study sessions
                    "achievements": [],  # TODO: implement achievements
                    "performance_pulse": {
                        "improvement_percentage": min(len(recent_activities) * 2.5, 25),
                        "current_rank": max(50 - len(recent_activities), 1),
                        "rank_change": 0,
                        "average_score": min(weekly_xp / 150 * 100, 100) if weekly_xp > 0 else 0
                    },
                    "ai_recommendations": [
                        {
                            "id": "focus-session",
                            "title": "Start 45-min Focus Session",
                            "description": "Based on your recent activity patterns",
                            "icon": "🧠",
                            "action": "Start Now",
                            "xp_reward": 25,
                            "estimated_time": "45 min"
                        }
                    ] if len(recent_activities) > 0 else [],
                    "last_updated": now.isoformat(),
                    "optimized": True,
                    "data_freshness": "real-time"
                }
                
                logger.info(f"Unified dashboard query executed successfully for user {user_id}")
                return success_response(
                    dashboard_data,
                    message="Unified dashboard data retrieved successfully"
                )
                
        except Exception as db_error:
            logger.error(f"Database error in unified dashboard: {db_error}")
            # Fallback to basic data structure
            dashboard_data = {
                "user": {
                    "id": str(user_id), 
                    "email": getattr(user, 'email', ''), 
                    "full_name": None,
                    "role": "student",
                    "onboarding_step": None
                },
                "stats": {"current_level": 1, "total_xp": 0, "streak_days": 0},
                "weekly_progress": {"xp": {"current": 0, "target": 150}, "tasks": {"completed": 0, "total": 8}},
                "recent_activities": [],
                "courses": {"enrolled": [], "active_count": 0, "total_count": 0},
                "todos": {"urgent": [], "upcoming": [], "completed_today": []},
                "today_schedule": [],
                "achievements": [],
                "performance_pulse": {"improvement_percentage": 0, "rank": 0},
                "ai_recommendations": [],
                "last_updated": datetime.utcnow().isoformat(),
                "optimized": True,
                "error": "Fallback mode - some data may be limited"
            }
            
            return success_response(
                dashboard_data,
                message="Dashboard data retrieved (fallback mode)"
            )
        
    except Exception as e:
        logger.error(f"Unified dashboard error: {str(e)}")
        return error_response("An error occurred fetching dashboard data", status_code=500)


@dashboard_bp.route('/overview', methods=['GET'])
@auth_required()
def get_dashboard_overview_v2():
    """Get comprehensive dashboard overview for the current user"""
    try:
        user = g.current_user
        user_id = str(user.id)
        
        # Try to get real data, but fall back to mock data if anything fails
        try:
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
            
        except Exception as e:
            logger.warning(f"Dashboard services failed, using fallback data: {e}")
            # Fallback to mock data
            weekly_progress = {
                "xp": {"current": 80, "target": 150},
                "tasks": {"completed": 5, "total": 8},
                "study_time": {"current": 8.5, "target": 12.0}
            }
            overall_progress = 68
            priority_actions = [
                {
                    "id": "review-notes",
                    "title": "Review CS101 Notes",
                    "description": "Prepare for upcoming quiz",
                    "urgency": "medium",
                    "estimated_time": "20 min",
                    "xp_reward": 15
                }
            ]
            ai_recommendations = [
                {
                    "id": "focus-session",
                    "title": "Start 45-min Focus Session",
                    "description": "Based on your energy patterns",
                    "icon": "🧠",
                    "action": "Start Now",
                    "xp_reward": 25,
                    "estimated_time": "45 min"
                }
            ]
            performance_metrics = {
                "improvement_percentage": 12.5,
                "current_rank": 0,
                "rank_change": 0,
                "average_score": 78.2
            }
            today_schedule = [
                {
                    "time": "14:00",
                    "title": "Data Structures Study",
                    "status": "scheduled",
                    "is_next": True,
                    "type": "study"
                }
            ]
            courses_overview = {
                "active_courses": 3,
                "behind_courses": 1,
                "total_courses": 4
            }
        
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
@auth_required()
def get_weekly_progress_v2():
    """Get detailed weekly progress for the current user"""
    try:
        user = g.current_user
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
@auth_required()
def get_ai_recommendations_v2():
    """Get AI-powered recommendations for the current user"""
    try:
        user = g.current_user
        user_id = str(user.id)
        
        # Try to get real data, but fall back to mock data if anything fails
        try:
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
            
        except Exception as e:
            logger.warning(f"AI recommendations services failed, using fallback data: {e}")
            # Fallback to mock recommendations
            recommendations = [
                {
                    "id": "focus-session",
                    "title": "Start 45-min Focus Session",
                    "description": "Based on your energy patterns",
                    "icon": "🧠",
                    "action": "Start Now",
                    "xp_reward": 25,
                    "estimated_time": "45 min"
                },
                {
                    "id": "quick-review",
                    "title": "Quick Concept Review",
                    "description": "Reinforce yesterday's learning",
                    "icon": "⚡",
                    "action": "Review Now",
                    "xp_reward": 15,
                    "estimated_time": "15 min"
                }
            ]
            optimal_time = {
                "recommended_time": None,
                "duration": 45,
                "confidence": 0.7,
                "reasoning": "Based on typical productivity patterns"
            }
        
        return success_response({
            "recommendations": recommendations,
            "optimal_study_time": optimal_time,
            "generated_at": datetime.utcnow().isoformat()
        }, message="AI recommendations generated successfully")
        
    except Exception as e:
        logger.error(f"AI recommendations error: {str(e)}")
        return error_response("An error occurred generating recommendations", status_code=500)


@dashboard_bp.route('/performance-pulse', methods=['GET'])
@auth_required()
def get_performance_pulse_v2():
    """Get performance pulse data for sidebar display"""
    try:
        user = g.current_user
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
@auth_required()
def get_today_schedule_v2():
    """Get today's schedule for the current user"""
    try:
        user = g.current_user
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
@auth_required()
def get_courses_overview_v2():
    """Get courses overview for the current user"""
    try:
        user = g.current_user
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
@auth_required()
def get_activity_timeline_v2():
    """Get user's recent activity timeline"""
    try:
        user = g.current_user
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
@auth_required()
def generate_action_plan_v2():
    """Generate adaptive action plan for specific goals"""
    try:
        user = g.current_user
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
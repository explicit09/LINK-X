"""
Study Plans API v2 Endpoints
Handles study plan management, goals, sessions, and recommendations
"""

from flask import Blueprint, request, g
from datetime import datetime, date, timedelta
from uuid import UUID
import logging

from core.decorators_unified import firebase_auth_required
from core.database import db_manager
from repositories.study_plan_repository import (
    StudyPlanRepository, StudyGoalRepository, 
    StudySessionRepository, StudyRecommendationRepository,
    GoalProgressRepository
)
from .utils import success_response, error_response, validate_pagination

logger = logging.getLogger(__name__)

study_plans_bp = Blueprint('study_plans', __name__)

# Repository instances
def get_repositories():
    """Get repository instances with session factory"""
    session_factory = db_manager.session_factory
    return {
        'study_plans': StudyPlanRepository(session_factory),
        'goals': StudyGoalRepository(session_factory),
        'sessions': StudySessionRepository(session_factory),
        'recommendations': StudyRecommendationRepository(session_factory),
        'progress': GoalProgressRepository(session_factory)
    }


# ===== STUDY PLAN ENDPOINTS =====

@study_plans_bp.route('', methods=['GET'])
@firebase_auth_required
def list_study_plans():
    """Get user's study plans"""
    try:
        repos = get_repositories()
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
        
        plans = repos['study_plans'].get_user_plans(
            user_id=g.current_user_id,
            include_inactive=include_inactive
        )
        
        plans_data = []
        for plan in plans:
            plan_data = {
                'id': str(plan.id),
                'plan_name': plan.plan_name,
                'weekly_study_hours': plan.weekly_study_hours,
                'preferred_session_length': plan.preferred_session_length,
                'break_length': plan.break_length,
                'peak_hours': plan.peak_hours,
                'learning_style': plan.learning_style,
                'difficulty_preference': plan.difficulty_preference,
                'reminder_enabled': plan.reminder_enabled,
                'reminder_time': str(plan.reminder_time) if plan.reminder_time else None,
                'is_active': plan.is_active,
                'created_at': plan.created_at.isoformat(),
                'updated_at': plan.updated_at.isoformat()
            }
            
            # Get analytics for the plan
            analytics = repos['study_plans'].get_plan_analytics(plan.id)
            plan_data['analytics'] = analytics
            
            plans_data.append(plan_data)
        
        return success_response(plans_data, "Study plans retrieved successfully")
        
    except Exception as e:
        logger.error(f"Error fetching study plans: {str(e)}")
        return error_response("Failed to fetch study plans", status_code=500)


@study_plans_bp.route('', methods=['POST'])
@firebase_auth_required
def create_study_plan():
    """Create a new study plan"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
            
        repos = get_repositories()
        
        # Extract plan data
        plan_data = {
            'plan_name': data.get('plan_name', 'My Study Plan'),
            'weekly_study_hours': data.get('weekly_study_hours', 12),
            'preferred_session_length': data.get('preferred_session_length', 45),
            'break_length': data.get('break_length', 15),
            'peak_hours': data.get('peak_hours'),
            'learning_style': data.get('learning_style'),
            'difficulty_preference': data.get('difficulty_preference', 'adaptive'),
            'reminder_enabled': data.get('reminder_enabled', True),
            'reminder_time': data.get('reminder_time', '09:00:00')
        }
        
        # Extract initial goals if provided
        goals_data = data.get('initial_goals', [])
        
        # Create plan with goals
        plan = repos['study_plans'].create_plan_with_goals(
            user_id=g.current_user_id,
            plan_data=plan_data,
            goals_data=goals_data
        )
        
        # If this is set as active, deactivate other plans
        if data.get('is_active', True):
            repos['study_plans'].deactivate_other_plans(g.current_user_id, plan.id)
            repos['study_plans'].update(plan.id, is_active=True)
        
        response_data = {
            'id': str(plan.id),
            'plan_name': plan.plan_name,
            'is_active': plan.is_active,
            'created_at': plan.created_at.isoformat()
        }
        
        return success_response(response_data, "Study plan created successfully", 201)
        
    except Exception as e:
        logger.error(f"Error creating study plan: {str(e)}")
        return error_response("Failed to create study plan", status_code=500)


@study_plans_bp.route('/<plan_id>', methods=['GET'])
@firebase_auth_required
def get_study_plan(plan_id):
    """Get specific study plan with analytics"""
    try:
        repos = get_repositories()
        
        plan = repos['study_plans'].get_by_id(UUID(plan_id))
        if not plan or plan.user_id != g.current_user_id:
            return error_response("Study plan not found", status_code=404)
            
        # Get plan analytics
        analytics = repos['study_plans'].get_plan_analytics(plan.id)
        
        # Get goals for this plan
        goals = repos['goals'].get_goals_by_plan(plan.id)
        goals_data = []
        for goal in goals:
            goals_data.append({
                'id': str(goal.id),
                'title': goal.title,
                'description': goal.description,
                'goal_type': goal.goal_type,
                'priority': goal.priority,
                'estimated_hours': float(goal.estimated_hours) if goal.estimated_hours else None,
                'target_date': goal.target_date.isoformat() if goal.target_date else None,
                'status': goal.status,
                'completion_percentage': goal.completion_percentage,
                'xp_reward': goal.xp_reward,
                'course_id': str(goal.course_id) if goal.course_id else None,
                'module_id': str(goal.module_id) if goal.module_id else None,
                'file_id': str(goal.file_id) if goal.file_id else None,
                'created_at': goal.created_at.isoformat(),
                'updated_at': goal.updated_at.isoformat()
            })
        
        plan_data = {
            'id': str(plan.id),
            'plan_name': plan.plan_name,
            'weekly_study_hours': plan.weekly_study_hours,
            'preferred_session_length': plan.preferred_session_length,
            'break_length': plan.break_length,
            'peak_hours': plan.peak_hours,
            'learning_style': plan.learning_style,
            'difficulty_preference': plan.difficulty_preference,
            'reminder_enabled': plan.reminder_enabled,
            'reminder_time': str(plan.reminder_time) if plan.reminder_time else None,
            'is_active': plan.is_active,
            'goals': goals_data,
            'analytics': analytics,
            'created_at': plan.created_at.isoformat(),
            'updated_at': plan.updated_at.isoformat()
        }
        
        return success_response(plan_data, "Study plan retrieved successfully")
        
    except ValueError:
        return error_response("Invalid plan ID format", status_code=400)
    except Exception as e:
        logger.error(f"Error fetching study plan: {str(e)}")
        return error_response("Failed to fetch study plan", status_code=500)


@study_plans_bp.route('/<plan_id>', methods=['PATCH'])
@firebase_auth_required
def update_study_plan(plan_id):
    """Update study plan preferences"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
            
        repos = get_repositories()
        
        # Verify ownership
        plan = repos['study_plans'].get_by_id(UUID(plan_id))
        if not plan or plan.user_id != g.current_user_id:
            return error_response("Study plan not found", status_code=404)
            
        # Update preferences
        updated_plan = repos['study_plans'].update_plan_preferences(
            UUID(plan_id), data
        )
        
        if not updated_plan:
            return error_response("Failed to update study plan", status_code=500)
            
        response_data = {
            'id': str(updated_plan.id),
            'plan_name': updated_plan.plan_name,
            'updated_at': updated_plan.updated_at.isoformat()
        }
        
        return success_response(response_data, "Study plan updated successfully")
        
    except ValueError:
        return error_response("Invalid plan ID format", status_code=400)
    except Exception as e:
        logger.error(f"Error updating study plan: {str(e)}")
        return error_response("Failed to update study plan", status_code=500)


@study_plans_bp.route('/active', methods=['GET'])
@firebase_auth_required
def get_active_plan():
    """Get user's active study plan"""
    try:
        repos = get_repositories()
        
        plan = repos['study_plans'].get_active_plan_by_user(g.current_user_id)
        if not plan:
            return error_response("No active study plan found", status_code=404)
            
        # Get analytics and goals
        analytics = repos['study_plans'].get_plan_analytics(plan.id)
        goals = repos['goals'].get_goals_by_plan(plan.id)
        
        goals_data = []
        for goal in goals:
            goals_data.append({
                'id': str(goal.id),
                'title': goal.title,
                'status': goal.status,
                'priority': goal.priority,
                'completion_percentage': goal.completion_percentage,
                'target_date': goal.target_date.isoformat() if goal.target_date else None,
                'estimated_hours': float(goal.estimated_hours) if goal.estimated_hours else None
            })
        
        plan_data = {
            'id': str(plan.id),
            'plan_name': plan.plan_name,
            'goals': goals_data,
            'analytics': analytics
        }
        
        return success_response(plan_data, "Active study plan retrieved successfully")
        
    except Exception as e:
        logger.error(f"Error fetching active study plan: {str(e)}")
        return error_response("Failed to fetch active study plan", status_code=500)


# ===== STUDY GOAL ENDPOINTS =====

@study_plans_bp.route('/goals', methods=['GET'])
@firebase_auth_required
def list_goals():
    """Get user's study goals with filtering"""
    try:
        repos = get_repositories()
        
        # Get query parameters
        status = request.args.get('status')
        priority = request.args.get('priority')
        limit = request.args.get('limit', type=int)
        
        goals = repos['goals'].get_user_goals(
            user_id=g.current_user_id,
            status=status,
            priority=priority,
            limit=limit
        )
        
        goals_data = []
        for goal in goals:
            goals_data.append({
                'id': str(goal.id),
                'title': goal.title,
                'description': goal.description,
                'goal_type': goal.goal_type,
                'priority': goal.priority,
                'estimated_hours': float(goal.estimated_hours) if goal.estimated_hours else None,
                'target_date': goal.target_date.isoformat() if goal.target_date else None,
                'status': goal.status,
                'completion_percentage': goal.completion_percentage,
                'xp_reward': goal.xp_reward,
                'course_id': str(goal.course_id) if goal.course_id else None,
                'module_id': str(goal.module_id) if goal.module_id else None,
                'file_id': str(goal.file_id) if goal.file_id else None,
                'created_at': goal.created_at.isoformat(),
                'updated_at': goal.updated_at.isoformat()
            })
        
        return success_response(goals_data, "Goals retrieved successfully")
        
    except Exception as e:
        logger.error(f"Error fetching goals: {str(e)}")
        return error_response("Failed to fetch goals", status_code=500)


@study_plans_bp.route('/goals', methods=['POST'])
@firebase_auth_required
def create_goal():
    """Create a new study goal"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
            
        required_fields = ['title', 'study_plan_id']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return error_response(f"Missing required fields: {', '.join(missing_fields)}", status_code=400)
            
        repos = get_repositories()
        
        # Verify plan ownership
        plan = repos['study_plans'].get_by_id(UUID(data['study_plan_id']))
        if not plan or plan.user_id != g.current_user_id:
            return error_response("Study plan not found", status_code=404)
            
        goal_data = {
            'user_id': g.current_user_id,
            'study_plan_id': UUID(data['study_plan_id']),
            'title': data['title'],
            'description': data.get('description'),
            'goal_type': data.get('goal_type', 'daily'),
            'priority': data.get('priority', 'medium'),
            'estimated_hours': data.get('estimated_hours'),
            'target_date': datetime.strptime(data['target_date'], '%Y-%m-%d').date() if data.get('target_date') else None,
            'course_id': UUID(data['course_id']) if data.get('course_id') else None,
            'module_id': UUID(data['module_id']) if data.get('module_id') else None,
            'file_id': UUID(data['file_id']) if data.get('file_id') else None,
            'xp_reward': data.get('xp_reward', 20)
        }
        
        goal = repos['goals'].create(**goal_data)
        
        response_data = {
            'id': str(goal.id),
            'title': goal.title,
            'status': goal.status,
            'created_at': goal.created_at.isoformat()
        }
        
        return success_response(response_data, "Goal created successfully", 201)
        
    except ValueError as e:
        return error_response(f"Invalid data format: {str(e)}", status_code=400)
    except Exception as e:
        logger.error(f"Error creating goal: {str(e)}")
        return error_response("Failed to create goal", status_code=500)


@study_plans_bp.route('/goals/<goal_id>', methods=['PATCH'])
@firebase_auth_required
def update_goal(goal_id):
    """Update a study goal"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
            
        repos = get_repositories()
        
        # Verify goal ownership
        goal = repos['goals'].get_by_id(UUID(goal_id))
        if not goal or goal.user_id != g.current_user_id:
            return error_response("Goal not found", status_code=404)
            
        # Update goal
        updated_goal = repos['goals'].update(UUID(goal_id), **data)
        
        if not updated_goal:
            return error_response("Failed to update goal", status_code=500)
            
        response_data = {
            'id': str(updated_goal.id),
            'title': updated_goal.title,
            'status': updated_goal.status,
            'completion_percentage': updated_goal.completion_percentage,
            'updated_at': updated_goal.updated_at.isoformat()
        }
        
        return success_response(response_data, "Goal updated successfully")
        
    except ValueError:
        return error_response("Invalid goal ID format", status_code=400)
    except Exception as e:
        logger.error(f"Error updating goal: {str(e)}")
        return error_response("Failed to update goal", status_code=500)


@study_plans_bp.route('/goals/<goal_id>/progress', methods=['POST'])
@firebase_auth_required
def log_goal_progress(goal_id):
    """Log progress for a specific goal"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
            
        repos = get_repositories()
        
        # Verify goal ownership
        goal = repos['goals'].get_by_id(UUID(goal_id))
        if not goal or goal.user_id != g.current_user_id:
            return error_response("Goal not found", status_code=404)
            
        progress_data = {
            'time_spent_minutes': data.get('time_spent_minutes', 0),
            'tasks_completed': data.get('tasks_completed', 0),
            'notes': data.get('notes'),
            'mood_rating': data.get('mood_rating'),
            'difficulty_rating': data.get('difficulty_rating'),
            'progress_date': datetime.strptime(data['progress_date'], '%Y-%m-%d').date() if data.get('progress_date') else date.today()
        }
        
        progress = repos['progress'].log_progress(
            goal_id=UUID(goal_id),
            user_id=g.current_user_id,
            progress_data=progress_data
        )
        
        response_data = {
            'id': str(progress.id),
            'goal_id': str(goal_id),
            'progress_date': progress.progress_date.isoformat(),
            'time_spent_minutes': progress.time_spent_minutes
        }
        
        return success_response(response_data, "Progress logged successfully", 201)
        
    except ValueError as e:
        return error_response(f"Invalid data format: {str(e)}", status_code=400)
    except Exception as e:
        logger.error(f"Error logging progress: {str(e)}")
        return error_response("Failed to log progress", status_code=500)


# ===== STUDY SESSION ENDPOINTS =====

@study_plans_bp.route('/sessions', methods=['GET'])
@firebase_auth_required
def list_sessions():
    """Get user's study sessions"""
    try:
        repos = get_repositories()
        
        limit = request.args.get('limit', type=int)
        start_date = datetime.strptime(request.args.get('start_date'), '%Y-%m-%d').date() if request.args.get('start_date') else None
        end_date = datetime.strptime(request.args.get('end_date'), '%Y-%m-%d').date() if request.args.get('end_date') else None
        
        sessions = repos['sessions'].get_user_sessions(
            user_id=g.current_user_id,
            limit=limit,
            start_date=start_date,
            end_date=end_date
        )
        
        sessions_data = []
        for session in sessions:
            sessions_data.append({
                'id': str(session.id),
                'goal_id': str(session.goal_id) if session.goal_id else None,
                'course_id': str(session.course_id) if session.course_id else None,
                'session_type': session.session_type,
                'start_time': session.start_time.isoformat(),
                'end_time': session.end_time.isoformat() if session.end_time else None,
                'planned_duration': session.planned_duration,
                'actual_duration': session.actual_duration,
                'effectiveness_rating': session.effectiveness_rating,
                'focus_score': float(session.focus_score) if session.focus_score else None,
                'xp_earned': session.xp_earned,
                'notes': session.notes
            })
        
        return success_response(sessions_data, "Sessions retrieved successfully")
        
    except ValueError as e:
        return error_response(f"Invalid date format: {str(e)}", status_code=400)
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        return error_response("Failed to fetch sessions", status_code=500)


@study_plans_bp.route('/sessions', methods=['POST'])
@firebase_auth_required
def start_session():
    """Start a new study session"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
            
        repos = get_repositories()
        
        # Check if user has active session
        active_session = repos['sessions'].get_active_session(g.current_user_id)
        if active_session:
            return error_response("You already have an active study session", status_code=409)
            
        session_data = {
            'goal_id': UUID(data['goal_id']) if data.get('goal_id') else None,
            'course_id': UUID(data['course_id']) if data.get('course_id') else None,
            'session_type': data.get('session_type', 'study'),
            'planned_duration': data.get('planned_duration'),
            'metadata': data.get('metadata')
        }
        
        session = repos['sessions'].start_session(g.current_user_id, session_data)
        
        response_data = {
            'id': str(session.id),
            'start_time': session.start_time.isoformat(),
            'planned_duration': session.planned_duration
        }
        
        return success_response(response_data, "Study session started", 201)
        
    except ValueError as e:
        return error_response(f"Invalid data format: {str(e)}", status_code=400)
    except Exception as e:
        logger.error(f"Error starting session: {str(e)}")
        return error_response("Failed to start session", status_code=500)


@study_plans_bp.route('/sessions/<session_id>/end', methods=['POST'])
@firebase_auth_required
def end_session(session_id):
    """End a study session"""
    try:
        data = request.get_json() or {}
        
        repos = get_repositories()
        
        # Verify session ownership
        session = repos['sessions'].get_by_id(UUID(session_id))
        if not session or session.user_id != g.current_user_id:
            return error_response("Session not found", status_code=404)
            
        if session.end_time:
            return error_response("Session already ended", status_code=400)
            
        actual_duration = data.get('actual_duration')
        if not actual_duration:
            # Calculate from start time
            actual_duration = int((datetime.utcnow() - session.start_time).total_seconds() / 60)
            
        updated_session = repos['sessions'].end_session(
            session_id=UUID(session_id),
            actual_duration=actual_duration,
            effectiveness_rating=data.get('effectiveness_rating'),
            focus_score=data.get('focus_score'),
            notes=data.get('notes')
        )
        
        response_data = {
            'id': str(updated_session.id),
            'actual_duration': updated_session.actual_duration,
            'end_time': updated_session.end_time.isoformat(),
            'xp_earned': updated_session.xp_earned
        }
        
        return success_response(response_data, "Session ended successfully")
        
    except ValueError as e:
        return error_response(f"Invalid data format: {str(e)}", status_code=400)
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        return error_response("Failed to end session", status_code=500)


# ===== RECOMMENDATION ENDPOINTS =====

@study_plans_bp.route('/recommendations', methods=['GET'])
@firebase_auth_required
def list_recommendations():
    """Get active study recommendations"""
    try:
        repos = get_repositories()
        
        limit = request.args.get('limit', type=int)
        recommendations = repos['recommendations'].get_active_recommendations(
            user_id=g.current_user_id,
            limit=limit
        )
        
        recs_data = []
        for rec in recommendations:
            recs_data.append({
                'id': str(rec.id),
                'recommendation_type': rec.recommendation_type,
                'title': rec.title,
                'description': rec.description,
                'action_text': rec.action_text,
                'priority_score': float(rec.priority_score),
                'confidence_score': float(rec.confidence_score),
                'reasoning': rec.reasoning,
                'suggested_time': rec.suggested_time.isoformat() if rec.suggested_time else None,
                'estimated_impact': rec.estimated_impact,
                'xp_reward': rec.xp_reward,
                'status': rec.status,
                'created_at': rec.created_at.isoformat()
            })
        
        return success_response(recs_data, "Recommendations retrieved successfully")
        
    except Exception as e:
        logger.error(f"Error fetching recommendations: {str(e)}")
        return error_response("Failed to fetch recommendations", status_code=500)


@study_plans_bp.route('/recommendations/<rec_id>/apply', methods=['POST'])
@firebase_auth_required
def apply_recommendation(rec_id):
    """Apply a study recommendation"""
    try:
        repos = get_repositories()
        
        # Verify recommendation ownership
        rec = repos['recommendations'].get_by_id(UUID(rec_id))
        if not rec or rec.user_id != g.current_user_id:
            return error_response("Recommendation not found", status_code=404)
            
        updated_rec = repos['recommendations'].apply_recommendation(UUID(rec_id))
        
        return success_response(
            {'id': str(updated_rec.id), 'status': updated_rec.status},
            "Recommendation applied successfully"
        )
        
    except ValueError:
        return error_response("Invalid recommendation ID format", status_code=400)
    except Exception as e:
        logger.error(f"Error applying recommendation: {str(e)}")
        return error_response("Failed to apply recommendation", status_code=500)


# ===== ANALYTICS ENDPOINTS =====

@study_plans_bp.route('/analytics', methods=['GET'])
@firebase_auth_required
def get_study_analytics():
    """Get comprehensive study analytics"""
    try:
        repos = get_repositories()
        
        days = request.args.get('days', 30, type=int)
        
        # Get session analytics
        session_analytics = repos['sessions'].get_session_analytics(g.current_user_id, days)
        
        # Get active plan analytics
        active_plan = repos['study_plans'].get_active_plan_by_user(g.current_user_id)
        plan_analytics = {}
        if active_plan:
            plan_analytics = repos['study_plans'].get_plan_analytics(active_plan.id)
        
        # Get weekly progress
        week_start = date.today() - timedelta(days=date.today().weekday())
        weekly_progress = repos['progress'].get_weekly_progress(g.current_user_id, week_start)
        
        analytics_data = {
            'session_analytics': session_analytics,
            'plan_analytics': plan_analytics,
            'weekly_progress': len(weekly_progress),
            'period_days': days
        }
        
        return success_response(analytics_data, "Analytics retrieved successfully")
        
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        return error_response("Failed to fetch analytics", status_code=500)
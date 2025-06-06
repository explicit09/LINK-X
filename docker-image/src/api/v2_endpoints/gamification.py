"""
API v2 Gamification Endpoints
Handles XP, levels, streaks, and achievements
"""
from flask import Blueprint, request, g
from datetime import datetime, timedelta
import logging

from core.auth.decorators import require_auth
from core.exceptions import ValidationError, NotFoundError
from core.database_supabase import db_manager
from db.schema import UserStats, UserActivity, UserAchievement, ApiUsageLog
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from .utils import success_response, error_response

logger = logging.getLogger(__name__)

# Create gamification blueprint
gamification_bp = Blueprint('api_v2_gamification', __name__)

def get_session():
    """Get database session"""
    session_factory = db_manager.session_factory
    return session_factory()


@gamification_bp.route('/stats', methods=['GET'])
@require_auth
def get_user_stats_v2():
    """Get current user's gamification stats"""
    try:
        user = g.current_user
        user_id = str(user.id)
        
        with get_session() as session:
            # Get user stats
            stats = session.query(UserStats).filter(UserStats.user_id == user_id).first()
            
            if not stats:
                # Create default stats for new user
                stats = UserStats(user_id=user_id)
                session.add(stats)
                session.commit()
                session.refresh(stats)
            
            # Calculate XP to next level (exponential progression)
            xp_for_next_level = int(100 * pow(stats.current_level + 1, 1.5))
            
            # Get user's rank
            rank_query = session.query(func.count(UserStats.id)).filter(
                UserStats.total_xp > stats.total_xp
            ).scalar()
            rank = rank_query + 1 if rank_query else 1
            
            # Get today's XP
            today = datetime.utcnow().date()
            today_xp = session.query(func.sum(UserActivity.xp_earned)).filter(
                UserActivity.user_id == user_id,
                func.date(UserActivity.created_at) == today
            ).scalar() or 0
            
            # Get today's completed tasks (from activities)
            today_completed = session.query(func.count(UserActivity.id)).filter(
                UserActivity.user_id == user_id,
                UserActivity.activity_type.in_(['todo_complete', 'assignment_complete']),
                func.date(UserActivity.created_at) == today
            ).scalar() or 0
            
            stats_data = {
                "currentXP": stats.current_xp,
                "currentLevel": stats.current_level,
                "xpToNextLevel": xp_for_next_level,
                "dailyStreak": stats.daily_streak,
                "weeklyGoal": stats.weekly_goal,
                "weeklyProgress": stats.weekly_progress,
                "todayCompleted": today_completed,
                "todayXP": today_xp,
                "rank": rank,
                "totalXP": stats.total_xp,
                "maxStreak": stats.max_streak
            }
            
            return success_response(stats_data, message="User stats retrieved successfully")
            
    except Exception as e:
        logger.error(f"Get user stats error: {str(e)}")
        return error_response("An error occurred fetching user stats", status_code=500)


@gamification_bp.route('/award-xp', methods=['POST'])
@require_auth
def award_xp_v2():
    """Award XP to user for an activity"""
    try:
        user = g.current_user
        user_id = str(user.id)
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        activity_type = data.get('activity_type')
        xp_amount = data.get('xp_amount', 0)
        description = data.get('description')
        metadata = data.get('metadata')
        
        if not activity_type:
            return error_response("Activity type is required")
        
        if xp_amount <= 0:
            return error_response("XP amount must be positive")
        
        with get_session() as session:
            # Call the database function to award XP
            session.execute(
                "SELECT award_xp(:user_id, :activity_type, :xp_amount, :description, :metadata)",
                {
                    'user_id': user_id,
                    'activity_type': activity_type,
                    'xp_amount': xp_amount,
                    'description': description,
                    'metadata': metadata
                }
            )
            session.commit()
            
            # Get updated stats
            stats = session.query(UserStats).filter(UserStats.user_id == user_id).first()
            
            response_data = {
                "xp_awarded": xp_amount,
                "activity_type": activity_type,
                "new_total_xp": stats.total_xp if stats else xp_amount,
                "new_level": stats.current_level if stats else 1,
                "new_streak": stats.daily_streak if stats else 1
            }
            
            return success_response(
                response_data,
                message=f"Awarded {xp_amount} XP for {activity_type}",
                status_code=201
            )
            
    except Exception as e:
        logger.error(f"Award XP error: {str(e)}")
        return error_response("An error occurred awarding XP", status_code=500)


@gamification_bp.route('/achievements', methods=['GET'])
@require_auth
def get_user_achievements_v2():
    """Get user's achievements"""
    try:
        user = g.current_user
        user_id = str(user.id)
        
        with get_session() as session:
            achievements = session.query(UserAchievement).filter(
                UserAchievement.user_id == user_id
            ).order_by(desc(UserAchievement.earned_at)).all()
            
            achievements_data = []
            for achievement in achievements:
                achievements_data.append({
                    "id": str(achievement.id),
                    "type": achievement.achievement_type,
                    "name": achievement.achievement_name,
                    "description": achievement.description,
                    "icon": achievement.icon,
                    "earned_at": achievement.earned_at.isoformat()
                })
            
            return success_response({
                "achievements": achievements_data,
                "total_count": len(achievements_data)
            }, message="Achievements retrieved successfully")
            
    except Exception as e:
        logger.error(f"Get achievements error: {str(e)}")
        return error_response("An error occurred fetching achievements", status_code=500)


@gamification_bp.route('/leaderboard', methods=['GET'])
@require_auth
def get_leaderboard_v2():
    """Get user leaderboard"""
    try:
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))
        
        with get_session() as session:
            # Query leaderboard view
            leaderboard_query = session.execute(
                """
                SELECT user_id, name, current_level, total_xp, daily_streak, weekly_progress, rank
                FROM user_leaderboard
                ORDER BY rank
                LIMIT :limit OFFSET :offset
                """,
                {'limit': limit, 'offset': offset}
            ).fetchall()
            
            leaderboard_data = []
            current_user_id = str(g.current_user.id)
            for row in leaderboard_query:
                user_id = str(row[0])
                leaderboard_data.append({
                    "user_id": user_id if user_id == current_user_id else None,  # Only show current user's ID
                    "name": row[1],
                    "level": row[2],
                    "total_xp": row[3],
                    "streak": row[4],
                    "weekly_progress": row[5],
                    "rank": row[6],
                    "is_current_user": user_id == current_user_id
                })
            
            # Get current user's rank
            user = g.current_user
            user_rank_query = session.execute(
                "SELECT rank FROM user_leaderboard WHERE user_id = :user_id",
                {'user_id': str(user.id)}
            ).fetchone()
            
            current_user_rank = user_rank_query[0] if user_rank_query else None
            
            return success_response({
                "leaderboard": leaderboard_data,
                "current_user_rank": current_user_rank,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "total": len(leaderboard_data)
                }
            }, message="Leaderboard retrieved successfully")
            
    except Exception as e:
        logger.error(f"Get leaderboard error: {str(e)}")
        return error_response("An error occurred fetching leaderboard", status_code=500)


@gamification_bp.route('/activity-history', methods=['GET'])
@require_auth
def get_activity_history_v2():
    """Get user's recent activity history"""
    try:
        user = g.current_user
        user_id = str(user.id)
        
        limit = int(request.args.get('limit', 20))
        days = int(request.args.get('days', 7))
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        with get_session() as session:
            activities = session.query(UserActivity).filter(
                UserActivity.user_id == user_id,
                UserActivity.created_at >= start_date
            ).order_by(desc(UserActivity.created_at)).limit(limit).all()
            
            activities_data = []
            for activity in activities:
                activities_data.append({
                    "id": str(activity.id),
                    "type": activity.activity_type,
                    "xp_earned": activity.xp_earned,
                    "description": activity.description,
                    "metadata": activity.metadata,
                    "created_at": activity.created_at.isoformat()
                })
            
            return success_response({
                "activities": activities_data,
                "period_days": days,
                "total_activities": len(activities_data)
            }, message="Activity history retrieved successfully")
            
    except Exception as e:
        logger.error(f"Get activity history error: {str(e)}")
        return error_response("An error occurred fetching activity history", status_code=500)


# Helper function to award XP for common activities
def award_activity_xp(user_id: str, activity_type: str, **kwargs):
    """Helper function to award XP for common activities"""
    xp_amounts = {
        'login': 5,
        'file_view': 2,
        'todo_complete': 10,
        'chat_message': 3,
        'quiz_complete': 15,
        'assignment_complete': 25,
        'course_enroll': 20,
        'streak_maintain': 5
    }
    
    xp_amount = xp_amounts.get(activity_type, 1)
    description = kwargs.get('description', f"Completed {activity_type.replace('_', ' ')}")
    metadata = kwargs.get('metadata')
    
    try:
        with get_session() as session:
            session.execute(
                "SELECT award_xp(:user_id, :activity_type, :xp_amount, :description, :metadata)",
                {
                    'user_id': user_id,
                    'activity_type': activity_type,
                    'xp_amount': xp_amount,
                    'description': description,
                    'metadata': metadata
                }
            )
            session.commit()
            return True
    except Exception as e:
        logger.error(f"Error awarding XP: {e}")
        return False
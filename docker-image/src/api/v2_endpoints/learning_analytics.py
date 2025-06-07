"""
Learning Analytics & Engagement Tracking API Endpoints
Provides comprehensive analytics for students and professors
"""
from flask import Blueprint, request, g
from datetime import datetime, timedelta, date
import logging
from typing import Dict, List, Optional

from core.decorators_unified import auth_required
from core.exceptions import ValidationError, NotFoundError
from core.database_supabase import db_manager
from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from .utils import success_response, error_response, validate_pagination

logger = logging.getLogger(__name__)

# Create analytics blueprint
analytics_bp = Blueprint('api_v2_analytics', __name__)

# Repository instances (lazy initialization)
user_repo = None
course_repo = None

def get_user_repo():
    global user_repo
    if user_repo is None:
        user_repo = UserRepository(db_manager.session_factory)
    return user_repo

def get_course_repo():
    global course_repo
    if course_repo is None:
        course_repo = CourseRepository(db_manager.session_factory)
    return course_repo

@analytics_bp.route('/track/engagement', methods=['POST'])
@auth_required()
def track_engagement():
    """Track real-time engagement metrics"""
    try:
        data = request.get_json()
        user_id = str(g.current_user.id)
        
        # Validate required fields
        required_fields = ['event_type', 'content_id', 'interaction_data']
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        event_type = data['event_type']
        content_id = data['content_id']
        interaction_data = data['interaction_data']
        
        # Extract engagement metrics
        scroll_depth = interaction_data.get('scroll_depth_percentage', 0)
        time_on_content = interaction_data.get('time_on_content_seconds', 0)
        interaction_count = interaction_data.get('interaction_count', 0)
        pause_count = interaction_data.get('pause_count', 0)
        session_duration = interaction_data.get('session_duration_seconds', 0)
        
        with db_manager.get_session() as session:
            # Calculate engagement score
            engagement_score = session.execute(
                """SELECT calculate_engagement_score(%s, %s, %s, %s, %s)""",
                (interaction_count, scroll_depth, time_on_content, pause_count, session_duration)
            ).scalar()
            
            # Insert session analytics record
            session.execute(
                """
                INSERT INTO session_analytics (
                    user_id, event_type, engagement_score, interaction_count,
                    scroll_depth_percentage, time_on_content, pause_count,
                    analytics_metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id, event_type, engagement_score, interaction_count,
                    scroll_depth, time_on_content, pause_count,
                    {
                        'content_id': content_id,
                        'content_type': interaction_data.get('content_type'),
                        'device_type': interaction_data.get('device_type', 'unknown'),
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )
            )
            
            # Log user activity
            session.execute(
                """
                INSERT INTO user_activities (
                    user_id, activity_type, session_duration, 
                    content_completion_percentage, activity_metadata
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    user_id, f"{event_type}_engagement", session_duration,
                    interaction_data.get('completion_percentage', 0),
                    {
                        'content_id': content_id,
                        'engagement_score': float(engagement_score),
                        'file_id': content_id if event_type == 'file_view' else None
                    }
                )
            )
            
            # Update file engagement metrics if applicable
            if event_type == 'file_view' and content_id:
                session.execute(
                    "SELECT update_file_engagement_metrics(%s)",
                    (content_id,)
                )
            
            session.commit()
        
        return success_response({
            'engagement_score': float(engagement_score),
            'tracked_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error tracking engagement: {str(e)}")
        return error_response(str(e), 500)

@analytics_bp.route('/student/dashboard', methods=['GET'])
@auth_required()
def get_student_analytics_dashboard():
    """Get comprehensive analytics dashboard for student"""
    try:
        user_id = str(g.current_user.id)
        
        # Parse query parameters
        days = request.args.get('days', '30', type=int)
        if days not in [7, 30, 90]:
            days = 30
            
        with db_manager.get_session() as session:
            # Get student analytics data
            analytics_data = session.execute(
                """
                SELECT * FROM student_learning_analytics 
                WHERE user_id = %s
                """,
                (user_id,)
            ).fetchone()
            
            if not analytics_data:
                return success_response({
                    'analytics': None,
                    'message': 'No analytics data available yet'
                })
            
            # Convert to dict
            analytics = dict(analytics_data._mapping)
            
            # Get engagement trends over time
            engagement_trends = session.execute(
                """
                SELECT 
                    DATE(event_timestamp) as date,
                    AVG(engagement_score) as avg_engagement,
                    COUNT(*) as session_count,
                    AVG(time_on_content) as avg_time_on_content
                FROM session_analytics 
                WHERE user_id = %s 
                AND event_timestamp >= CURRENT_DATE - INTERVAL '%s days'
                AND engagement_score IS NOT NULL
                GROUP BY DATE(event_timestamp)
                ORDER BY date
                """,
                (user_id, days)
            ).fetchall()
            
            # Get learning patterns
            patterns = session.execute(
                """
                SELECT pattern_type, pattern_data, confidence_score, last_updated
                FROM learning_patterns 
                WHERE user_id = %s
                """,
                (user_id,)
            ).fetchall()
            
            # Get content performance
            content_performance = session.execute(
                """
                SELECT 
                    ua.activity_metadata->>'file_id' as file_id,
                    f.title,
                    AVG(ua.content_completion_percentage) as avg_completion,
                    AVG(ua.session_duration) as avg_duration,
                    COUNT(*) as access_count,
                    MAX(ua.created_at) as last_accessed
                FROM user_activities ua
                JOIN "File" f ON f.id = (ua.activity_metadata->>'file_id')::uuid
                WHERE ua.user_id = %s 
                AND ua.created_at >= CURRENT_DATE - INTERVAL '%s days'
                AND ua.activity_metadata->>'file_id' IS NOT NULL
                GROUP BY ua.activity_metadata->>'file_id', f.title
                ORDER BY avg_completion DESC, access_count DESC
                LIMIT 10
                """,
                (user_id, days)
            ).fetchall()
            
            # Get study session insights
            session_insights = session.execute(
                """
                SELECT 
                    AVG(actual_duration_minutes) as avg_session_length,
                    AVG(effectiveness_rating) as avg_effectiveness,
                    AVG(focus_score) as avg_focus_score,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_sessions,
                    SUM(xp_earned) as total_xp_earned
                FROM study_sessions 
                WHERE user_id = %s 
                AND created_at >= CURRENT_DATE - INTERVAL '%s days'
                """,
                (user_id, days)
            ).fetchone()
            
            # Format response
            dashboard_data = {
                'overview': {
                    'this_week_activities': analytics['this_week_activities'],
                    'this_week_avg_duration': float(analytics['this_week_avg_duration'] or 0),
                    'this_week_engagement': float(analytics['this_week_engagement'] or 0),
                    'monthly_activities': analytics['monthly_activities'],
                    'avg_completion_rate': float(analytics['avg_completion_rate'] or 0),
                    'avg_engagement_score': float(analytics['avg_engagement_score'] or 0),
                    'current_xp': analytics['current_xp'],
                    'current_level': analytics['current_level'],
                    'daily_streak': analytics['daily_streak']
                },
                'engagement_trends': [
                    {
                        'date': row[0].isoformat(),
                        'avg_engagement': float(row[1] or 0),
                        'session_count': row[2],
                        'avg_time_on_content': float(row[3] or 0)
                    } for row in engagement_trends
                ],
                'learning_patterns': {
                    row[0]: {
                        'data': row[1],
                        'confidence': float(row[2]),
                        'last_updated': row[3].isoformat()
                    } for row in patterns
                },
                'content_performance': [
                    {
                        'file_id': row[0],
                        'title': row[1],
                        'avg_completion': float(row[2] or 0),
                        'avg_duration': float(row[3] or 0),
                        'access_count': row[4],
                        'last_accessed': row[5].isoformat() if row[5] else None
                    } for row in content_performance
                ],
                'study_insights': {
                    'avg_session_length': float(session_insights[0] or 0),
                    'avg_effectiveness': float(session_insights[1] or 0),
                    'avg_focus_score': float(session_insights[2] or 0),
                    'completed_sessions': session_insights[3] or 0,
                    'missed_sessions': session_insights[4] or 0,
                    'total_xp_earned': session_insights[5] or 0
                },
                'generated_at': datetime.utcnow().isoformat()
            }
            
            return success_response(dashboard_data)
            
    except Exception as e:
        logger.error(f"Error getting student analytics: {str(e)}")
        return error_response(str(e), 500)

@analytics_bp.route('/professor/course/<course_id>/insights', methods=['GET'])
@auth_required(['instructor', 'admin'])
def get_course_engagement_insights(course_id: str):
    """Get engagement insights for a course (professor view)"""
    try:
        user = g.current_user
        
        # Verify course access
        course_repo = get_course_repo()
        if not course_repo.user_has_course_access(str(user.id), course_id):
            return error_response("Access denied to this course", 403)
        
        with db_manager.get_session() as session:
            # Generate fresh insights
            session.execute(
                "SELECT generate_engagement_insights(%s)",
                (course_id,)
            )
            
            # Get all insights for the course
            insights = session.execute(
                """
                SELECT insight_type, insight_data, generated_at
                FROM engagement_insights 
                WHERE course_id = %s 
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                ORDER BY generated_at DESC
                """,
                (course_id,)
            ).fetchall()
            
            # Get course engagement summary
            course_summary = session.execute(
                """
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
                WHERE e.course_id = %s
                """,
                (course_id,)
            ).fetchone()
            
            # Get module completion rates
            module_completion = session.execute(
                """
                SELECT 
                    m.id, m.title, m.ordering,
                    COUNT(DISTINCT f.id) as total_files,
                    AVG(f.completion_rate) as avg_completion_rate,
                    AVG(f.avg_engagement_score) as avg_engagement_score
                FROM "Module" m
                LEFT JOIN "File" f ON f.module_id = m.id
                WHERE m.course_id = %s
                GROUP BY m.id, m.title, m.ordering
                ORDER BY m.ordering
                """,
                (course_id,)
            ).fetchall()
            
            session.commit()
            
            # Format insights
            insights_data = {}
            for insight in insights:
                insights_data[insight[0]] = {
                    'data': insight[1],
                    'generated_at': insight[2].isoformat()
                }
            
            response_data = {
                'course_summary': {
                    'total_students': course_summary[0],
                    'week_avg_engagement': float(course_summary[1] or 0),
                    'week_total_sessions': course_summary[2],
                    'week_active_students': course_summary[3]
                },
                'insights': insights_data,
                'module_completion': [
                    {
                        'module_id': row[0],
                        'title': row[1],
                        'ordering': row[2],
                        'total_files': row[3] or 0,
                        'avg_completion_rate': float(row[4] or 0),
                        'avg_engagement_score': float(row[5] or 0)
                    } for row in module_completion
                ],
                'generated_at': datetime.utcnow().isoformat()
            }
            
            return success_response(response_data)
            
    except Exception as e:
        logger.error(f"Error getting course insights: {str(e)}")
        return error_response(str(e), 500)

@analytics_bp.route('/patterns/detect', methods=['POST'])
@auth_required()
def detect_user_patterns():
    """Trigger detection of learning patterns for current user"""
    try:
        user_id = str(g.current_user.id)
        
        with db_manager.get_session() as session:
            # Run pattern detection
            session.execute(
                "SELECT detect_learning_patterns(%s)",
                (user_id,)
            )
            session.commit()
            
            # Get updated patterns
            patterns = session.execute(
                """
                SELECT pattern_type, pattern_data, confidence_score, last_updated
                FROM learning_patterns 
                WHERE user_id = %s
                """,
                (user_id,)
            ).fetchall()
            
            patterns_data = {
                row[0]: {
                    'data': row[1],
                    'confidence': float(row[2]),
                    'last_updated': row[3].isoformat()
                } for row in patterns
            }
            
            return success_response({
                'patterns': patterns_data,
                'detected_at': datetime.utcnow().isoformat()
            })
            
    except Exception as e:
        logger.error(f"Error detecting patterns: {str(e)}")
        return error_response(str(e), 500)

@analytics_bp.route('/engagement/summary', methods=['GET'])
@auth_required()
def get_engagement_summary():
    """Get high-level engagement summary for current user"""
    try:
        user_id = str(g.current_user.id)
        days = request.args.get('days', '7', type=int)
        
        with db_manager.get_session() as session:
            # Get engagement summary
            summary = session.execute(
                """
                SELECT 
                    COUNT(*) as total_sessions,
                    AVG(engagement_score) as avg_engagement,
                    SUM(time_on_content) as total_time_on_content,
                    AVG(interaction_count) as avg_interactions,
                    COUNT(DISTINCT DATE(event_timestamp)) as active_days
                FROM session_analytics 
                WHERE user_id = %s 
                AND event_timestamp >= CURRENT_DATE - INTERVAL '%s days'
                AND engagement_score IS NOT NULL
                """,
                (user_id, days)
            ).fetchone()
            
            # Get top performing content
            top_content = session.execute(
                """
                SELECT 
                    sa.analytics_metadata->>'content_id' as content_id,
                    AVG(sa.engagement_score) as avg_engagement,
                    COUNT(*) as session_count
                FROM session_analytics sa
                WHERE sa.user_id = %s 
                AND sa.event_timestamp >= CURRENT_DATE - INTERVAL '%s days'
                AND sa.analytics_metadata->>'content_id' IS NOT NULL
                GROUP BY sa.analytics_metadata->>'content_id'
                ORDER BY avg_engagement DESC
                LIMIT 5
                """,
                (user_id, days)
            ).fetchall()
            
            response_data = {
                'period_days': days,
                'summary': {
                    'total_sessions': summary[0] or 0,
                    'avg_engagement': float(summary[1] or 0),
                    'total_time_minutes': (summary[2] or 0) // 60,
                    'avg_interactions': float(summary[3] or 0),
                    'active_days': summary[4] or 0
                },
                'top_content': [
                    {
                        'content_id': row[0],
                        'avg_engagement': float(row[1]),
                        'session_count': row[2]
                    } for row in top_content
                ],
                'generated_at': datetime.utcnow().isoformat()
            }
            
            return success_response(response_data)
            
    except Exception as e:
        logger.error(f"Error getting engagement summary: {str(e)}")
        return error_response(str(e), 500)

@analytics_bp.route('/recommendations', methods=['GET'])
@auth_required()
def get_personalized_recommendations():
    """Get AI-powered learning recommendations based on analytics"""
    try:
        user_id = str(g.current_user.id)
        
        with db_manager.get_session() as session:
            # Get user patterns and recent engagement
            patterns = session.execute(
                """
                SELECT pattern_type, pattern_data, confidence_score
                FROM learning_patterns 
                WHERE user_id = %s
                """,
                (user_id,)
            ).fetchall()
            
            # Get recent engagement metrics
            recent_engagement = session.execute(
                """
                SELECT 
                    AVG(engagement_score) as avg_engagement,
                    AVG(time_on_content) as avg_time,
                    COUNT(*) as session_count
                FROM session_analytics 
                WHERE user_id = %s 
                AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
                """,
                (user_id,)
            ).fetchone()
            
            # Generate recommendations based on patterns
            recommendations = []
            
            # Convert patterns to dict for easier access
            pattern_dict = {row[0]: row[1] for row in patterns}
            
            # Time-based recommendations
            if 'peak_hours' in pattern_dict:
                peak_hours = pattern_dict['peak_hours']
                if peak_hours:
                    # Find top 2 peak hours
                    sorted_hours = sorted(
                        peak_hours.items(), 
                        key=lambda x: x[1].get('count', 0), 
                        reverse=True
                    )[:2]
                    
                    if sorted_hours:
                        hours_text = ', '.join([f"{hour}:00" for hour, _ in sorted_hours])
                        recommendations.append({
                            'type': 'optimal_timing',
                            'title': 'Optimize Your Study Time',
                            'description': f'You perform best at {hours_text}. Schedule important content during these hours.',
                            'action': 'schedule_peak_hours',
                            'priority': 'high',
                            'confidence': 0.8
                        })
            
            # Engagement-based recommendations
            avg_engagement = float(recent_engagement[0] or 0)
            if avg_engagement < 0.6:
                recommendations.append({
                    'type': 'engagement_improvement',
                    'title': 'Boost Your Engagement',
                    'description': 'Try shorter study sessions with more interactive content to improve focus.',
                    'action': 'adjust_content_type',
                    'priority': 'medium',
                    'confidence': 0.7
                })
            
            # Learning style recommendations
            if 'learning_style' in pattern_dict:
                style_data = pattern_dict['learning_style']
                if style_data:
                    max_preference = max(
                        style_data.items(),
                        key=lambda x: x[1] if isinstance(x[1], (int, float)) else 0
                    )
                    
                    if max_preference[1] > 0:
                        recommendations.append({
                            'type': 'content_preference',
                            'title': 'Match Your Learning Style',
                            'description': f'You prefer {max_preference[0].replace("_", " ")} content. Look for materials that match this preference.',
                            'action': 'filter_content_by_type',
                            'priority': 'medium',
                            'confidence': 0.6
                        })
            
            return success_response({
                'recommendations': recommendations,
                'based_on': {
                    'patterns_count': len(patterns),
                    'recent_sessions': recent_engagement[2] or 0,
                    'avg_engagement': avg_engagement
                },
                'generated_at': datetime.utcnow().isoformat()
            })
            
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return error_response(str(e), 500)


# ===== STUDY TIME TRACKING ENDPOINTS =====

@analytics_bp.route('/study-time', methods=['GET'])
@auth_required()
def get_study_time():
    """Get user's study time analytics"""
    try:
        user = g.current_user
        user_id = str(user.id)
        
        # Get query parameters
        period = request.args.get('period', 'week')  # week, month, all
        course_id = request.args.get('course_id')
        
        with db_manager.session_factory() as session:
            from db.schema import StudySession
            from sqlalchemy import func, and_
            
            # Base query for completed study sessions
            query = session.query(StudySession).filter(
                StudySession.user_id == user_id,
                StudySession.status == 'completed',
                StudySession.actual_start.isnot(None),
                StudySession.actual_end.isnot(None),
                StudySession.actual_duration_minutes.isnot(None)
            )
            
            # Filter by course if specified
            if course_id:
                query = query.filter(StudySession.course_id == course_id)
            
            # Calculate date range based on period
            now = datetime.utcnow()
            if period == 'week':
                # Current week (Monday to Sunday)
                days_since_monday = now.weekday()
                week_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
                query = query.filter(StudySession.actual_start >= week_start)
                period_label = "This Week"
            elif period == 'month':
                # Current month
                month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                query = query.filter(StudySession.actual_start >= month_start)
                period_label = "This Month"
            else:
                period_label = "All Time"
            
            # Get all sessions for detailed analysis
            sessions = query.order_by(StudySession.actual_start.desc()).all()
            
            # Calculate analytics
            total_sessions = len(sessions)
            total_minutes = sum(s.actual_duration_minutes or 0 for s in sessions)
            total_hours = round(total_minutes / 60, 1)
            
            # Average session length
            avg_session_minutes = round(total_minutes / total_sessions, 1) if total_sessions > 0 else 0
            avg_session_hours = round(avg_session_minutes / 60, 1)
            
            # Sessions by course
            course_breakdown = {}
            for session in sessions:
                course_id_key = str(session.course_id) if session.course_id else 'uncategorized'
                if course_id_key not in course_breakdown:
                    course_breakdown[course_id_key] = {
                        'sessions': 0,
                        'total_minutes': 0,
                        'course_title': 'Uncategorized'
                    }
                course_breakdown[course_id_key]['sessions'] += 1
                course_breakdown[course_id_key]['total_minutes'] += session.actual_duration_minutes or 0
                
                # Get course title (you might want to join this in the query for efficiency)
                if session.course_id:
                    from db.schema import Course
                    course = session.query(Course).filter(Course.id == session.course_id).first()
                    if course:
                        course_breakdown[course_id_key]['course_title'] = course.title
            
            # Daily breakdown for the period
            daily_stats = {}
            for session in sessions:
                date_key = session.actual_start.date().isoformat()
                if date_key not in daily_stats:
                    daily_stats[date_key] = {
                        'date': date_key,
                        'sessions': 0,
                        'total_minutes': 0
                    }
                daily_stats[date_key]['sessions'] += 1
                daily_stats[date_key]['total_minutes'] += session.actual_duration_minutes or 0
            
            # Convert to sorted list
            daily_breakdown = sorted(daily_stats.values(), key=lambda x: x['date'])
            
            # Study streaks
            study_days = set(s.actual_start.date() for s in sessions)
            current_streak = 0
            date_check = now.date()
            
            # Calculate current streak
            while date_check in study_days:
                current_streak += 1
                date_check -= timedelta(days=1)
                if current_streak > 365:  # Safety limit
                    break
            
            # If today isn't a study day, check if yesterday was
            if now.date() not in study_days and current_streak == 0:
                yesterday = now.date() - timedelta(days=1)
                if yesterday in study_days:
                    current_streak = 1
                    date_check = yesterday - timedelta(days=1)
                    while date_check in study_days:
                        current_streak += 1
                        date_check -= timedelta(days=1)
                        if current_streak > 365:
                            break
            
            # Recent session analysis
            recent_sessions = sessions[:10]  # Last 10 sessions
            focus_scores = [s.focus_score for s in recent_sessions if s.focus_score is not None]
            avg_focus = round(sum(focus_scores) / len(focus_scores), 1) if focus_scores else None
            
            effectiveness_ratings = [s.effectiveness_rating for s in recent_sessions if s.effectiveness_rating is not None]
            avg_effectiveness = round(sum(effectiveness_ratings) / len(effectiveness_ratings), 1) if effectiveness_ratings else None
            
            response_data = {
                'period': period_label,
                'summary': {
                    'total_sessions': total_sessions,
                    'total_hours': total_hours,
                    'total_minutes': total_minutes,
                    'avg_session_hours': avg_session_hours,
                    'avg_session_minutes': avg_session_minutes,
                    'study_streak_days': current_streak
                },
                'quality_metrics': {
                    'avg_focus_score': avg_focus,
                    'avg_effectiveness': avg_effectiveness,
                    'total_ratings': len(effectiveness_ratings)
                },
                'course_breakdown': course_breakdown,
                'daily_breakdown': daily_breakdown,
                'recent_sessions': [
                    {
                        'id': str(s.id),
                        'title': s.title,
                        'date': s.actual_start.isoformat(),
                        'duration_minutes': s.actual_duration_minutes,
                        'focus_score': s.focus_score,
                        'effectiveness_rating': s.effectiveness_rating,
                        'course_id': str(s.course_id) if s.course_id else None
                    }
                    for s in recent_sessions
                ]
            }
            
            return success_response(response_data)
            
    except Exception as e:
        logger.error(f"Error getting study time analytics: {str(e)}")
        return error_response("An error occurred fetching study time data", status_code=500)


@analytics_bp.route('/study-time/session', methods=['POST'])
@auth_required()  
def start_study_session():
    """Start a new study session"""
    try:
        user = g.current_user
        user_id = str(user.id)
        data = request.get_json()
        
        if not data:
            return error_response("Request body required")
        
        title = data.get('title', 'Study Session')
        course_id = data.get('course_id')
        session_type = data.get('session_type', 'study')
        
        with db_manager.session_factory() as session:
            from db.schema import StudySession
            
            # Check if user has an active session
            active_session = session.query(StudySession).filter(
                StudySession.user_id == user_id,
                StudySession.status == 'active'
            ).first()
            
            if active_session:
                return error_response("You already have an active study session", status_code=400)
            
            # Create new session
            now = datetime.utcnow()
            new_session = StudySession(
                user_id=user_id,
                course_id=course_id,
                title=title,
                session_type=session_type,
                scheduled_start=now,
                scheduled_end=now + timedelta(hours=2),  # Default 2 hour session
                duration_minutes=120,
                actual_start=now,
                status='active'
            )
            
            session.add(new_session)
            session.commit()
            session.refresh(new_session)
            
            return success_response({
                'session_id': str(new_session.id),
                'title': new_session.title,
                'started_at': new_session.actual_start.isoformat(),
                'status': new_session.status
            }, message="Study session started", status_code=201)
            
    except Exception as e:
        logger.error(f"Error starting study session: {str(e)}")
        return error_response("An error occurred starting the session", status_code=500)


@analytics_bp.route('/study-time/session/<session_id>/end', methods=['PUT'])
@auth_required()
def end_study_session(session_id: str):
    """End an active study session"""
    try:
        user = g.current_user
        user_id = str(user.id)
        data = request.get_json() or {}
        
        with db_manager.session_factory() as session:
            from db.schema import StudySession
            
            # Find the session
            study_session = session.query(StudySession).filter(
                StudySession.id == session_id,
                StudySession.user_id == user_id,
                StudySession.status == 'active'
            ).first()
            
            if not study_session:
                return error_response("Active study session not found", status_code=404)
            
            # End the session
            now = datetime.utcnow()
            study_session.actual_end = now
            study_session.status = 'completed'
            
            # Calculate actual duration
            if study_session.actual_start:
                duration_delta = now - study_session.actual_start
                study_session.actual_duration_minutes = int(duration_delta.total_seconds() / 60)
            
            # Optional quality ratings
            focus_score = data.get('focus_score')  # 0-10
            effectiveness_rating = data.get('effectiveness_rating')  # 1-5
            notes = data.get('notes')
            
            if focus_score is not None:
                study_session.focus_score = max(0, min(10, float(focus_score)))
            
            if effectiveness_rating is not None:
                study_session.effectiveness_rating = max(1, min(5, int(effectiveness_rating)))
            
            if notes:
                study_session.session_notes = notes
            
            # Award XP for study time
            if study_session.actual_duration_minutes and study_session.actual_duration_minutes >= 5:
                # Award 1 XP per minute of study time (minimum 5 minutes)
                xp_earned = min(study_session.actual_duration_minutes, 120)  # Cap at 2 hours worth
                study_session.xp_earned = xp_earned
                
                # Create XP activity record
                from db.schema import UserActivity
                activity = UserActivity(
                    user_id=user_id,
                    activity_type='study_session_complete',
                    xp_earned=xp_earned,
                    description=f"Completed {study_session.actual_duration_minutes} minute study session",
                    metadata={'session_id': str(study_session.id), 'duration_minutes': study_session.actual_duration_minutes}
                )
                session.add(activity)
            
            session.commit()
            session.refresh(study_session)
            
            return success_response({
                'session_id': str(study_session.id),
                'duration_minutes': study_session.actual_duration_minutes,
                'xp_earned': study_session.xp_earned or 0,
                'ended_at': study_session.actual_end.isoformat(),
                'status': study_session.status
            }, message="Study session completed")
            
    except Exception as e:
        logger.error(f"Error ending study session: {str(e)}")
        return error_response("An error occurred ending the session", status_code=500)
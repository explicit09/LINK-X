from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from sqlalchemy import desc, func

from ..core.decorators import firebase_auth_required
from ..core.cache import cache_response
from ..db.connection import get_db_session
from ..db.schema import Chat, File, Enrollment, Course

bp = Blueprint('activities', __name__)

@bp.route('/recent', methods=['GET'])
@firebase_auth_required
@cache_response(expiration=300)  # Cache for 5 minutes
def get_recent_activities():
    """Get recent activities for the current user"""
    user = g.current_user
    session = get_db_session()
    
    try:
        activities = []
        
        # For students, get their course-related activities
        if user.role.role_type == 'student':
            # Get recent AI chats
            recent_chats = session.query(Chat).filter(
                Chat.user_id == user.id
            ).order_by(desc(Chat.created_at)).limit(5).all()
            
            for chat in recent_chats:
                activities.append({
                    'id': str(chat.id),
                    'type': 'ai_chat',
                    'course': chat.file.module.course.title if chat.file else 'General',
                    'title': f'AI chat about {chat.file.title if chat.file else "course content"}',
                    'timestamp': chat.created_at.isoformat()
                })
        
        # Sort by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify(activities[:10]), 200  # Return top 10 activities
        
    finally:
        session.close()

@bp.route('/stats', methods=['GET'])
@firebase_auth_required
@cache_response(expiration=600)  # Cache for 10 minutes
def get_dashboard_stats():
    """Get dashboard statistics for the current user"""
    user = g.current_user
    session = get_db_session()
    
    try:
        stats = {
            'aiInteractions': 0,
            'weeklyHours': 0,
            'coursesEnrolled': 0,
            'materialsViewed': 0
        }
        
        if user.role.role_type == 'student':
            # Count AI interactions (chats)
            ai_count = session.query(func.count(Chat.id)).filter(
                Chat.user_id == user.id
            ).scalar() or 0
            stats['aiInteractions'] = ai_count
            
            # Count enrolled courses
            enrolled_count = session.query(func.count(Enrollment.id)).filter(
                Enrollment.user_id == user.id
            ).scalar() or 0
            stats['coursesEnrolled'] = enrolled_count
            
            # Estimate weekly hours (this is a placeholder)
            # In a real app, you'd track actual study time
            stats['weeklyHours'] = min(ai_count * 0.5, 20)  # Rough estimate
            
        elif user.role.role_type == 'instructor':
            # Count courses created
            course_count = session.query(func.count(Course.id)).filter(
                Course.instructor_id == user.id
            ).scalar() or 0
            stats['coursesCreated'] = course_count
            
        return jsonify(stats), 200
        
    finally:
        session.close()
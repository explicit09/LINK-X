"""
API v2 Activities Endpoints
"""
from flask import Blueprint, request, g
from datetime import datetime
import logging

from core.decorators_unified import firebase_auth_required
from core.database import db
from db.schema import Enrollment, Course, PersonalizedFile, File, Module

from .utils import success_response, error_response

logger = logging.getLogger(__name__)

# Create activities blueprint
activities_bp = Blueprint('api_v2_activities', __name__)


@activities_bp.route('/recent', methods=['GET'])
@firebase_auth_required
def get_recent_activities():
    """Get recent user activities"""
    try:
        user_id = g.current_user.id
        activities = []
        
        # Get recent file views
        recent_files = db.session.query(File).join(Module).join(Course).join(Enrollment).filter(
            Enrollment.user_id == user_id
        ).order_by(File.created_at.desc()).limit(5).all()
        
        for file in recent_files:
            module = db.session.query(Module).filter(Module.id == file.module_id).first()
            if module:
                course = db.session.query(Course).filter(Course.id == module.course_id).first()
                if course:
                    activities.append({
                        'id': f'file_{file.id}',
                        'type': 'file_view',
                        'title': f'Viewed {file.title}',
                        'timestamp': file.created_at.isoformat() if file.created_at else datetime.now().isoformat(),
                        'course_id': str(course.id),
                        'course_name': course.title
                    })
        
        # Get recent personalized files
        personalized_files = db.session.query(PersonalizedFile).filter(
            PersonalizedFile.user_id == user_id
        ).order_by(PersonalizedFile.created_at.desc()).limit(5).all()
        
        for pf in personalized_files:
            original_file = db.session.query(File).filter(File.id == pf.original_file_id).first()
            if original_file:
                module = db.session.query(Module).filter(Module.id == original_file.module_id).first()
                if module:
                    course = db.session.query(Course).filter(Course.id == module.course_id).first()
                    if course:
                        activities.append({
                            'id': f'pf_{pf.id}',
                            'type': 'ai_interaction',
                            'title': f'AI personalized {original_file.title}',
                            'timestamp': pf.created_at.isoformat() if pf.created_at else datetime.now().isoformat(),
                            'course_id': str(course.id),
                            'course_name': course.title
                        })
        
        # Sort by timestamp and limit to 10 most recent
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return success_response(activities[:10])
    except Exception as e:
        logger.error(f"Get recent activities error: {str(e)}")
        return error_response("An error occurred fetching activities", status_code=500)


@activities_bp.route('/stats', methods=['GET'])
@firebase_auth_required
def get_activity_stats():
    """Get user activity statistics"""
    try:
        user_id = g.current_user.id
        
        # Get total courses
        total_courses = db.session.query(Enrollment).filter(Enrollment.user_id == user_id).count()
        
        # Get completed modules (estimate based on personalized files)
        personalized_files = db.session.query(PersonalizedFile).filter(
            PersonalizedFile.user_id == user_id
        ).all()
        completed_modules = len(set(pf.original_file_id for pf in personalized_files))
        
        # Estimate study time based on personalized files (30 mins per file)
        study_time_minutes = len(personalized_files) * 30
        
        # Calculate streak days (simplified - days with activity)
        unique_days = set()
        for pf in personalized_files:
            if pf.created_at:
                unique_days.add(pf.created_at.date())
        
        # Check for consecutive days
        if unique_days:
            sorted_days = sorted(unique_days, reverse=True)
            streak_days = 1
            for i in range(1, len(sorted_days)):
                if (sorted_days[i-1] - sorted_days[i]).days == 1:
                    streak_days += 1
                else:
                    break
        else:
            streak_days = 0
        
        # Calculate AI interactions (count of personalized files)
        ai_interactions = len(personalized_files)
        
        # Convert study time to hours for weekly display
        weekly_hours = round(study_time_minutes / 60, 1)
        
        stats = {
            'aiInteractions': ai_interactions,
            'weeklyHours': weekly_hours,
            'totalActivities': len(personalized_files),
            'streakDays': streak_days,
            'totalCourses': total_courses,
            'completedModules': completed_modules
        }
        return success_response(stats)
    except Exception as e:
        logger.error(f"Get activity stats error: {str(e)}")
        return error_response("An error occurred fetching activity stats", status_code=500)


@activities_bp.route('/log', methods=['POST'])
@firebase_auth_required
def log_activity():
    """Log a user activity"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        activity_type = data.get('type')
        if not activity_type:
            return error_response("Activity type is required")
        
        # TODO: Implement activity logging to database
        # For now, just acknowledge the activity
        logger.info(f"Activity logged: {activity_type} by user {user.id}")
        
        return success_response(
            message="Activity logged successfully",
            data={'activity_type': activity_type}
        )
        
    except Exception as e:
        logger.error(f"Log activity error: {str(e)}")
        return error_response("An error occurred logging the activity", status_code=500)
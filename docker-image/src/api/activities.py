from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from sqlalchemy import desc, func

from src.core.decorators_unified import firebase_auth_required
from src.core.database import db
from src.db.schema import Chat, File, Enrollment, Course, PersonalizedFile, Module
from src.repositories.user_repository import UserRepository
from src.repositories.file_repository import FileRepository

activities_bp = Blueprint('activities', __name__)

@activities_bp.route('/recent', methods=['GET'])
@firebase_auth_required
def get_recent_activities():
    """Get recent activities for the current user"""
    user_id = g.current_user.id
    
    user_repo = UserRepository()
    user = user_repo.get_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
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
    
    return jsonify(activities[:10]), 200

@activities_bp.route('/stats', methods=['GET'])
@firebase_auth_required
def get_activity_stats():
    """Get activity statistics for the current user"""
    user_id = g.current_user.id
    
    user_repo = UserRepository()
    user = user_repo.get_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
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
    
    # Get last activity
    last_activity = None
    if personalized_files:
        last_pf = max(personalized_files, key=lambda x: x.created_at if x.created_at else datetime.min)
        last_activity = last_pf.created_at.isoformat() if last_pf.created_at else None
    
    return jsonify({
        'total_courses': total_courses,
        'completed_modules': completed_modules,
        'study_time_minutes': study_time_minutes,
        'streak_days': streak_days,
        'last_activity': last_activity or datetime.now().isoformat()
    }), 200

@activities_bp.route('/log', methods=['POST'])
@firebase_auth_required
def log_activity():
    """Log user activity"""
    user_id = g.current_user.id
    data = request.get_json() or {}
    activity_type = data.get('type')
    course_id = data.get('course_id')
    file_id = data.get('file_id')
    duration_minutes = data.get('duration_minutes', 0)
    
    # For now, just acknowledge the activity
    # In production, this would be stored in an activities table
    print(f"Activity logged: {activity_type} by user {user_id}")
    
    return jsonify({
        'success': True,
        'message': 'Activity logged successfully'
    }), 200
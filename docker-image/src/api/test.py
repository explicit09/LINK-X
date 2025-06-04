from flask import Blueprint, request, jsonify, g
from core.decorators import firebase_auth_required

bp = Blueprint('test', __name__)

@bp.route('/session-check', methods=['GET'])
def check_session():
    """Check session status without requiring auth"""
    session_cookie = request.cookies.get('session_token')
    auth_header = request.headers.get('Authorization')
    
    return jsonify({
        'has_session_cookie': bool(session_cookie),
        'session_cookie_length': len(session_cookie) if session_cookie else 0,
        'has_auth_header': bool(auth_header),
        'cookies': list(request.cookies.keys())
    }), 200

@bp.route('/auth-check', methods=['GET'])
@firebase_auth_required
def check_auth():
    """Check if authentication is working"""
    return jsonify({
        'authenticated': True,
        'user_id': str(g.current_user.id),
        'user_email': g.current_user.email
    }), 200

@bp.route('/course-debug/<course_id>', methods=['GET'])
@firebase_auth_required
def debug_course(course_id):
    """Debug course data"""
    from db.connection import get_db_session
    from db.schema import Course, Module, File
    
    session = get_db_session()
    try:
        # Get course
        course = session.query(Course).filter_by(id=course_id).first()
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        # Get modules
        modules = session.query(Module).filter_by(course_id=course_id).all()
        
        # Get files for each module
        module_data = []
        total_files = 0
        for module in modules:
            files = session.query(File).filter_by(module_id=module.id).all()
            total_files += len(files)
            module_data.append({
                'id': str(module.id),
                'title': module.title,
                'description': module.description,
                'ordering': module.ordering,
                'file_count': len(files),
                'files': [{'id': str(f.id), 'title': f.title, 'type': f.file_type} for f in files]
            })
        
        return jsonify({
            'course': {
                'id': str(course.id),
                'title': course.title,
                'code': course.code,
                'instructor_id': str(course.instructor_id) if course.instructor_id else None
            },
            'module_count': len(modules),
            'total_files': total_files,
            'modules': module_data
        }), 200
    finally:
        session.close()
from flask import Blueprint, request, jsonify, g
from ..core.decorators import firebase_auth_required
from ..core.exceptions import NotFoundError, AuthorizationError
from ..services.course_service import CourseService

bp = Blueprint('legacy', __name__)

@bp.route('/courses/<course_id>/moduleswithfiles', methods=['GET'])
@firebase_auth_required
def get_modules_with_files_legacy(course_id):
    """Get all modules for a course with their files (legacy endpoint)"""
    
    course_service = CourseService()
    
    try:
        modules = course_service.get_course_modules(
            course_id=course_id,
            user_id=g.current_user.id
        )
        
        # Get files for each module
        from ..repositories.file_repository import FileRepository
        file_repo = FileRepository()
        
        modules_with_files = []
        for module in modules:
            files = file_repo.get_by_module(module.id)
            module_dict = module.to_dict()
            module_dict['files'] = [f.to_dict() for f in files]
            modules_with_files.append(module_dict)
        
        return jsonify(modules_with_files), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Access denied'}), 403

@bp.route('/student/courses/<course_id>/discussions', methods=['GET'])
@firebase_auth_required
def get_course_discussions_legacy(course_id):
    """Get course discussions (legacy endpoint)"""
        
    try:
        # For now, return empty discussions
        return jsonify([]), 200
    except Exception as e:
        return jsonify({'error': 'Failed to get discussions'}), 500
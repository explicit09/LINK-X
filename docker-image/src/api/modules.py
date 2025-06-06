from flask import Blueprint, request, jsonify, g
import os

from core.auth.decorators import require_auth
from core.exceptions import NotFoundError, ValidationError, AuthorizationError
from core.database_supabase import db_manager
from db.queries import (
    get_module_by_id, get_course_by_id, get_enrollment_by_student_course,
    update_module, delete_module, get_files_by_module
)

bp = Blueprint('modules', __name__)

@bp.route('/<module_id>', methods=['GET'])
@require_auth
def get_module(module_id):
    """Get module details"""
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        
        # Get module and verify access
        module = get_module_by_id(db_session, module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        # Check access through course
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # Get files in module
        files = get_files_by_module(db_session, module_id)
        
        return jsonify({
            'module': {
                'id': str(module.id),
                'title': module.title,
                'description': getattr(module, 'description', ''),
                'course_id': str(module.course_id),
                'ordering': module.ordering,
                'created_at': module.created_at.isoformat() if hasattr(module, 'created_at') and module.created_at else None,
                'files': [{
                    'id': str(f.id),
                    'title': f.title,
                    'filename': f.filename,
                    'file_type': f.file_type,
                    'file_size': f.file_size,
                    'created_at': f.created_at.isoformat() if f.created_at else None
                } for f in files]
            }
        }), 200
        
    except Exception as e:
        import logging
        logging.error(f"Get module error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to get module: {str(e)}'}), 500
    finally:
        db_session.close()

@bp.route('/<module_id>/files', methods=['GET'])
@require_auth
def get_module_files(module_id):
    """Get all files in a module"""
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        
        # Check access to module
        module = get_module_by_id(db_session, module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # Get files
        files = get_files_by_module(db_session, module_id)
        
        return jsonify({
            'files': [{
                'id': str(f.id),
                'title': f.title,
                'filename': f.filename,
                'file_type': f.file_type,
                'file_size': f.file_size,
                'module_id': str(f.module_id),
                'created_at': f.created_at.isoformat() if f.created_at else None,
                's3_key': f.s3_key if hasattr(f, 's3_key') else None,
                'storage_type': f.storage_type if hasattr(f, 'storage_type') else 'database'
            } for f in files]
        }), 200
        
    except Exception as e:
        import logging
        logging.error(f"Get module files error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to get module files: {str(e)}'}), 500
    finally:
        db_session.close()

@bp.route('/<module_id>', methods=['PATCH'])
@require_auth
def update_module_endpoint(module_id):
    """Update module details"""
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        data = request.get_json() or {}
        
        # Get module and verify access
        module = get_module_by_id(db_session, module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        # Check access through course
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students (they can update modules in courses they're enrolled in)
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # Only allow certain fields to be updated
        allowed_fields = ['title', 'description', 'ordering']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
            
        # Validate title if provided
        if 'title' in update_data and len(update_data['title']) < 3:
            return jsonify({'error': 'Title must be at least 3 characters'}), 400
        
        # Update module
        updated_module = update_module(db_session, module_id, **update_data)
        
        return jsonify({
            'message': 'Module updated successfully',
            'module': {
                'id': str(updated_module.id),
                'title': updated_module.title,
                'description': getattr(updated_module, 'description', ''),
                'course_id': str(updated_module.course_id),
                'ordering': updated_module.ordering,
                'created_at': updated_module.created_at.isoformat() if hasattr(updated_module, 'created_at') and updated_module.created_at else None
            }
        }), 200
        
    except Exception as e:
        db_session.rollback()
        import logging
        logging.error(f"Update module error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to update module: {str(e)}'}), 500
    finally:
        db_session.close()

@bp.route('/<module_id>', methods=['DELETE'])
@require_auth
def delete_module_endpoint(module_id):
    """Delete a module"""
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        
        # Get module and verify access
        module = get_module_by_id(db_session, module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        # Check access through course
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students (they can delete modules in courses they're enrolled in)
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # Check if module has files
        files = get_files_by_module(db_session, module_id)
        if files:
            return jsonify({'error': 'Cannot delete module with files. Delete files first.'}), 400
        
        # Delete module
        delete_module(db_session, module_id)
        
        return jsonify({
            'message': 'Module deleted successfully'
        }), 200
        
    except Exception as e:
        db_session.rollback()
        import logging
        logging.error(f"Delete module error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to delete module: {str(e)}'}), 500
    finally:
        db_session.close()
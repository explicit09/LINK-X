from flask import Blueprint, request, jsonify, g
from ..core.decorators import firebase_auth_required, require_role, validate_json
from ..core.exceptions import NotFoundError, ValidationError, AuthorizationError
from ..services.module_service import ModuleService
from ..repositories.file_repository import FileRepository

bp = Blueprint('modules', __name__)

@bp.route('/<module_id>/files', methods=['GET'])
@firebase_auth_required
def get_module_files(module_id):
    """Get all files in a module"""
    try:
        # Check module access through course
        module_service = ModuleService()
        module = module_service.get_module_with_access_check(
            module_id=module_id,
            user_id=g.current_user.id
        )
        
        # Get files
        file_repo = FileRepository()
        files = file_repo.get_by_module(module_id)
        
        return jsonify({
            'files': [f.to_dict() for f in files]
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Module not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Access denied'}), 403

@bp.route('/<module_id>', methods=['PATCH'])
@require_role(['instructor', 'admin'])
@validate_json([])
def update_module(module_id):
    """Update module details"""
    data = request.get_json()
    module_service = ModuleService()
    
    try:
        module = module_service.update_module(
            module_id=module_id,
            user_id=g.current_user.id,
            **data
        )
        
        return jsonify({
            'message': 'Module updated successfully',
            'module': module.to_dict()
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Module not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Not authorized to update this module'}), 403
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<module_id>', methods=['DELETE'])
@require_role(['instructor', 'admin'])
def delete_module(module_id):
    """Delete a module"""
    module_service = ModuleService()
    
    try:
        module_service.delete_module(
            module_id=module_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'message': 'Module deleted successfully'
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Module not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Not authorized to delete this module'}), 403
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
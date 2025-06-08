"""
API v2 File Endpoints - Supabase Storage Version
Simplified file management using Supabase Storage
"""
from flask import Blueprint, request, g, send_file, jsonify, Response
from werkzeug.utils import secure_filename
import io
import logging

from core.decorators_unified import auth_required
from core.exceptions import ValidationError, NotFoundError, UnauthorizedError
from services.file_service_supabase import SupabaseFileService
from repositories.module_repository import ModuleRepository

from .utils import success_response, error_response

logger = logging.getLogger(__name__)

# Create files blueprint
files_bp = Blueprint('api_v2_files_supabase', __name__)

# Initialize services
file_service = None
module_repo = None


def get_file_service():
    """Get file service instance with lazy initialization"""
    global file_service
    if file_service is None:
        file_service = SupabaseFileService()
    return file_service


def get_module_repo():
    """Get module repository instance with lazy initialization"""
    global module_repo
    if module_repo is None:
        module_repo = ModuleRepository()
    return module_repo


@files_bp.route('/upload', methods=['POST'])
@auth_required()
def upload_file_v2():
    """
    Upload a file to Supabase Storage
    Simplified from 200+ lines to ~50 lines
    """
    try:
        user = g.current_user
        
        # Validate request
        if 'file' not in request.files:
            return error_response("No file provided", errors={'file': 'This field is required'})
        
        file = request.files['file']
        if file.filename == '':
            return error_response("No file selected")
        
        # Get module ID
        module_id = request.form.get('module_id') or request.form.get('moduleId')
        if not module_id:
            return error_response("Module ID is required", errors={'module_id': 'This field is required'})
        
        # Optional fields
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')
        
        # Upload file using Supabase storage
        uploaded_file = get_file_service().upload_file(
            file=file,
            module_id=module_id,
            user_id=str(user.id),
            title=title,
            description=description
        )
        
        return success_response(
            uploaded_file,
            message="File uploaded successfully",
            status_code=201
        )
        
    except ValidationError as e:
        return error_response(str(e))
    except UnauthorizedError as e:
        return error_response(str(e), status_code=403)
    except Exception as e:
        logger.error(f"File upload error: {str(e)}", exc_info=True)
        return error_response("An error occurred uploading the file", status_code=500)


@files_bp.route('/<file_id>/url', methods=['GET'])
@auth_required()
def get_file_url_v2(file_id):
    """Get a signed URL for file access"""
    try:
        # Get expiration time (default 1 hour)
        expires_in = request.args.get('expires_in', 3600, type=int)
        
        # Get signed URL from Supabase
        signed_url = get_file_service().get_file_url(file_id, expires_in)
        
        return success_response({
            'url': signed_url,
            'expires_in': expires_in
        })
        
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except Exception as e:
        logger.error(f"Get file URL error: {str(e)}")
        return error_response("An error occurred getting file URL", status_code=500)


@files_bp.route('/<file_id>/download', methods=['GET'])
@auth_required()
def download_file_v2(file_id):
    """Download a file from Supabase Storage"""
    try:
        # Download file
        file_data, filename, content_type = get_file_service().download_file(file_id)
        
        # Return file as response
        return send_file(
            io.BytesIO(file_data),
            mimetype=content_type,
            as_attachment=True,
            download_name=filename
        )
        
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except Exception as e:
        logger.error(f"File download error: {str(e)}")
        return error_response("An error occurred downloading the file", status_code=500)


@files_bp.route('/<file_id>', methods=['DELETE'])
@auth_required()
def delete_file_v2(file_id):
    """Delete a file from Supabase Storage"""
    try:
        user = g.current_user
        
        # Delete file
        success = get_file_service().delete_file(file_id, str(user.id))
        
        if success:
            return success_response(message="File deleted successfully")
        else:
            return error_response("Failed to delete file", status_code=500)
            
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Not authorized to delete this file", status_code=403)
    except Exception as e:
        logger.error(f"File delete error: {str(e)}")
        return error_response("An error occurred deleting the file", status_code=500)


@files_bp.route('/module/<module_id>', methods=['GET'])
@auth_required()
def list_module_files_v2(module_id):
    """List all files in a module"""
    try:
        user = g.current_user
        
        # Get files
        files = get_file_service().list_module_files(module_id, str(user.id))
        
        return success_response({
            'files': files,
            'total': len(files)
        })
        
    except NotFoundError:
        return error_response("Module not found", status_code=404)
    except Exception as e:
        logger.error(f"List files error: {str(e)}")
        return error_response("An error occurred listing files", status_code=500)


@files_bp.route('/<file_id>/reprocess', methods=['POST'])
@auth_required()
def reprocess_file_v2(file_id):
    """Reprocess a file (re-extract text and create chunks)"""
    try:
        from tasks.file_processing_simple import reprocess_file
        
        # Reprocess file
        success = reprocess_file(file_id)
        
        if success:
            return success_response(message="File reprocessing started")
        else:
            return error_response("Failed to reprocess file", status_code=500)
            
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except Exception as e:
        logger.error(f"File reprocess error: {str(e)}")
        return error_response("An error occurred reprocessing the file", status_code=500)
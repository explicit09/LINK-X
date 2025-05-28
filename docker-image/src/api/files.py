from flask import Blueprint, request, jsonify, send_file, Response, g
import os
from werkzeug.utils import secure_filename

from ..core.decorators import firebase_auth_required, require_role, validate_json
from ..core.exceptions import NotFoundError, ValidationError, FileProcessingError
from ..services.file_service import FileService
from ..config import Config

bp = Blueprint('files', __name__)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@bp.route('/upload', methods=['POST'])
@firebase_auth_required
def upload_file():
    """Upload a file to a module"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    module_id = request.form.get('moduleId')
    
    if not module_id:
        return jsonify({'error': 'Module ID is required'}), 400
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': f'File type not allowed. Allowed types: {", ".join(Config.ALLOWED_EXTENSIONS)}'}), 400
    
    file_service = FileService()
    
    try:
        # Save and process file
        uploaded_file = file_service.upload_file(
            file=file,
            module_id=module_id,
            user_id=g.current_user.id,
            title=request.form.get('title', file.filename),
            description=request.form.get('description')
        )
        
        return jsonify({
            'message': 'File uploaded successfully',
            'file': uploaded_file.to_dict()
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except FileProcessingError as e:
        return jsonify({'error': str(e)}), 422
    except Exception as e:
        return jsonify({'error': 'File upload failed'}), 500

@bp.route('/<file_id>', methods=['GET'])
@firebase_auth_required
def get_file(file_id):
    """Get file metadata"""
    file_service = FileService()
    
    try:
        file = file_service.get_file_with_access_check(
            file_id=file_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'file': file.to_dict()
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404

@bp.route('/<file_id>/download', methods=['GET'])
@firebase_auth_required
def download_file(file_id):
    """Download a file"""
    file_service = FileService()
    
    try:
        file_path, filename = file_service.get_file_for_download(
            file_id=file_id,
            user_id=g.current_user.id
        )
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/octet-stream'
        )
        
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': 'File download failed'}), 500

@bp.route('/<file_id>/content', methods=['GET'])
@firebase_auth_required
def get_file_content(file_id):
    """Get file content for viewing"""
    file_service = FileService()
    
    try:
        file_data = file_service.get_file_content(
            file_id=file_id,
            user_id=g.current_user.id
        )
        
        # Return file content based on storage type
        if file_data.get('type') == 'presigned':
            # For S3 files, return presigned URL
            return jsonify({
                'type': 'presigned',
                'url': file_data['url']
            }), 200
        else:
            # For database-stored files, return actual content
            return Response(
                file_data['content'],
                mimetype=file_data.get('mimetype', 'application/octet-stream')
            )
        
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to get file content'}), 500

@bp.route('/<file_id>/preview', methods=['GET'])
@firebase_auth_required
def preview_file(file_id):
    """Get file preview URL"""
    file_service = FileService()
    
    try:
        preview_url = file_service.get_file_preview_url(
            file_id=file_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'preview_url': preview_url
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404

@bp.route('/<file_id>/stream', methods=['GET'])
@firebase_auth_required
def stream_file(file_id):
    """Stream file content (for personalized content)"""
    file_service = FileService()
    
    def generate():
        try:
            for chunk in file_service.stream_personalized_content(
                file_id=file_id,
                user_id=g.current_user.id
            ):
                yield f"data: {chunk}\n\n"
        except Exception as e:
            yield f"data: {{'error': '{str(e)}'}}\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@bp.route('/<file_id>', methods=['DELETE'])
@require_role(['instructor', 'admin'])
def delete_file(file_id):
    """Delete a file"""
    file_service = FileService()
    
    try:
        file_service.delete_file(
            file_id=file_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'message': 'File deleted successfully'
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': 'File deletion failed'}), 500

@bp.route('/module/<module_id>', methods=['GET'])
@firebase_auth_required
def get_module_files(module_id):
    """Get all files in a module"""
    file_service = FileService()
    
    try:
        files = file_service.get_module_files(
            module_id=module_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'files': [f.to_dict() for f in files]
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Module not found'}), 404

@bp.route('/search', methods=['GET'])
@firebase_auth_required
def search_files():
    """Search files"""
    query = request.args.get('q', '')
    course_id = request.args.get('courseId')
    file_type = request.args.get('type')
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    file_service = FileService()
    
    try:
        results = file_service.search_files(
            query=query,
            user_id=g.current_user.id,
            course_id=course_id,
            file_type=file_type
        )
        
        return jsonify({
            'results': [r.to_dict() for r in results]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Search failed'}), 500

@bp.route('/process/<file_id>', methods=['POST'])
@require_role(['instructor', 'admin'])
def reprocess_file(file_id):
    """Trigger file reprocessing"""
    file_service = FileService()
    
    try:
        file_service.reprocess_file(
            file_id=file_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'message': 'File reprocessing started'
        }), 202
        
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Reprocessing failed'}), 500
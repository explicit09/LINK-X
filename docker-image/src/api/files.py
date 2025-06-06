from flask import Blueprint, request, jsonify, send_file, Response, g
import os
import uuid
from io import BytesIO
from werkzeug.utils import secure_filename

from core.auth.decorators import require_auth
from core.exceptions import NotFoundError, ValidationError, FileProcessingError
from core.config import get_config
from core.database_supabase import db
from core.file_validation import file_validator
from core.rate_limiter_v2 import rate_limit_decorator, RateLimitConfig
from services.file_service_supabase import FileService
from services.s3_signed_urls import s3_signed_urls
from db.queries import (
    get_module_by_id, get_course_by_id, create_file, get_file_by_id,
    get_modules_by_course, create_module, get_enrollment_by_student_course,
    update_file, delete_file, get_files_by_module
)
from ..s3_storage import s3_storage

bp = Blueprint('files', __name__)

@bp.route('/upload', methods=['POST'])
@require_auth
@rate_limit_decorator(**RateLimitConfig.FILE_UPLOAD)
def upload_file():
    """Upload a file to a module with security validation"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    module_id = request.form.get('moduleId')
    
    if not module_id:
        return jsonify({'error': 'Module ID is required'}), 400
    
    # Validate file using secure validator
    is_valid, error_msg, file_info = file_validator.validate_file(file)
    if not is_valid:
        return jsonify({'error': error_msg}), 400
    
    # Use the same logic as the working legacy endpoint
    from sqlalchemy.orm import sessionmaker
    from core.database_supabase import db_manager
    
    # Get a database session
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')
        
        target_module = None
        
        # If moduleId is provided, use it
        if module_id:
            target_module = get_module_by_id(db_session, module_id)
            if not target_module:
                return jsonify({'error': 'Module not found'}), 404
                
            # Check if user has access to this module's course
            course = get_course_by_id(db_session, target_module.course_id)
            if not course:
                return jsonify({'error': 'Course not found'}), 404
                
            # Check enrollment for students
            enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
            if not enrollment:
                return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        else:
            return jsonify({'error': 'Module ID is required'}), 400
        
        # Read file content
        file_content = file.read()
        file_size = len(file_content)
        use_s3 = os.getenv('USE_S3_STORAGE', 'false').lower() == 'true'
        
        if use_s3:
            # Upload to S3
            file_id = str(uuid.uuid4())
            s3_result = s3_storage.upload_file(
                file_obj=BytesIO(file_content),
                course_id=str(target_module.course_id),
                module_id=str(target_module.id),
                file_id=file_id,
                filename=file.filename,
                content_type=file.mimetype
            )
            
            # Create file record with S3 info
            new_file = create_file(
                db=db_session,
                module_id=str(target_module.id),
                title=title,
                filename=file.filename,
                file_type=file.mimetype or 'application/octet-stream',
                file_size=file_size,
                s3_key=s3_result['s3_key'],
                s3_bucket=s3_result['s3_bucket'],
                storage_type='s3'
            )
        else:
            # Traditional database storage
            new_file = create_file(
                db=db_session,
                module_id=str(target_module.id),
                title=title,
                filename=file.filename,
                file_type=file.mimetype or 'application/octet-stream',
                file_size=file_size,
                file_data=file_content,
                storage_type='database'
            )
        
        # Return the created file info in the format expected by the frontend
        return jsonify({
            'message': 'File uploaded successfully',
            'file': {
                'id': str(new_file.id),
                'title': new_file.title,
                'filename': new_file.filename,
                'file_type': new_file.file_type,
                'file_size': new_file.file_size,
                'module_id': str(new_file.module_id),
                'created_at': new_file.created_at.isoformat() if new_file.created_at else None
            }
        }), 201
        
    except Exception as e:
        db_session.rollback()
        import logging
        logging.error(f"File upload error: {str(e)}", exc_info=True)
        return jsonify({'error': f'File upload failed: {str(e)}'}), 500
    finally:
        db_session.close()

@bp.route('/<file_id>', methods=['GET'])
@require_auth
def get_file(file_id):
    """Get file metadata"""
    from sqlalchemy.orm import sessionmaker
    from core.database_supabase import db_manager
    
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        
        # Get file and verify access
        file_obj = get_file_by_id(db_session, file_id)
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
            
        # Check access through module and course
        module = get_module_by_id(db_session, file_obj.module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        return jsonify({
            'file': {
                'id': str(file_obj.id),
                'title': file_obj.title,
                'filename': file_obj.filename,
                'file_type': file_obj.file_type,
                'file_size': file_obj.file_size,
                'module_id': str(file_obj.module_id),
                'created_at': file_obj.created_at.isoformat() if file_obj.created_at else None,
                's3_key': file_obj.s3_key if hasattr(file_obj, 's3_key') else None,
                'storage_type': file_obj.storage_type if hasattr(file_obj, 'storage_type') else 'database'
            }
        }), 200
        
    except Exception as e:
        import logging
        logging.error(f"Get file error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to get file: {str(e)}'}), 500
    finally:
        db_session.close()

@bp.route('/<file_id>/content', methods=['GET'])
@require_auth
def get_file_content(file_id):
    """Get file content for viewing"""
    from sqlalchemy.orm import sessionmaker
    from core.database_supabase import db_manager
    
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        
        # Get file and verify access
        file_obj = get_file_by_id(db_session, file_id)
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
            
        # Check access through module and course
        module = get_module_by_id(db_session, file_obj.module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # Handle S3 files vs database files
        if hasattr(file_obj, 'storage_type') and file_obj.storage_type == 's3':
            if hasattr(file_obj, 's3_key') and file_obj.s3_key:
                # Generate presigned URL for S3 file
                try:
                    presigned_url = s3_storage.generate_presigned_url(
                        file_obj.s3_key,
                        expiration=3600  # 1 hour
                    )
                    
                    return jsonify({
                        'type': 'presigned',
                        'url': presigned_url
                    }), 200
                except Exception as s3_error:
                    import logging
                    logging.error(f"S3 presigned URL error: {str(s3_error)}", exc_info=True)
                    return jsonify({'error': 'Failed to generate file access URL'}), 500
            else:
                return jsonify({'error': 'S3 file key not found'}), 404
        else:
            # Return database-stored file content
            if hasattr(file_obj, 'file_data') and file_obj.file_data:
                return Response(
                    file_obj.file_data,
                    mimetype=file_obj.file_type or 'application/octet-stream'
                )
            else:
                return jsonify({'error': 'File content not found'}), 404
        
    except Exception as e:
        import logging
        logging.error(f"Get file content error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to get file content: {str(e)}'}), 500
    finally:
        db_session.close()

@bp.route('/<file_id>/download', methods=['GET'])
@require_auth
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

@bp.route('/<file_id>/preview', methods=['GET'])
@require_auth
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
@require_auth
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
@require_auth
def delete_file_endpoint(file_id):
    """Delete a file"""
    from sqlalchemy.orm import sessionmaker
    from core.database_supabase import db_manager
    from db.queries import delete_file
    
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        
        # Get file and verify access
        file_obj = get_file_by_id(db_session, file_id)
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
            
        # Check access through module and course
        module = get_module_by_id(db_session, file_obj.module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students (they can delete files in courses they're enrolled in)
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # If file is stored in S3, delete from S3 first
        if hasattr(file_obj, 'storage_type') and file_obj.storage_type == 's3' and hasattr(file_obj, 's3_key') and file_obj.s3_key:
            try:
                s3_storage.delete_file(file_obj.s3_key)
            except Exception as s3_error:
                import logging
                logging.warning(f"Failed to delete file from S3: {str(s3_error)}")
                # Continue with database deletion even if S3 deletion fails
        
        # Delete file from database
        delete_file(db_session, file_id)
        
        return jsonify({
            'message': 'File deleted successfully'
        }), 200
        
    except Exception as e:
        db_session.rollback()
        import logging
        logging.error(f"Delete file error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to delete file: {str(e)}'}), 500
    finally:
        db_session.close()

@bp.route('/module/<module_id>', methods=['GET'])
@require_auth
def get_module_files(module_id):
    """Get all files in a module"""
    from sqlalchemy.orm import sessionmaker
    from core.database_supabase import db_manager
    from db.queries import get_files_by_module
    
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

@bp.route('/search', methods=['GET'])
@require_auth
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

@bp.route('/<file_id>/content-v2', methods=['GET'])
@require_auth
def get_file_content_v2(file_id):
    """Get file content or presigned URL (v2)"""
    from ..s3_storage import s3_storage
    
    file_service = FileService()
    
    try:
        # Get file and check access
        file = file_service.get_file(file_id, g.current_user.id)
        
        # If file is in S3, return presigned URL
        if hasattr(file, 's3_key') and file.s3_key:
            try:
                presigned_url = s3_storage.generate_presigned_url(file.s3_key)
                return jsonify({
                    'type': 'presigned',
                    'url': presigned_url,
                    'filename': file.filename,
                    'file_type': file.file_type
                }), 200
            except Exception as s3_error:
                print(f"Error generating presigned URL: {str(s3_error)}")
                return jsonify({'error': 'Failed to access file'}), 500
        else:
            # For local files (legacy), return file content
            # This is a placeholder - in production, files should be in S3
            return jsonify({'error': 'File content not available'}), 404
            
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/process/<file_id>', methods=['POST'])
@require_auth
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

@bp.route('/<file_id>', methods=['PATCH'])
@require_auth
def update_file_endpoint(file_id):
    """Update file metadata"""
    from sqlalchemy.orm import sessionmaker
    from core.database_supabase import db_manager
    from db.queries import update_file
    
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        data = request.get_json() or {}
        
        # Get file and verify access
        file_obj = get_file_by_id(db_session, file_id)
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
            
        # Check access through module and course
        module = get_module_by_id(db_session, file_obj.module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students (they can update files in courses they're enrolled in)
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # Only allow certain fields to be updated
        allowed_fields = ['title']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
            
        # Update file
        updated_file = update_file(db_session, file_id, **update_data)
        
        return jsonify({
            'message': 'File updated successfully',
            'file': {
                'id': str(updated_file.id),
                'title': updated_file.title,
                'filename': updated_file.filename,
                'file_type': updated_file.file_type,
                'file_size': updated_file.file_size,
                'module_id': str(updated_file.module_id),
                'created_at': updated_file.created_at.isoformat() if updated_file.created_at else None
            }
        }), 200
        
    except Exception as e:
        db_session.rollback()
        import logging
        logging.error(f"Update file error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to update file: {str(e)}'}), 500
    finally:
        db_session.close()

@bp.route('/<file_id>/download', methods=['GET'])
@require_auth
def get_download_url(file_id):
    """Generate a signed URL for downloading a file"""
    from sqlalchemy.orm import sessionmaker
    from core.database_supabase import db_manager
    
    db_session = db_manager.get_session()
    
    try:
        user_id = g.current_user.id
        
        # Get file and verify access
        file_obj = get_file_by_id(db_session, file_id)
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
            
        # Check access through module and course
        module = get_module_by_id(db_session, file_obj.module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db_session, module.course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check enrollment for students
        enrollment = get_enrollment_by_student_course(db_session, user_id, course.id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # Check if file is stored in S3
        if hasattr(file_obj, 'storage_type') and file_obj.storage_type == 's3' and hasattr(file_obj, 's3_key') and file_obj.s3_key:
            # Generate signed URL using s3_signed_urls service
            signed_url = s3_signed_urls.generate_download_url(
                s3_key=file_obj.s3_key,
                filename=file_obj.filename,
                expires_in=3600,  # 1 hour expiration
                user_id=user_id
            )
            
            return jsonify({
                'signed_url': signed_url,
                'filename': file_obj.filename,
                'file_type': file_obj.file_type,
                'expires_in': 3600
            }), 200
        else:
            # File is not in S3
            return jsonify({'error': 'File is not available for download via signed URL'}), 400
        
    except Exception as e:
        import logging
        logging.error(f"Generate download URL error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to generate download URL: {str(e)}'}), 500
    finally:
        db_session.close()
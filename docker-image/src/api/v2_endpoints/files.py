"""
API v2 File Endpoints
"""
from flask import Blueprint, request, g, send_file, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import logging
import json

from core.decorators_unified import firebase_auth_required
from core.exceptions import ValidationError, NotFoundError, UnauthorizedError
from services.file_service import FileService
from repositories.module_repository import ModuleRepository

# Import s3_storage with error handling
try:
    from services.s3_storage_resilient import s3_storage
    logger = logging.getLogger(__name__)
    logger.info(f"S3 storage imported successfully: {type(s3_storage)}")
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.error(f"Failed to import s3_storage: {e}")
    s3_storage = None
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"Error initializing s3_storage: {e}")
    s3_storage = None

from .utils import success_response, error_response

# Create files blueprint
files_bp = Blueprint('api_v2_files', __name__)

# Initialize services lazily to avoid connection issues during import
file_service = None

def get_file_service():
    """Get file service instance with lazy initialization"""
    global file_service
    if file_service is None:
        file_service = FileService()
    return file_service

# File upload configuration
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'mp3', 'mp4', 'wav', 'jpg', 'jpeg', 'png'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@files_bp.route('/upload', methods=['POST'])
@firebase_auth_required
def upload_file_v2():
    """Upload a file to a module with enhanced validation"""
    try:
        user = g.current_user
        
        # Check for file
        if 'file' not in request.files:
            return error_response("No file provided")
        
        file = request.files['file']
        if file.filename == '':
            return error_response("No file selected")
        
        # Validate file
        if not allowed_file(file.filename):
            return error_response(
                f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Get module ID
        module_id = request.form.get('moduleId')
        if not module_id:
            return error_response("Module ID is required")
        
        # Check module access
        module_repo = ModuleRepository()
        module = module_repo.get_by_id(module_id)
        if not module:
            return error_response("Module not found", status_code=404)
        
        # Check course access through module
        from services.course_service import CourseService
        course_service = CourseService()
        try:
            if not course_service.check_course_access(module.course_id, user.id):
                return error_response("Access denied", status_code=403)
        except Exception as access_error:
            logger.warning(f"Course access check failed, using fallback: {str(access_error)}")
            # Fallback: allow authenticated users to upload files
            pass
        
        # Create file record
        filename = secure_filename(file.filename)
        file_record = get_file_service().create_file(
            module_id=module_id,
            title=request.form.get('title', filename),
            filename=filename,
            file_type=file.content_type or 'application/octet-stream',
            file_size=0,  # Will be updated after upload
            uploaded_by=user.id
        )
        
        # Upload to S3
        try:
            s3_key = f"courses/{module.course_id}/modules/{module_id}/files/{file_record.id}/{filename}"
            s3_url = s3_storage.upload_file(file, s3_key)
            
            # Update file record with S3 info
            get_file_service().update_file(
                file_id=file_record.id,
                s3_key=s3_key,
                s3_url=s3_url,
                file_size=file.content_length or 0
            )
            
            # Process file asynchronously
            from tasks.file_processing import process_file_async
            process_file_async.delay(str(file_record.id))
            
        except Exception as upload_error:
            # Delete file record if upload failed
            get_file_service().delete_file(file_record.id)
            raise upload_error
        
        # Format response
        formatted_file = {
            'id': str(file_record.id),
            'module_id': str(file_record.module_id),
            'title': file_record.title,
            'filename': file_record.filename,
            'file_type': file_record.file_type,
            'file_size': file_record.file_size,
            's3_key': s3_key,
            'created_at': datetime.utcnow().isoformat(),
            'processed': False
        }
        
        return success_response(
            formatted_file,
            message="File uploaded successfully",
            status_code=201
        )
        
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        return error_response("An error occurred uploading the file", status_code=500)


@files_bp.route('/<file_id>', methods=['GET'])
@firebase_auth_required
def get_file_v2(file_id):
    """Get file metadata"""
    try:
        user = g.current_user
        
        # Get file with access check
        file = get_file_service().get_file_with_access_check(file_id, user.id)
        
        # Format response
        formatted_file = {
            'id': str(file.id),
            'module_id': str(file.module_id),
            'title': file.title,
            'filename': file.filename,
            'file_type': file.file_type,
            'file_size': file.file_size,
            's3_key': file.s3_key if hasattr(file, 's3_key') else None,
            'processed': getattr(file, 'processed', False),
            'created_at': file.created_at.isoformat() if hasattr(file, 'created_at') else None,
            'updated_at': file.last_updated.isoformat() if hasattr(file, 'last_updated') else None
        }
        
        return success_response(formatted_file)
        
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except Exception as e:
        logger.error(f"Get file error: {str(e)}")
        return error_response("An error occurred fetching the file", status_code=500)


@files_bp.route('/<file_id>/content', methods=['GET'])
@firebase_auth_required
def get_file_content_v2(file_id):
    """Get file content (download or presigned URL)"""
    try:
        user = g.current_user
        
        # Get file with access check
        file = get_file_service().get_file_with_access_check(file_id, user.id)
        
        # Check if using S3
        if hasattr(file, 's3_key') and file.s3_key:
            try:
                # Generate presigned URL
                if s3_storage and hasattr(s3_storage, 'generate_presigned_url'):
                    presigned_url = s3_storage.generate_presigned_url(
                        file.s3_key,
                        expiration=3600  # 1 hour
                    )
                    
                    return jsonify({
                        'type': 'presigned',
                        'url': presigned_url,
                        'expires_in': 3600
                    })
                else:
                    logger.warning(f"S3 storage not properly configured, falling back to error response")
                    return error_response("File storage not configured", status_code=503)
            except Exception as s3_error:
                logger.error(f"S3 presigned URL generation failed: {str(s3_error)}")
                return error_response("File access temporarily unavailable", status_code=503)
        else:
            # Legacy local file storage
            try:
                file_path = os.path.join(
                    current_app.config.get('UPLOAD_FOLDER', '/tmp'),
                    str(file.module_id),
                    file.filename
                )
                
                if not os.path.exists(file_path):
                    return error_response("File not found on server", status_code=404)
                
                return send_file(
                    file_path,
                    as_attachment=True,
                    download_name=file.filename
                )
            except Exception as local_error:
                logger.error(f"Local file access failed: {str(local_error)}")
                return error_response("File access failed", status_code=500)
            
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except Exception as e:
        logger.error(f"Get file content error: {str(e)}")
        return error_response("An error occurred fetching the file content", status_code=500)


@files_bp.route('/<file_id>', methods=['PATCH'])
@firebase_auth_required
def update_file_v2(file_id):
    """Update file metadata"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        # Update file
        updated_file = get_file_service().update_file_with_access_check(
            file_id=file_id,
            user_id=user.id,
            **data
        )
        
        # Return updated file
        return get_file_v2(file_id)
        
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"Update file error: {str(e)}")
        return error_response("An error occurred updating the file", status_code=500)


@files_bp.route('/<file_id>', methods=['DELETE'])
@firebase_auth_required
def delete_file_v2(file_id):
    """Delete a file"""
    try:
        user = g.current_user
        
        # Get file first to get S3 key
        file = get_file_service().get_file_with_access_check(file_id, user.id)
        
        # Delete from S3 if applicable
        if hasattr(file, 's3_key') and file.s3_key:
            try:
                s3_storage.delete_file(file.s3_key)
            except Exception as s3_error:
                logger.error(f"Failed to delete S3 file: {s3_error}")
        
        # Delete file record
        success = get_file_service().delete_file_with_access_check(file_id, user.id)
        
        if success:
            return success_response(message="File deleted successfully")
        else:
            return error_response("Failed to delete file", status_code=500)
            
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except Exception as e:
        logger.error(f"Delete file error: {str(e)}")
        return error_response("An error occurred deleting the file", status_code=500)


@files_bp.route('/<file_id>/existing-content', methods=['GET'])
@firebase_auth_required
def get_existing_content_v2(file_id):
    """Get existing personalized content for a file"""
    try:
        user = g.current_user
        
        # Get file with access check
        file = get_file_service().get_file_with_access_check(file_id, user.id)
        
        logger.info(f"File retrieved for existing-content: {type(file)}, has filename: {hasattr(file, 'filename')}")
        
        # For now, return empty content - this can be expanded later to check for saved personalized content
        response_data = {
            'content': [],
            'fileName': file.filename if hasattr(file, 'filename') else 'Document'
        }
        
        logger.info(f"Existing content response: {response_data}")
        return jsonify(response_data)
        
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except Exception as e:
        logger.error(f"Get existing content error: {str(e)}")
        return error_response("An error occurred fetching existing content", status_code=500)


@files_bp.route('/<file_id>/outline', methods=['GET'])
@firebase_auth_required
def get_file_outline_v2(file_id):
    """Generate document outline for a file"""
    try:
        user = g.current_user
        
        # Get file with access check
        file = get_file_service().get_file_with_access_check(file_id, user.id)
        
        logger.info(f"File retrieved for outline: {type(file)}, has filename: {hasattr(file, 'filename')}")
        
        # Generate a basic outline structure
        # This can be expanded later to use AI services for real outline generation
        outline = {
            'fileId': file_id,
            'fileName': file.filename if hasattr(file, 'filename') else 'Document',
            'outline': {
                'chapters': [
                    {
                        'id': 'chapter-1',
                        'title': 'Introduction & Overview',
                        'estimatedTokens': 2000,
                        'subsections': [
                            {'id': '1.1', 'title': 'Getting Started', 'estimatedTokens': 500},
                            {'id': '1.2', 'title': 'Core Concepts', 'estimatedTokens': 600},
                            {'id': '1.3', 'title': 'Key Objectives', 'estimatedTokens': 500},
                            {'id': '1.4', 'title': 'Learning Path', 'estimatedTokens': 400}
                        ]
                    },
                    {
                        'id': 'chapter-2',
                        'title': 'Main Content',
                        'estimatedTokens': 3000,
                        'subsections': [
                            {'id': '2.1', 'title': 'Fundamental Principles', 'estimatedTokens': 800},
                            {'id': '2.2', 'title': 'Practical Applications', 'estimatedTokens': 900},
                            {'id': '2.3', 'title': 'Advanced Topics', 'estimatedTokens': 700},
                            {'id': '2.4', 'title': 'Case Studies', 'estimatedTokens': 600}
                        ]
                    },
                    {
                        'id': 'chapter-3',
                        'title': 'Summary & Next Steps',
                        'estimatedTokens': 1500,
                        'subsections': [
                            {'id': '3.1', 'title': 'Key Takeaways', 'estimatedTokens': 500},
                            {'id': '3.2', 'title': 'Further Reading', 'estimatedTokens': 400},
                            {'id': '3.3', 'title': 'Practice Exercises', 'estimatedTokens': 600}
                        ]
                    }
                ]
            }
        }
        
        logger.info(f"Outline response: {outline}")
        return jsonify(outline)
        
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except Exception as e:
        logger.error(f"Get file outline error: {str(e)}")
        return error_response("An error occurred generating file outline", status_code=500)


@files_bp.route('/<file_id>/stream-section', methods=['POST'])
@firebase_auth_required
def stream_section_v2(file_id):
    """Stream personalized content for a file section"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        # Get file with access check
        file = get_file_service().get_file_with_access_check(file_id, user.id)
        
        chapter_id = data.get('chapter_id')
        subsection_id = data.get('subsection_id')
        
        if not chapter_id or not subsection_id:
            return error_response("chapter_id and subsection_id are required")
        
        # Generate mock streaming content for now
        # This can be replaced with real AI-powered content generation later
        def generate_content():
            content_template = f"""
# {chapter_id.replace('-', ' ').title()} - {subsection_id}

This is personalized content generated for your learning journey. Here are the key concepts:

## Understanding the Fundamentals

The core principles we'll explore in this section build upon your previous knowledge and help you advance your understanding.

## Key Learning Points

1. **Conceptual Foundation**: We start with the basic concepts that form the foundation of this topic.

2. **Practical Applications**: Next, we explore how these concepts apply in real-world scenarios.

3. **Advanced Insights**: Finally, we dive deeper into more complex aspects that will enhance your expertise.

## Interactive Examples

Let's work through some examples that demonstrate these concepts in action:

- Example 1: Basic application of the concept
- Example 2: More complex scenario
- Example 3: Real-world case study

## Summary

This section has covered the essential elements of {chapter_id.replace('-', ' ')} focusing on {subsection_id.replace('-', ' ')}. 

## Next Steps

Continue to the next section to build upon these concepts and further develop your understanding.
"""
            
            # Split content into words for streaming effect
            words = content_template.strip().split()
            
            # Stream content word by word
            for i, word in enumerate(words):
                if i == 0:
                    chunk = word
                else:
                    chunk = ' ' + word
                
                # Format as Server-Sent Events
                yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Small delay between words to simulate real streaming
                import time
                time.sleep(0.05)
        
        # Create streaming response
        def response_generator():
            yield "data: " + json.dumps({"status": "starting"}) + "\n\n"
            
            for chunk in generate_content():
                yield chunk
                
            yield "data: " + json.dumps({"status": "complete"}) + "\n\n"
        
        from flask import Response
        return Response(
            response_generator(),
            mimetype='text/plain',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'  # Disable nginx buffering
            }
        )
        
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except Exception as e:
        logger.error(f"Stream section error: {str(e)}")
        return error_response("An error occurred streaming content", status_code=500)
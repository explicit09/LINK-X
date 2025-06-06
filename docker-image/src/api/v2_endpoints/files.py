"""
API v2 File Endpoints
"""
from flask import Blueprint, request, g, send_file, jsonify, current_app, Response
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import logging
import json

from core.auth.decorators import require_auth
from core.exceptions import ValidationError, NotFoundError, UnauthorizedError
from services.file_service import FileService
from repositories.module_repository import ModuleRepository
from core.prompts import prompt_generate_personalized_file_content, prompt3_generate_module_content

# Import AI services
try:
    from services.ai.ai_service import AIService
    from services.streaming.streaming_handler import StreamingHandler
    from services.streaming.data_processor import DataProcessor
    from services.streaming.recommendation_engine import RecommendationEngine
    ai_service = AIService()
    streaming_handler = StreamingHandler(ai_service.client.client)
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"AI services not available: {e}")
    ai_service = None
    streaming_handler = None

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
@require_auth
def upload_file_v2():
    """Upload a file to a module with enhanced validation"""
    logger = logging.getLogger(__name__)
    try:
        logger.info("File upload started")
        user = g.current_user
        logger.info(f"User authenticated: {user.id}")
        
        # Check for file
        if 'file' not in request.files:
            logger.error("No file in request")
            return error_response("No file provided")
        
        file = request.files['file']
        if file.filename == '':
            logger.error("Empty filename")
            return error_response("No file selected")
        
        logger.info(f"File received: {file.filename}")
        
        # Validate file
        if not allowed_file(file.filename):
            logger.error(f"Invalid file type: {file.filename}")
            return error_response(
                f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Get module ID
        module_id = request.form.get('moduleId')
        if not module_id:
            logger.error("No module ID provided")
            return error_response("Module ID is required")
        
        logger.info(f"Module ID: {module_id}")
        
        # Check module access using direct db query
        try:
            from core.database_supabase import db
            from db.schema import Module
            module = db.session.query(Module).filter_by(id=module_id).first()
            logger.info(f"Module lookup result: {module}")
            if not module:
                logger.error(f"Module not found: {module_id}")
                return error_response("Module not found", status_code=404)
        except Exception as module_error:
            logger.error(f"Error accessing module: {str(module_error)}")
            return error_response("Error accessing module", status_code=500)
        
        # Check course access through module
        try:
            from services.course_service import CourseService
            course_service = CourseService()
            if not course_service.check_course_access(module.course_id, user.id):
                logger.warning("Course access denied")
                return error_response("Access denied", status_code=403)
        except Exception as access_error:
            logger.warning(f"Course access check failed, using fallback: {str(access_error)}")
            # Fallback: allow authenticated users to upload files
            pass
        
        # Create file record using direct db query with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                filename = secure_filename(file.filename)
                logger.info(f"Secured filename: {filename}")
                # Extract file extension for file_type
                file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown'
                logger.info(f"File extension: {file_extension}")
                
                from db.schema import File
                import uuid
                
                # Close any existing connection that might be stale
                if attempt > 0:
                    try:
                        db.session.close()
                        db.engine.dispose()
                    except:
                        pass
                
                file_record = File(
                    id=uuid.uuid4(),
                    module_id=module_id,
                    title=request.form.get('title', filename),
                    filename=filename,
                    file_type=file_extension,
                    file_size=0,  # Will be updated after upload
                    storage_type='database'  # Default, will be updated if S3 is used
                    # Note: uploaded_by field doesn't exist in the database
                )
                
                db.session.add(file_record)
                db.session.flush()  # Get the ID
                logger.info(f"File record created: {file_record.id}")
                break  # Success, break out of retry loop
                
            except Exception as create_error:
                logger.error(f"Error creating file record (attempt {attempt + 1}): {str(create_error)}")
                db.session.rollback()
                
                # If this is the last attempt, return error
                if attempt == max_retries - 1:
                    return error_response("Error creating file record", status_code=500)
                
                # Wait a bit before retrying
                import time
                time.sleep(0.5)
        
        # Check if S3 is configured
        use_s3 = os.getenv('USE_S3_STORAGE', 'false').lower() == 'true'
        logger.info(f"S3 Configuration: USE_S3_STORAGE={use_s3}, s3_storage={s3_storage is not None}")
        
        if use_s3 and s3_storage:
            # Upload to S3
            try:
                logger.info(f"Attempting S3 upload for file {file_record.id}: {filename}")
                # Reset file pointer to beginning
                file.seek(0)
                
                # Call S3 service with correct parameters
                s3_result = s3_storage.upload_file(
                    file_obj=file,
                    course_id=str(module.course_id),
                    module_id=str(module_id),
                    file_id=str(file_record.id),
                    filename=filename
                )
                
                logger.info(f"S3 upload result: {s3_result}")
                
                # Check if upload was successful
                if 'error' in s3_result or s3_result.get('fallback', False):
                    logger.error(f"S3 upload failed or fell back: {s3_result}")
                    # Don't set S3 fields, will fall through to local storage
                    use_s3 = False
                else:
                    # Update file record with S3 info
                    file_record.s3_key = s3_result['s3_key']
                    file_record.s3_bucket = s3_result['s3_bucket']
                    file_record.storage_type = 's3'
                    # Get actual file size - seek to end and get position
                    try:
                        file.seek(0, 2)  # Seek to end
                        actual_file_size = file.tell()
                        file.seek(0)  # Reset to beginning
                        file_record.file_size = int(actual_file_size if actual_file_size > 0 else (file.content_length or 0))
                    except ValueError:
                        # File might be closed, use content_length
                        file_record.file_size = int(file.content_length or 0)
                    logger.info(f"Successfully uploaded to S3: bucket={file_record.s3_bucket}, key={file_record.s3_key}, size={file_record.file_size}")
                
                # Process file - try async first, then sync
                processed = False
                try:
                    # Try both import paths for compatibility
                    try:
                        from src.tasks.file_processing import process_file_async
                        from src.celery_app import app as celery_app
                    except ImportError:
                        from tasks.file_processing import process_file_async
                        from celery_app import app as celery_app
                    
                    # Check if Celery is available and connected
                    logger.info(f"Checking Celery availability for file {file_record.id}")
                    logger.info(f"Celery app: {celery_app}, broker: {celery_app.conf.broker_url if celery_app else 'None'}")
                    
                    if celery_app and hasattr(process_file_async, 'delay'):
                        logger.info(f"Celery is available, attempting to queue task for {file_record.id}")
                        result = process_file_async.delay(str(file_record.id))
                        logger.info(f"✅ CELERY: Successfully queued file processing for file {file_record.id}, task_id: {result.id if hasattr(result, 'id') else 'unknown'}")
                        processed = True
                    else:
                        logger.warning(f"Celery app not properly configured or task not registered")
                except Exception as queue_error:
                    logger.warning(f"❌ CELERY: Failed to queue task - {str(queue_error)}")
                
                # If async failed, process synchronously
                if not processed:
                    try:
                        logger.info(f"⚡ SYNC: Processing file {file_record.id} synchronously (fallback)")
                        # Direct processing without Celery
                        from services.ai_service import AIService
                        from services.s3_storage_resilient import s3_storage as s3_svc
                        from utils.textUtils import extract_text, clean_extracted_text
                        
                        ai_service_sync = AIService()
                        
                        # Extract text based on file type
                        text_content = None
                        if file_record.file_type == 'pdf':
                            # Download from S3
                            file_content = s3_svc.download_file(file_record.s3_key)
                            if file_content:
                                text_content = extract_text(file_content, 'pdf')
                        
                        if text_content:
                            # Clean and save text
                            cleaned_text = clean_extracted_text(text_content)
                            file_record.transcription = cleaned_text
                            db.session.commit()
                            logger.info(f"Text extraction completed for {file_record.id}")
                            
                            # Generate embeddings synchronously
                            try:
                                from tasks.embedding import generate_embeddings_sync
                                generate_embeddings_sync(str(file_record.id), cleaned_text)
                                logger.info(f"Embeddings generated for {file_record.id}")
                            except Exception as emb_error:
                                logger.error(f"Failed to generate embeddings: {str(emb_error)}")
                        else:
                            file_record.transcription = "PROCESSING_FAILED"
                            logger.error(f"Failed to extract text from {file_record.id}")
                    except Exception as sync_error:
                        logger.error(f"Synchronous processing failed: {str(sync_error)}")
                        import traceback
                        logger.error(f"Traceback: {traceback.format_exc()}")
                        file_record.transcription = "PROCESSING_FAILED"
                
            except Exception as upload_error:
                logger.error(f"S3 upload failed, will use local storage: {str(upload_error)}")
                # Don't delete, fall back to local storage
                use_s3 = False
        
        if not use_s3:
            # Local file storage fallback
            try:
                # Read file content - handle closed file
                try:
                    file.seek(0)
                    file_content = file.read()
                except ValueError as e:
                    # File is closed, we can't read it
                    logger.error(f"Cannot read file - file object is closed: {str(e)}")
                    file_record.transcription = "PROCESSING_FAILED"
                    db.session.commit()
                    return error_response("File upload failed - file stream closed", status_code=500)
                
                file_size = len(file_content)
                
                # Update file record with size
                file_record.file_size = int(file_size)
                file_record.storage_type = 'database'
                
                # Store file locally (in database or filesystem)
                # This is a simplified version - you may want to store in filesystem
                logger.info(f"File {filename} stored locally with size {file_size}")
                
                # Process file - try async first, then sync
                processed = False
                try:
                    from celery import current_app as celery_app
                    # Try both import paths for compatibility
                    try:
                        from src.tasks.file_processing import process_file_async
                    except ImportError:
                        from tasks.file_processing import process_file_async
                    
                    # Check if Celery is available
                    if celery_app and hasattr(process_file_async, 'delay'):
                        result = process_file_async.delay(str(file_record.id))
                        logger.info(f"Queued file processing for local file {file_record.id}")
                        processed = True
                except Exception as queue_error:
                    logger.warning(f"Celery not available for local file: {str(queue_error)}")
                
                # If async failed, process synchronously
                if not processed:
                    try:
                        logger.info("Processing local file synchronously")
                        from utils.textUtils import extract_text, clean_extracted_text
                        
                        # Extract text based on file type
                        file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                        text_content = None
                        
                        if file_extension in ['txt', 'md']:
                            text_content = file_content.decode('utf-8', errors='ignore')
                        elif file_extension == 'pdf':
                            text_content = extract_text(file_content, 'pdf')
                        
                        if text_content:
                            # Clean and save text
                            cleaned_text = clean_extracted_text(text_content)
                            file_record.transcription = cleaned_text
                            db.session.commit()
                            logger.info(f"Text extraction completed for local file {file_record.id}")
                            
                            # Generate embeddings synchronously
                            try:
                                from tasks.embedding import generate_embeddings_sync
                                generate_embeddings_sync(str(file_record.id), cleaned_text)
                                logger.info(f"Embeddings generated for local file {file_record.id}")
                            except Exception as emb_error:
                                logger.error(f"Failed to generate embeddings: {str(emb_error)}")
                        else:
                            file_record.transcription = "PROCESSING_FAILED"
                            logger.error(f"Failed to extract text from local file {file_record.id}")
                    except Exception as sync_error:
                        logger.error(f"Synchronous processing failed: {str(sync_error)}")
                        import traceback
                        logger.error(f"Traceback: {traceback.format_exc()}")
                        file_record.transcription = "PROCESSING_FAILED"
                
            except Exception as local_error:
                logger.error(f"Local storage failed: {str(local_error)}")
                # Delete file record if both storage methods failed
                db.session.delete(file_record)
                db.session.commit()
                raise local_error
        
        # Commit the transaction with retry logic
        max_commit_retries = 3
        for commit_attempt in range(max_commit_retries):
            try:
                # Refresh the session if this is a retry
                if commit_attempt > 0:
                    try:
                        db.session.close()
                        db.engine.dispose()
                        # Re-add the file record to the new session
                        db.session.add(file_record)
                    except Exception as refresh_error:
                        logger.warning(f"Session refresh failed: {str(refresh_error)}")
                
                db.session.commit()
                logger.info("File record committed to database")
                break  # Success, break out of retry loop
                
            except Exception as commit_error:
                logger.error(f"Failed to commit file record (attempt {commit_attempt + 1}): {str(commit_error)}")
                db.session.rollback()
                
                # If this is the last attempt, return error
                if commit_attempt == max_commit_retries - 1:
                    return error_response("Failed to save file record", status_code=500)
                
                # Wait a bit before retrying
                import time
                time.sleep(0.5)
        
        # Format response
        formatted_file = {
            'id': str(file_record.id),
            'module_id': str(file_record.module_id),
            'title': file_record.title,
            'filename': file_record.filename,
            'file_type': file_record.file_type,
            'file_size': file_record.file_size,
            's3_key': getattr(file_record, 's3_key', None),
            's3_bucket': getattr(file_record, 's3_bucket', None),
            'storage_type': getattr(file_record, 'storage_type', 'database'),
            'created_at': datetime.utcnow().isoformat(),
            'processed': False
        }
        
        return success_response(
            formatted_file,
            message="File uploaded successfully",
            status_code=201
        )
        
    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        return error_response(str(e))
    except Exception as e:
        logger.error(f"File upload error: {str(e)}", exc_info=True)
        return error_response(f"An error occurred uploading the file: {str(e)}", status_code=500)


@files_bp.route('/<file_id>', methods=['GET'])
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
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
@require_auth
def get_existing_content_v2(file_id):
    """Get existing personalized content for a file"""
    try:
        user = g.current_user
        
        # Get file with access check
        file = get_file_service().get_file_with_access_check(file_id, user.id)
        
        logger.info(f"File retrieved for existing-content: {type(file)}, has filename: {hasattr(file, 'filename')}")
        
        # Check for existing personalized content
        try:
            from repositories.file_repository import FileRepository
            file_repo = FileRepository()
            
            # Look for personalized version of this file for this user
            personalized_file = file_repo.get_personalized_file(file_id, user.id)
            
            if personalized_file and personalized_file.processed:
                # Parse existing personalized content
                try:
                    import json
                    personalized_data = json.loads(personalized_file.personalized_content)
                    
                    # Extract content sections
                    content_sections = []
                    if 'chapters' in personalized_data:
                        for chapter in personalized_data['chapters']:
                            chapter_title = chapter.get('chapterTitle', chapter.get('title', 'Chapter'))
                            if 'subsections' in chapter:
                                for subsection in chapter['subsections']:
                                    content_sections.append({
                                        'sectionId': f"{chapter_title.lower().replace(' ', '-')}-{len(content_sections)+1}",
                                        'title': subsection.get('title', 'Section'),
                                        'content': subsection.get('fullText', subsection.get('content', ''))
                                    })
                    elif 'sections' in personalized_data:
                        for i, section in enumerate(personalized_data['sections']):
                            content_sections.append({
                                'sectionId': f"section-{i+1}",
                                'title': section.get('title', f'Section {i+1}'),
                                'content': section.get('content', section.get('text', ''))
                            })
                    
                    response_data = {
                        'content': content_sections,
                        'fileName': file.filename if hasattr(file, 'filename') else 'Document'
                    }
                    
                    logger.info(f"Found existing personalized content with {len(content_sections)} sections")
                    return jsonify(response_data)
                    
                except (json.JSONDecodeError, KeyError) as parse_error:
                    logger.warning(f"Could not parse personalized content: {parse_error}")
                    # Fall through to empty content
            
        except Exception as repo_error:
            logger.warning(f"Could not check for personalized content: {repo_error}")
            # Fall through to empty content
        
        # Return empty content if no personalized version found
        response_data = {
            'content': [],
            'fileName': file.filename if hasattr(file, 'filename') else 'Document'
        }
        
        logger.info(f"No existing personalized content found, returning empty: {response_data}")
        return jsonify(response_data)
        
    except NotFoundError:
        return error_response("File not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except Exception as e:
        logger.error(f"Get existing content error: {str(e)}")
        return error_response("An error occurred fetching existing content", status_code=500)


@files_bp.route('/<file_id>/outline', methods=['GET'])
@require_auth
def get_file_outline_v2(file_id):
    """Generate outline for a file"""
    try:
        user = g.current_user
        
        # Get file with access check
        file_obj = get_file_service().get_file_with_access_check(file_id, user.id)
        
        # Extract content and filename from File object
        file_content = ""
        file_name = "Document"
        
        if hasattr(file_obj, 'extracted_text') and file_obj.extracted_text:
            file_content = file_obj.extracted_text
        elif hasattr(file_obj, 'content') and file_obj.content:
            file_content = file_obj.content
            
        if hasattr(file_obj, 'filename') and file_obj.filename:
            file_name = file_obj.filename
        elif hasattr(file_obj, 'title') and file_obj.title:
            file_name = file_obj.title
        
        # Try to use AI service to generate real outline if available and we have content
        if ai_service and file_content.strip():
            try:
                ai_outline = ai_service.generate_outline(file_content)
                logger.info(f"Generated AI outline for {file_name}")
                return jsonify(ai_outline)
            except Exception as ai_error:
                logger.warning(f"AI outline generation failed: {ai_error}")
                # Fall through to static outline
        
        # Fallback static outline
        outline = {
            "title": file_name,
            "sections": [
                {
                    "title": "Introduction & Overview",
                    "subsections": [
                        {"title": "Getting Started", "key_points": ["Basic concepts", "Prerequisites", "Learning objectives"]},
                        {"title": "Key Topics", "key_points": ["Main themes", "Important concepts", "Core principles"]}
                    ]
                },
                {
                    "title": "Main Content",
                    "subsections": [
                        {"title": "Detailed Analysis", "key_points": ["In-depth exploration", "Examples", "Applications"]},
                        {"title": "Practical Implementation", "key_points": ["Real-world usage", "Best practices", "Common patterns"]}
                    ]
                },
                {
                    "title": "Summary & Conclusion",
                    "subsections": [
                        {"title": "Key Takeaways", "key_points": ["Important insights", "Main lessons", "Critical points"]},
                        {"title": "Next Steps", "key_points": ["Further reading", "Advanced topics", "Practice exercises"]}
                    ]
                }
            ]
        }
        
        logger.info(f"Generated static outline for {file_name}")
        return jsonify(outline)
        
    except Exception as e:
        logger.error(f"Error generating outline for file {file_id}: {str(e)}")
        return jsonify({
            "error": "Failed to generate outline",
            "message": str(e)
        }), 500


@files_bp.route('/<file_id>/stream-section', methods=['POST'])
@require_auth
def stream_section_v2(file_id):
    """Stream personalized content for a specific section"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        # Get file with access check
        file_obj = get_file_service().get_file_with_access_check(file_id, user.id)
            
        # Get user profile
        from services.user_service import UserService
        user_service = UserService()
        user_profile = user_service.get_user_profile(user.id)
        
        # Build persona from profile
        persona = f"""
        Learning Style: {user_profile.get('learning_style', 'Visual')}
        Experience Level: {user_profile.get('experience_level', 'Beginner')}
        Interests: {', '.join(user_profile.get('interests', []))}
        Goals: {user_profile.get('goals', 'General learning')}
        Background: {user_profile.get('background', 'Student')}
        """
        
        # Use existing prompt function for generating module content
        topic = f"{data.get('topic', 'Section')} - {data.get('focus', 'Content')}"
        expertise_summary = user_profile.get('experience_level', 'Beginner')
        
        # Check if AI service is available
        if not ai_service:
            return error_response("AI service is not available"), 503
            
        try:
            # Generate content using AI service
            response = ai_service.generate_response(
                system_prompt=f"""You are an expert educational content creator. 
                Create personalized learning content for the following user profile:
                {persona}
                
                The content should be tailored to their expertise level: {expertise_summary}""",
                user_prompt=f"""Create detailed educational content about: {topic}
                
                Make it engaging, clear, and appropriate for the user's level.
                Include examples, explanations, and key takeaways."""
            )
            content = response
        except Exception as e:
            logger.error(f"AI generation error: {str(e)}")
            return error_response(f"Failed to generate content: {str(e)}"), 500
        
        # Generate streaming response
        def generate():
            try:
                # Split content into words for streaming effect
                words = content.split()
                current_chunk = ""
                
                for i, word in enumerate(words):
                    current_chunk += (" " if current_chunk else "") + word
                    
                    # Send chunks every few words
                    if (i + 1) % 5 == 0 or i == len(words) - 1:
                        yield f"data: {json.dumps({'content': current_chunk})}\n\n"
                        current_chunk = ""
                        
                        # Small delay to simulate streaming
                        import time
                        time.sleep(0.1)
                        
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                logger.error(f"Streaming error: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        response = Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error streaming section for file {file_id}: {str(e)}")
        return jsonify({
            "error": "Failed to stream section content",
            "message": str(e)
        }), 500
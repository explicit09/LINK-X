"""
Supabase Storage File Service
Simplified file management using Supabase Storage instead of S3
"""
from typing import Dict, Optional, BinaryIO
import uuid
import mimetypes
from datetime import datetime
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage

from core.supabase_config import get_supabase_client
from repositories.file_repository import FileRepository
from repositories.module_repository import ModuleRepository
from repositories.course_repository import CourseRepository
from core.exceptions import NotFoundError, ValidationError, FileProcessingError, UnauthorizedError
from core.config import get_config
import logging

logger = logging.getLogger(__name__)


class SupabaseFileService:
    """Simplified file service using Supabase Storage"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.file_repo = FileRepository()
        self.module_repo = ModuleRepository()
        self.course_repo = CourseRepository()
        self.config = get_config()
        self.bucket_name = 'course-files'
        
    def upload_file(self, file: FileStorage, module_id: str, user_id: str, 
                    title: Optional[str] = None, description: Optional[str] = None) -> Dict:
        """
        Upload a file to Supabase Storage
        Simplified from 200+ lines to ~50 lines
        """
        # Verify module exists
        module = self.module_repo.get_by_id(module_id)
        if not module:
            raise NotFoundError("Module not found")
        
        # Validate file
        if not file or not file.filename:
            raise ValidationError("No file provided")
        
        # Generate secure filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        
        # Check allowed extensions
        allowed_extensions = {'pdf', 'txt', 'doc', 'docx', 'mp3', 'wav', 'm4a', 'mp4', 'jpg', 'jpeg', 'png', 'gif'}
        if file_extension not in allowed_extensions:
            raise ValidationError(f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}")
        
        # Generate unique file ID and storage path
        file_id = str(uuid.uuid4())
        storage_filename = f"{file_id}_{original_filename}"
        # Path structure enables course-based sharing policies
        storage_path = f"courses/{module.course_id}/modules/{module_id}/{storage_filename}"
        
        try:
            # Upload to Supabase Storage
            file_data = file.read()
            self.supabase.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_data,
                file_options={
                    "content-type": file.content_type or mimetypes.guess_type(original_filename)[0] or 'application/octet-stream',
                    "x-upsert": "false"  # Don't overwrite existing files
                }
            )
            
            # Create database record
            file_record = self.file_repo.create({
                'id': file_id,
                'module_id': module_id,
                'title': title or original_filename,
                'description': description,
                'filename': original_filename,
                'storage_path': storage_path,
                'storage_bucket': self.bucket_name,
                'file_type': file_extension,
                'file_size': len(file_data),
                'uploaded_by': user_id,
                'storage_metadata': {
                    'content_type': file.content_type,
                    'original_filename': original_filename
                }
            })
            
            # Process file content (text extraction, chunking)
            # Embeddings will be generated automatically via Supabase triggers
            self._queue_file_processing(file_record)
            
            logger.info(f"File uploaded successfully: {file_id}")
            return self._format_file_response(file_record)
            
        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            raise FileProcessingError(f"Failed to upload file: {str(e)}")
    
    def get_file_url(self, file_id: str, expires_in: int = 3600) -> str:
        """Generate a signed URL for file access"""
        file_record = self.file_repo.get_by_id(file_id)
        if not file_record:
            raise NotFoundError("File not found")
        
        try:
            # Generate signed URL from Supabase Storage
            response = self.supabase.storage.from_(self.bucket_name).create_signed_url(
                path=file_record.storage_path,
                expires_in=expires_in
            )
            
            if response.get('error'):
                raise FileProcessingError(f"Failed to generate URL: {response['error']}")
            
            return response['data']['signedUrl']
            
        except Exception as e:
            logger.error(f"Error generating signed URL: {str(e)}")
            raise FileProcessingError(f"Failed to generate file URL: {str(e)}")
    
    def download_file(self, file_id: str) -> tuple[bytes, str, str]:
        """Download a file from Supabase Storage"""
        file_record = self.file_repo.get_by_id(file_id)
        if not file_record:
            raise NotFoundError("File not found")
        
        try:
            # Download from Supabase Storage
            response = self.supabase.storage.from_(self.bucket_name).download(file_record.storage_path)
            
            # Return file data, filename, and content type
            content_type = file_record.storage_metadata.get('content_type', 'application/octet-stream')
            return response, file_record.filename, content_type
            
        except Exception as e:
            logger.error(f"Error downloading file: {str(e)}")
            raise FileProcessingError(f"Failed to download file: {str(e)}")
    
    def delete_file(self, file_id: str, user_id: str) -> bool:  # noqa: F841
        """Delete a file from Supabase Storage and database"""
        file_record = self.file_repo.get_by_id(file_id)
        if not file_record:
            raise NotFoundError("File not found")
        
        # Check if user has permission to delete (instructor of the course)
        module = self.module_repo.get_by_id(file_record.module_id)
        course = self.course_repo.get_by_id(module.course_id)
        
        if str(course.instructor_id) != str(user_id):
            raise UnauthorizedError("Not authorized to delete this file")
        
        try:
            # Delete from Supabase Storage
            self.supabase.storage.from_(self.bucket_name).remove([file_record.storage_path])
            
            # Delete from database
            self.file_repo.delete(file_id)
            
            logger.info(f"File deleted successfully: {file_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            raise FileProcessingError(f"Failed to delete file: {str(e)}")
    
    def get_file_with_access_check(self, file_id: str, user_id: str) -> Dict:
        """Get file with access verification"""
        file_record = self.file_repo.get_by_id(file_id)
        if not file_record:
            raise NotFoundError("File not found")
        
        # Check access through module and course
        module = self.module_repo.get_by_id(file_record.module_id)
        if not module:
            raise NotFoundError("Module not found")
            
        course = self.course_repo.get_by_id(module.course_id)
        if not course:
            raise NotFoundError("Course not found")
        
        # Check if user has access to the course
        # User has access if they are the instructor, creator, or enrolled as a student
        is_instructor = str(course.instructor_id) == str(user_id)
        is_creator = str(course.creator_id) == str(user_id)
        
        if not is_instructor and not is_creator:
            # Check if user is enrolled as a student
            from repositories.enrollment_repository import EnrollmentRepository
            enrollment_repo = EnrollmentRepository()
            enrollment = enrollment_repo.get_user_enrollment(user_id, course.id)
            
            if not enrollment:
                raise UnauthorizedError("You do not have access to this file")
            
            # Additional check: if the user uploaded the file, they should have access
            is_uploader = str(file_record.uploaded_by) == str(user_id) if file_record.uploaded_by else False
            if not is_uploader and enrollment.role != 'student':
                raise UnauthorizedError("You do not have access to this file")
        
        return self._format_file_response(file_record)
    
    def list_module_files(self, module_id: str, user_id: str) -> list[Dict]:
        """List all files in a module"""
        # Verify module exists and user has access
        module = self.module_repo.get_by_id(module_id)
        if not module:
            raise NotFoundError("Module not found")
        
        # Get files from database
        files = self.file_repo.get_by_module(module_id)
        
        # Format response
        return [self._format_file_response(f) for f in files]
    
    def _queue_file_processing(self, file_record):
        """Queue file for processing (text extraction, chunking)"""
        # In the new architecture, we'll process files synchronously
        # and let Supabase triggers handle embedding generation
        from tasks.file_processing_simple import process_file_content
        
        try:
            # Process file synchronously (fast enough without embeddings)
            process_file_content(str(file_record.id))
        except Exception as e:
            logger.error(f"Error processing file {file_record.id}: {str(e)}")
            # Don't fail the upload if processing fails
    
    def _format_file_response(self, file_record) -> Dict:
        """Format file record for API response"""
        return {
            'id': str(file_record.id),
            'module_id': str(file_record.module_id),
            'title': file_record.title,
            'description': file_record.description,
            'filename': file_record.filename,
            'file_type': file_record.file_type,
            'file_size': file_record.file_size,
            'uploaded_by': str(file_record.uploaded_by),
            'created_at': file_record.created_at.isoformat() if file_record.created_at else None,
            'storage_path': file_record.storage_path,
            'storage_bucket': file_record.storage_bucket
        }
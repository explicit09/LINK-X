"""File upload service module"""
import uuid
from typing import Dict
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage

from core.exceptions import NotFoundError, ValidationError, FileProcessingError, AuthorizationError
from core.cache import invalidate_cache
from tasks import process_file_async
from .base_service import BaseFileService

class FileUploadService(BaseFileService):
    """Service for file upload operations"""
    
    def upload_file(self, file: FileStorage, module_id: str, user_id: str, 
                   title: str = None, description: str = None) -> Dict:
        """Upload a file to a module"""
        # Verify module exists and user has access
        module = self.module_repo.get_by_id(module_id)
        if not module:
            raise NotFoundError("Module not found")
        
        # Check user has access to the course
        course = self.course_repo.get_by_id(module.course_id)
        if not self._check_course_access(course, user_id):
            raise AuthorizationError("Not authorized to upload to this module")
        
        # Validate file
        if not file or not file.filename:
            raise ValidationError("No file provided")
        
        # Generate secure filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        
        if file_extension not in self.config.ALLOWED_EXTENSIONS:
            raise ValidationError(f"File type not allowed. Allowed types: {', '.join(self.config.ALLOWED_EXTENSIONS)}")
        
        # Generate unique filename for storage
        file_id = str(uuid.uuid4())
        storage_filename = f"{file_id}.{file_extension}"
        
        # Upload to S3
        try:
            s3_key = f"files/{module_id}/{storage_filename}"
            
            # Upload file to S3
            self.s3_client.upload_fileobj(
                file,
                self.config.S3_BUCKET_NAME,
                s3_key,
                ExtraArgs={
                    'ContentType': file.content_type or 'application/octet-stream',
                    'Metadata': {
                        'original_filename': original_filename,
                        'uploaded_by': str(user_id)
                    }
                }
            )
            
            # Create file record in database
            file_record = self.file_repo.create(
                id=file_id,
                module_id=module_id,
                title=title or original_filename,
                description=description,
                filename=original_filename,
                s3_key=s3_key,
                s3_bucket=self.config.S3_BUCKET_NAME,
                file_type=file_extension,
                file_size=file.content_length or 0,
                uploaded_by=user_id
            )
            
            # Queue for processing (embedding generation, etc.)
            process_file_async.delay(str(file_record.id))
            
            # Invalidate cache
            invalidate_cache(f"module:{module_id}:files")
            
            return file_record
            
        except Exception as e:
            # Clean up S3 if database creation fails
            try:
                self.s3_client.delete_object(Bucket=self.config.S3_BUCKET_NAME, Key=s3_key)
            except:
                pass
            raise FileProcessingError(f"Failed to upload file: {str(e)}")
    
    def reprocess_file(self, file_id: str, user_id: str) -> None:
        """Reprocess file for embeddings"""
        # Check access
        file = self._get_file_with_access_check(file_id, user_id)
        
        # Queue for reprocessing
        process_file_async.delay(str(file.id))
    
    def _get_file_with_access_check(self, file_id: str, user_id: str) -> Dict:
        """Get file with access verification"""
        file = self.file_repo.get_by_id(file_id)
        if not file:
            raise NotFoundError("File not found")
        
        # Check access through module and course
        module = self.module_repo.get_by_id(file.module_id)
        course = self.course_repo.get_by_id(module.course_id)
        
        if not self._check_course_access(course, user_id):
            raise AuthorizationError("Not authorized to access this file")
        
        return file
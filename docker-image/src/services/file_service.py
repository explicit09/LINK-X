from typing import List, Dict, Optional, Generator
import os
import uuid
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
import boto3
from datetime import datetime, timedelta

from ..repositories.file_repository import FileRepository
from ..repositories.module_repository import ModuleRepository  
from ..repositories.course_repository import CourseRepository
from ..core.exceptions import NotFoundError, ValidationError, FileProcessingError, AuthorizationError
from ..core.cache import cache, invalidate_cache
from ..config import Config
from ..tasks import process_file_async

class FileService:
    """Service for file-related business logic"""
    
    def __init__(self):
        self.file_repo = FileRepository()
        self.module_repo = ModuleRepository()
        self.course_repo = CourseRepository()
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
            region_name=Config.AWS_REGION
        )
    
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
        
        if file_extension not in Config.ALLOWED_EXTENSIONS:
            raise ValidationError(f"File type not allowed. Allowed types: {', '.join(Config.ALLOWED_EXTENSIONS)}")
        
        # Generate unique filename for storage
        file_id = str(uuid.uuid4())
        storage_filename = f"{file_id}.{file_extension}"
        
        # Upload to S3
        try:
            s3_key = f"files/{module_id}/{storage_filename}"
            
            # Upload file to S3
            self.s3_client.upload_fileobj(
                file,
                Config.S3_BUCKET,
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
                s3_bucket=Config.S3_BUCKET,
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
                self.s3_client.delete_object(Bucket=Config.S3_BUCKET, Key=s3_key)
            except:
                pass
            raise FileProcessingError(f"Failed to upload file: {str(e)}")
    
    def get_file_with_access_check(self, file_id: str, user_id: str) -> Dict:
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
    
    def get_file_for_download(self, file_id: str, user_id: str) -> tuple:
        """Get file for download"""
        file = self.get_file_with_access_check(file_id, user_id)
        
        # Generate presigned URL for S3 download
        try:
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': file.s3_bucket,
                    'Key': file.s3_key
                },
                ExpiresIn=3600  # 1 hour
            )
            
            # For now, return the URL and filename
            # In production, you might want to stream the file through your server
            return presigned_url, file.filename
            
        except Exception as e:
            raise FileProcessingError(f"Failed to generate download URL: {str(e)}")
    
    def get_file_preview_url(self, file_id: str, user_id: str) -> str:
        """Get file preview URL"""
        file = self.get_file_with_access_check(file_id, user_id)
        
        # Check if file type supports preview
        preview_types = ['pdf', 'txt', 'doc', 'docx']
        if file.file_type not in preview_types:
            raise ValidationError("File type does not support preview")
        
        # Generate presigned URL for preview
        try:
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': file.s3_bucket,
                    'Key': file.s3_key,
                    'ResponseContentDisposition': 'inline'
                },
                ExpiresIn=1800  # 30 minutes
            )
            
            return presigned_url
            
        except Exception as e:
            raise FileProcessingError(f"Failed to generate preview URL: {str(e)}")
    
    def stream_personalized_content(self, file_id: str, user_id: str) -> Generator[str, None, None]:
        """Stream personalized content for a file"""
        file = self.get_file_with_access_check(file_id, user_id)
        
        # Check if personalized version exists
        personalized = self.file_repo.get_personalized_file(file_id, user_id)
        
        if personalized and personalized.processed:
            # Stream personalized content
            content = personalized.personalized_content
        else:
            # Queue for personalization if not exists
            if not personalized:
                self.file_repo.create_personalized_file(
                    user_id=user_id,
                    original_file_id=file_id
                )
                # Queue personalization task
                from ..tasks import personalize_file_async
                personalize_file_async.delay(file_id, user_id)
            
            # For now, stream original content
            content = file.extracted_text or "Content is being processed..."
        
        # Stream content in chunks
        chunk_size = 100  # characters
        for i in range(0, len(content), chunk_size):
            chunk = content[i:i + chunk_size]
            yield f'{{"type": "content", "data": "{chunk}"}}'
    
    def delete_file(self, file_id: str, user_id: str) -> bool:
        """Delete a file"""
        file = self.file_repo.get_by_id(file_id)
        if not file:
            raise NotFoundError("File not found")
        
        # Check authorization
        module = self.module_repo.get_by_id(file.module_id)
        course = self.course_repo.get_by_id(module.course_id)
        
        # Only instructor or admin can delete
        from ..repositories.user_repository import UserRepository
        user_repo = UserRepository()
        user = user_repo.get_by_id(user_id)
        
        if user.role.role_type != 'admin' and str(course.instructor_id) != str(user_id):
            raise AuthorizationError("Not authorized to delete this file")
        
        # Delete from S3
        try:
            self.s3_client.delete_object(
                Bucket=file.s3_bucket,
                Key=file.s3_key
            )
        except Exception as e:
            # Log error but continue with database deletion
            print(f"Failed to delete from S3: {e}")
        
        # Delete from database (will cascade to personalized files)
        success = self.file_repo.delete(file_id)
        
        # Invalidate cache
        if success:
            invalidate_cache(f"module:{file.module_id}:files")
        
        return success
    
    def get_module_files(self, module_id: str, user_id: str) -> List[Dict]:
        """Get all files in a module"""
        # Check access
        module = self.module_repo.get_by_id(module_id)
        if not module:
            raise NotFoundError("Module not found")
        
        course = self.course_repo.get_by_id(module.course_id)
        if not self._check_course_access(course, user_id):
            raise AuthorizationError("Not authorized to access this module")
        
        return self.file_repo.get_by_module(module_id)
    
    def search_files(self, query: str, user_id: str, course_id: str = None, 
                    file_type: str = None) -> List[Dict]:
        """Search files"""
        # Get accessible courses for the user
        from ..repositories.user_repository import UserRepository
        user_repo = UserRepository()
        user = user_repo.get_by_id(user_id)
        
        accessible_course_ids = []
        if user.role.role_type == 'admin':
            # Admin can search all files
            accessible_course_ids = None
        elif user.role.role_type == 'instructor':
            # Instructor can search their courses
            courses = self.course_repo.get_by_instructor(user_id)
            accessible_course_ids = [c.id for c in courses]
        else:  # Student
            # Student can search enrolled courses
            courses = self.course_repo.get_student_courses(user_id)
            accessible_course_ids = [c.id for c in courses]
        
        # Perform search
        return self.file_repo.search(
            query=query,
            course_ids=accessible_course_ids,
            course_id=course_id,
            file_type=file_type
        )
    
    def reprocess_file(self, file_id: str, user_id: str) -> None:
        """Trigger file reprocessing"""
        file = self.get_file_with_access_check(file_id, user_id)
        
        # Check authorization (only instructor or admin)
        from ..repositories.user_repository import UserRepository
        user_repo = UserRepository()
        user = user_repo.get_by_id(user_id)
        
        module = self.module_repo.get_by_id(file.module_id)
        course = self.course_repo.get_by_id(module.course_id)
        
        if user.role.role_type != 'admin' and str(course.instructor_id) != str(user_id):
            raise AuthorizationError("Not authorized to reprocess this file")
        
        # Queue for reprocessing
        process_file_async.delay(str(file.id), force=True)
    
    def _check_course_access(self, course: Dict, user_id: str) -> bool:
        """Check if user has access to a course"""
        from ..repositories.user_repository import UserRepository
        from ..repositories.enrollment_repository import EnrollmentRepository
        
        user_repo = UserRepository()
        user = user_repo.get_by_id(user_id)
        
        # Admin has access to all
        if user.role.role_type == 'admin':
            return True
        
        # Instructor has access to their courses
        if user.role.role_type == 'instructor' and str(course.instructor_id) == str(user_id):
            return True
        
        # Student needs to be enrolled
        if user.role.role_type == 'student':
            enrollment_repo = EnrollmentRepository()
            enrollment = enrollment_repo.get_by_student_course(user_id, course.id)
            return enrollment is not None
        
        return False
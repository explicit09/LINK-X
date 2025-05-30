"""Base file service with shared dependencies and utilities"""
import boto3
from repositories.file_repository import FileRepository
from repositories.module_repository import ModuleRepository  
from repositories.course_repository import CourseRepository
from core.config import get_config

class BaseFileService:
    """Base class for file service modules"""
    
    def __init__(self):
        self.file_repo = FileRepository()
        self.module_repo = ModuleRepository()
        self.course_repo = CourseRepository()
        
        # Get config instance
        self.config = get_config()
        
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=self.config.AWS_SECRET_ACCESS_KEY,
            region_name=self.config.AWS_REGION
        )
    
    def _check_course_access(self, course, user_id: str) -> bool:
        """Check if user has access to course"""
        if not course:
            return False
        
        # Handle both dict and SQLAlchemy model objects
        if hasattr(course, '__dict__'):
            # SQLAlchemy model object - use attribute access
            instructor_id = getattr(course, 'instructor_id', None)
            enrollments = getattr(course, 'enrollments', [])
        else:
            # Dictionary object - use dict access
            instructor_id = course.get('instructor_id')
            enrollments = course.get('enrollments', [])
        
        # Instructor access
        if str(instructor_id) == str(user_id):
            return True
        
        # Student access - check enrollments
        for enrollment in enrollments:
            enrollment_user_id = None
            if hasattr(enrollment, '__dict__'):
                # SQLAlchemy model object
                enrollment_user_id = getattr(enrollment, 'user_id', None) or getattr(enrollment, 'student_id', None)
            else:
                # Dictionary object
                enrollment_user_id = enrollment.get('user_id') or enrollment.get('student_id')
            
            if str(enrollment_user_id) == str(user_id):
                return True
        
        return False
    
    def _get_mimetype(self, file_type: str) -> str:
        """Get MIME type for file extension"""
        mime_types = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'mp4': 'video/mp4',
            'mp3': 'audio/mpeg'
        }
        return mime_types.get(file_type.lower(), 'application/octet-stream')
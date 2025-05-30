"""File access and retrieval service module"""
from typing import Dict, List
from core.exceptions import NotFoundError, ValidationError, FileProcessingError, AuthorizationError
from .base_service import BaseFileService

class FileAccessService(BaseFileService):
    """Service for file access and retrieval operations"""
    
    def get_file_with_access_check(self, file_id: str, user_id: str) -> Dict:
        """Get file with access verification"""
        file = self.file_repo.get_by_id(file_id)
        if not file:
            raise NotFoundError("File not found")
        
        # Check access through module and course
        module = self.module_repo.get_by_id(file.module_id)
        course = self.course_repo.get_with_enrollments(module.course_id)
        
        if not self._check_course_access(course, user_id):
            raise AuthorizationError("Not authorized to access this file")
        
        return file
    
    def get_file_content(self, file_id: str, user_id: str) -> Dict:
        """Get file content for viewing"""
        # Check access
        file = self.get_file_with_access_check(file_id, user_id)
        
        # If file is stored in S3, generate presigned URL
        if file.storage_type == 's3' and file.s3_key:
            try:
                presigned_url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': file.s3_bucket,
                        'Key': file.s3_key
                    },
                    ExpiresIn=3600  # 1 hour
                )
                return {
                    'type': 'presigned',
                    'url': presigned_url
                }
            except Exception as e:
                raise FileProcessingError(f"Failed to generate file URL: {str(e)}")
        
        # For database-stored files
        elif file.file_data:
            return {
                'type': 'direct',
                'content': file.file_data,
                'mimetype': self._get_mimetype(file.file_type)
            }
        else:
            raise NotFoundError("File content not found")
    
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
    
    def get_module_files(self, module_id: str, user_id: str) -> List[Dict]:
        """Get all files for a module"""
        # Check module access
        module = self.module_repo.get_by_id(module_id)
        if not module:
            raise NotFoundError("Module not found")
        
        course = self.course_repo.get_with_enrollments(module.course_id)
        if not self._check_course_access(course, user_id):
            raise AuthorizationError("Not authorized to access this module")
        
        return self.file_repo.get_by_module_id(module_id)
"""
File service package providing comprehensive file management capabilities

This package includes:
- File upload and storage management
- File access control and retrieval
- Streaming and personalized content delivery
- File management operations (delete, search)
"""

from .base_service import BaseFileService
from .upload_service import FileUploadService
from .access_service import FileAccessService
from .streaming_service import FileStreamingService
from .management_service import FileManagementService

class FileService(BaseFileService):
    """Unified file service combining all file operations"""
    
    def __init__(self):
        super().__init__()
        self.upload_service = FileUploadService()
        self.access_service = FileAccessService()
        self.streaming_service = FileStreamingService()
        self.management_service = FileManagementService()
    
    # Upload operations
    def upload_file(self, file, module_id, user_id, title=None, description=None):
        return self.upload_service.upload_file(file, module_id, user_id, title, description)
    
    def reprocess_file(self, file_id, user_id):
        return self.upload_service.reprocess_file(file_id, user_id)
    
    # Access operations
    def get_file_with_access_check(self, file_id, user_id):
        return self.access_service.get_file_with_access_check(file_id, user_id)
    
    def get_file_content(self, file_id, user_id):
        return self.access_service.get_file_content(file_id, user_id)
    
    def get_file_for_download(self, file_id, user_id):
        return self.access_service.get_file_for_download(file_id, user_id)
    
    def get_file_preview_url(self, file_id, user_id):
        return self.access_service.get_file_preview_url(file_id, user_id)
    
    def get_module_files(self, module_id, user_id):
        return self.access_service.get_module_files(module_id, user_id)
    
    # Streaming operations
    def stream_personalized_content(self, file_id, user_id):
        return self.streaming_service.stream_personalized_content(file_id, user_id)
    
    # Management operations
    def delete_file(self, file_id, user_id):
        return self.management_service.delete_file(file_id, user_id)
    
    def search_files(self, query, user_id, course_id=None, file_type=None, limit=50):
        return self.management_service.search_files(query, user_id, course_id, file_type, limit)

__all__ = [
    'FileService',
    'BaseFileService',
    'FileUploadService',
    'FileAccessService', 
    'FileStreamingService',
    'FileManagementService'
]
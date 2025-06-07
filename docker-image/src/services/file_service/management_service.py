"""File management service module"""
from typing import List, Dict, Optional
from core.exceptions import NotFoundError, AuthorizationError, FileProcessingError
from core.cache import invalidate_cache
from .base_service import BaseFileService

class FileManagementService(BaseFileService):
    """Service for file management operations"""
    
    def delete_file(self, file_id: str, user_id: str) -> bool:
        """Delete a file"""
        # Check access
        file = self._get_file_with_access_check(file_id, user_id)
        
        try:
            # Delete from Supabase Storage if stored there
            if file.storage_type in ['supabase', 's3'] and file.storage_path:
                self.supabase.storage.from_(self.bucket_name).remove([file.storage_path])
            
            # Delete from database
            self.file_repo.delete(file_id)
            
            # Invalidate cache
            invalidate_cache(f"module:{file.module_id}:files")
            
            return True
            
        except Exception as e:
            raise FileProcessingError(f"Failed to delete file: {str(e)}")
    
    def search_files(self, query: str, user_id: str, course_id: str = None, 
                    file_type: str = None, limit: int = 50) -> List[Dict]:
        """Search files with access control"""
        # Get user's accessible courses
        accessible_courses = self._get_user_courses(user_id)
        
        # Filter by specific course if provided
        if course_id:
            if course_id not in [course['id'] for course in accessible_courses]:
                raise AuthorizationError("Not authorized to search in this course")
            accessible_courses = [course for course in accessible_courses if course['id'] == course_id]
        
        # Search files
        results = self.file_repo.search_files(
            query=query,
            course_ids=[course['id'] for course in accessible_courses],
            file_type=file_type,
            limit=limit
        )
        
        return results
    
    def _get_file_with_access_check(self, file_id: str, user_id: str) -> dict:
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
    
    def _get_user_courses(self, user_id: str) -> List[Dict]:
        """Get courses accessible to user"""
        # This would typically be handled by a course service
        # For now, return courses from repository
        return self.course_repo.get_courses_for_user(user_id)
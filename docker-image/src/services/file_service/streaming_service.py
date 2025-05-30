"""File streaming and personalization service module"""
from typing import Generator
from core.exceptions import NotFoundError, FileProcessingError
from .base_service import BaseFileService

class FileStreamingService(BaseFileService):
    """Service for file streaming and personalized content"""
    
    def stream_personalized_content(self, file_id: str, user_id: str) -> Generator[str, None, None]:
        """Stream personalized content based on user's learning profile"""
        # Check access
        file = self._get_file_with_access_check(file_id, user_id)
        
        # Get user profile for personalization
        user_profile = self._get_user_profile(user_id)
        
        # Stream content with personalization
        try:
            # This is a simplified version - in reality you'd:
            # 1. Retrieve file content from S3 or database
            # 2. Process it based on user's learning style
            # 3. Apply personalization algorithms
            # 4. Stream in chunks
            
            yield f"Loading personalized content for {file.title}..."
            yield f"Adapting to your learning style: {user_profile.get('learning_style', 'default')}..."
            
            # Mock streaming content
            content_chunks = self._get_file_chunks(file)
            for chunk in content_chunks:
                personalized_chunk = self._personalize_content(chunk, user_profile)
                yield personalized_chunk
                
        except Exception as e:
            raise FileProcessingError(f"Failed to stream content: {str(e)}")
    
    def _get_file_with_access_check(self, file_id: str, user_id: str) -> dict:
        """Get file with access verification"""
        file = self.file_repo.get_by_id(file_id)
        if not file:
            raise NotFoundError("File not found")
        
        # Check access through module and course
        module = self.module_repo.get_by_id(file.module_id)
        course = self.course_repo.get_by_id(module.course_id)
        
        if not self._check_course_access(course, user_id):
            raise NotFoundError("File not found")  # Don't reveal unauthorized access
        
        return file
    
    def _get_user_profile(self, user_id: str) -> dict:
        """Get user learning profile"""
        # This would typically fetch from user service or database
        # For now, return default profile
        return {
            'learning_style': 'visual',
            'depth_preference': 'intermediate',
            'interests': []
        }
    
    def _get_file_chunks(self, file: dict) -> Generator[str, None, None]:
        """Get file content in chunks"""
        # This would retrieve actual file content and chunk it
        # For now, return mock chunks
        chunks = [
            "Introduction to the topic...",
            "Key concepts and definitions...",
            "Detailed examples and case studies...",
            "Summary and conclusions..."
        ]
        
        for chunk in chunks:
            yield chunk
    
    def _personalize_content(self, content: str, profile: dict) -> str:
        """Apply personalization to content based on user profile"""
        # This would apply actual personalization algorithms
        # For now, just add a personalization note
        learning_style = profile.get('learning_style', 'default')
        
        if learning_style == 'visual':
            return f"📊 {content}"
        elif learning_style == 'auditory':
            return f"🎧 {content}"
        elif learning_style == 'kinesthetic':
            return f"🎯 {content}"
        else:
            return content
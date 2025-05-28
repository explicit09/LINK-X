from typing import Dict, List, Generator, Optional
import json
import time
from datetime import datetime

from ..repositories.file_repository import FileRepository
from ..repositories.course_repository import CourseRepository
from ..repositories.user_repository import UserRepository
from ..core.exceptions import NotFoundError, AuthorizationError
from ..core.cache import cache
from .ai_service import AIService

class StreamingService:
    """Service for streaming content and personalization"""
    
    def __init__(self):
        self.file_repo = FileRepository()
        self.course_repo = CourseRepository()
        self.user_repo = UserRepository()
        self.ai_service = AIService()
    
    def get_document_outline(self, file_id: str, user_id: str) -> Dict:
        """Get document outline for streaming interface"""
        # Verify access
        file = self._verify_file_access(file_id, user_id)
        
        # Check cache first
        cache_key = f"outline:{file_id}"
        cached_outline = cache.get(cache_key)
        if cached_outline:
            return cached_outline
        
        # Generate outline from file content
        outline = self.ai_service.generate_outline(file.extracted_text or "")
        
        # Cache for 1 hour
        cache.set(cache_key, outline, timeout=3600)
        
        return outline
    
    def stream_personalized_content(self, file_id: str, user_id: str, 
                                  learning_style: str = 'default') -> Generator[Dict, None, None]:
        """Stream personalized learning content"""
        # Verify access
        file = self._verify_file_access(file_id, user_id)
        
        # Get user profile for personalization
        user = self.user_repo.get_with_profile(user_id)
        student_profile = user.student_profile if user.role.role_type == 'student' else None
        
        # Get or create personalized file
        personalized = self.file_repo.get_personalized_file(file_id, user_id)
        
        if not personalized or not personalized.processed:
            # Generate personalized content on the fly
            yield {
                'type': 'status',
                'message': 'Generating personalized content...'
            }
            
            # Stream the personalization process
            content_chunks = self._generate_personalized_chunks(
                file.extracted_text or "",
                student_profile,
                learning_style
            )
            
            for chunk in content_chunks:
                yield chunk
                time.sleep(0.05)  # Simulate streaming delay
        else:
            # Stream existing personalized content
            content = json.loads(personalized.personalized_content)
            for section in content.get('sections', []):
                yield {
                    'type': 'section',
                    'data': section
                }
                time.sleep(0.05)
    
    def stream_section_content(self, file_id: str, section_id: str, user_id: str,
                             include_examples: bool = True) -> Generator[Dict, None, None]:
        """Stream specific section content with optional examples"""
        # Verify access
        file = self._verify_file_access(file_id, user_id)
        
        # Get section content
        section_content = self._get_section_content(file, section_id)
        
        if not section_content:
            yield {'type': 'error', 'message': 'Section not found'}
            return
        
        # Stream main content
        yield {
            'type': 'content',
            'data': section_content['main']
        }
        
        # Stream examples if requested
        if include_examples:
            user = self.user_repo.get_with_profile(user_id)
            examples = self.ai_service.generate_examples(
                section_content['main'],
                user.student_profile if user.role.role_type == 'student' else None
            )
            
            for example in examples:
                yield {
                    'type': 'example',
                    'data': example
                }
                time.sleep(0.1)
    
    def generate_quiz_questions(self, file_id: str, user_id: str, 
                              difficulty: str = 'medium', count: int = 5) -> Generator[Dict, None, None]:
        """Generate quiz questions based on file content"""
        # Verify access
        file = self._verify_file_access(file_id, user_id)
        
        # Generate questions
        questions = self.ai_service.generate_quiz(
            file.extracted_text or "",
            difficulty=difficulty,
            count=count
        )
        
        for i, question in enumerate(questions):
            yield {
                'type': 'question',
                'number': i + 1,
                'data': question
            }
            time.sleep(0.2)
    
    def generate_summary(self, file_id: str, user_id: str, 
                        summary_type: str = 'brief') -> Generator[Dict, None, None]:
        """Generate content summary"""
        # Verify access
        file = self._verify_file_access(file_id, user_id)
        
        # Start summary generation
        yield {
            'type': 'status',
            'message': f'Generating {summary_type} summary...'
        }
        
        # Generate summary based on type
        if summary_type == 'brief':
            summary = self.ai_service.generate_brief_summary(file.extracted_text or "")
        elif summary_type == 'detailed':
            summary = self.ai_service.generate_detailed_summary(file.extracted_text or "")
        else:
            summary = self.ai_service.generate_key_points(file.extracted_text or "")
        
        # Stream summary sections
        for section in summary:
            yield {
                'type': 'summary',
                'data': section
            }
            time.sleep(0.1)
    
    def update_progress(self, file_id: str, section_id: str, user_id: str, 
                       progress: float) -> Dict:
        """Update user's learning progress"""
        # Verify access
        self._verify_file_access(file_id, user_id)
        
        # Store progress
        progress_key = f"progress:{user_id}:{file_id}:{section_id}"
        progress_data = {
            'progress': progress,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        cache.set(progress_key, progress_data, timeout=86400 * 30)  # 30 days
        
        # Calculate overall file progress
        overall_progress = self._calculate_overall_progress(file_id, user_id)
        
        return {
            'section_progress': progress,
            'overall_progress': overall_progress
        }
    
    def _verify_file_access(self, file_id: str, user_id: str) -> Dict:
        """Verify user has access to file"""
        file = self.file_repo.get_by_id(file_id)
        if not file:
            raise NotFoundError("File not found")
        
        # Check course access
        from ..repositories.module_repository import ModuleRepository
        module_repo = ModuleRepository()
        module = module_repo.get_by_id(file.module_id)
        
        course = self.course_repo.get_by_id(module.course_id)
        
        # Verify access based on role
        user = self.user_repo.get_by_id(user_id)
        
        if user.role.role_type == 'admin':
            return file
        
        if user.role.role_type == 'instructor':
            if str(course.instructor_id) != str(user_id):
                raise AuthorizationError("Access denied")
        else:  # Student
            from ..repositories.enrollment_repository import EnrollmentRepository
            enrollment_repo = EnrollmentRepository()
            enrollment = enrollment_repo.get_by_student_course(user_id, course.id)
            if not enrollment:
                raise AuthorizationError("Not enrolled in course")
        
        return file
    
    def _generate_personalized_chunks(self, content: str, profile: Optional[Dict], 
                                    learning_style: str) -> Generator[Dict, None, None]:
        """Generate personalized content chunks"""
        # Split content into sections
        sections = self.ai_service.split_into_sections(content)
        
        for i, section in enumerate(sections):
            # Personalize each section
            personalized = self.ai_service.personalize_content(
                section,
                profile=profile,
                learning_style=learning_style
            )
            
            yield {
                'type': 'section',
                'number': i + 1,
                'data': personalized
            }
    
    def _get_section_content(self, file: Dict, section_id: str) -> Optional[Dict]:
        """Get specific section content from file"""
        # This would normally parse the file content to find the section
        # For now, return mock data
        return {
            'main': f"Content for section {section_id}",
            'metadata': {
                'section_id': section_id,
                'file_id': str(file.id)
            }
        }
    
    def _calculate_overall_progress(self, file_id: str, user_id: str) -> float:
        """Calculate overall progress for a file"""
        # Get all progress entries for this file
        # This is simplified - in production you'd track all sections
        pattern = f"progress:{user_id}:{file_id}:*"
        
        # For now, return a mock value
        return 0.0
"""
Service Layer Interfaces
Defines contracts for all service implementations
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Protocol
from datetime import datetime

from db.schema import User, Course, Module, File, Enrollment, Todo


class AuthServiceInterface(Protocol):
    """Authentication service interface"""
    
    @abstractmethod
    def authenticate_supabase(self, access_token: str, version: str = 'v1') -> Dict[str, Any]:
        """Authenticate user with Supabase access token"""
        ...
    
    @abstractmethod
    def authenticate_email_password(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate with email and password (v1 legacy support)"""
        ...
    
    @abstractmethod
    def create_user(self, email: str, role: str, supabase_uid: Optional[str] = None,
                    password: Optional[str] = None, name: Optional[str] = None,
                    version: str = 'v1') -> Dict[str, Any]:
        """Create a new user"""
        ...
    
    @abstractmethod
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token (v2 only)"""
        ...
    
    @abstractmethod
    def logout(self, user_id: str, access_token_jti: Optional[str] = None,
               refresh_token: Optional[str] = None) -> None:
        """Logout user and invalidate tokens"""
        ...
    
    @abstractmethod
    def verify_token(self, token: str, version: str = 'v1') -> Dict[str, Any]:
        """Verify token validity"""
        ...


class CourseServiceInterface(Protocol):
    """Course management service interface"""
    
    @abstractmethod
    def create_course(self, name: str, description: str, instructor_id: str,
                      access_code: Optional[str] = None) -> Course:
        """Create a new course"""
        ...
    
    @abstractmethod
    def get_course(self, course_id: str, user_id: Optional[str] = None) -> Optional[Course]:
        """Get course by ID with optional access check"""
        ...
    
    @abstractmethod
    def get_courses_for_user(self, user_id: str, role: str) -> List[Course]:
        """Get all courses for a user based on their role"""
        ...
    
    @abstractmethod
    def update_course(self, course_id: str, user_id: str, **kwargs) -> Optional[Course]:
        """Update course details"""
        ...
    
    @abstractmethod
    def delete_course(self, course_id: str, user_id: str) -> bool:
        """Delete a course"""
        ...
    
    @abstractmethod
    def enroll_student(self, course_id: str, student_id: str, 
                       access_code: Optional[str] = None) -> bool:
        """Enroll a student in a course"""
        ...
    
    @abstractmethod
    def unenroll_student(self, course_id: str, student_id: str) -> bool:
        """Remove a student from a course"""
        ...
    
    @abstractmethod
    def get_course_statistics(self, course_id: str) -> Dict[str, Any]:
        """Get course statistics (enrollment count, completion rate, etc.)"""
        ...


class FileServiceInterface(Protocol):
    """File management service interface"""
    
    @abstractmethod
    def upload_file(self, file_data: bytes, filename: str, course_id: str,
                    module_id: Optional[str] = None, user_id: Optional[str] = None) -> File:
        """Upload a file to storage"""
        ...
    
    @abstractmethod
    def get_file(self, file_id: str, user_id: Optional[str] = None) -> Optional[File]:
        """Get file metadata"""
        ...
    
    @abstractmethod
    def get_file_content(self, file_id: str, user_id: Optional[str] = None) -> Optional[bytes]:
        """Get actual file content"""
        ...
    
    @abstractmethod
    def delete_file(self, file_id: str, user_id: str) -> bool:
        """Delete a file"""
        ...
    
    @abstractmethod
    def process_file(self, file_id: str) -> bool:
        """Process file for content extraction and embedding"""
        ...
    
    @abstractmethod
    def search_files(self, query: str, course_id: Optional[str] = None,
                     limit: int = 10) -> List[Dict[str, Any]]:
        """Search files by content"""
        ...


class ModuleServiceInterface(Protocol):
    """Module management service interface"""
    
    @abstractmethod
    def create_module(self, course_id: str, name: str, description: str,
                      order: int = 0) -> Module:
        """Create a new module in a course"""
        ...
    
    @abstractmethod
    def get_module(self, module_id: str, user_id: Optional[str] = None) -> Optional[Module]:
        """Get module by ID"""
        ...
    
    @abstractmethod
    def get_modules_for_course(self, course_id: str, user_id: Optional[str] = None) -> List[Module]:
        """Get all modules for a course"""
        ...
    
    @abstractmethod
    def update_module(self, module_id: str, user_id: str, **kwargs) -> Optional[Module]:
        """Update module details"""
        ...
    
    @abstractmethod
    def delete_module(self, module_id: str, user_id: str) -> bool:
        """Delete a module"""
        ...
    
    @abstractmethod
    def reorder_modules(self, course_id: str, module_orders: Dict[str, int]) -> bool:
        """Reorder modules within a course"""
        ...


class AIServiceInterface(Protocol):
    """AI/ML service interface"""
    
    @abstractmethod
    def generate_completion(self, prompt: str, context: Optional[str] = None,
                            max_tokens: int = 2000, temperature: float = 0.7) -> str:
        """Generate text completion using AI model"""
        ...
    
    @abstractmethod
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for texts"""
        ...
    
    @abstractmethod
    def generate_summary(self, text: str, max_length: int = 500) -> str:
        """Generate summary of text"""
        ...
    
    @abstractmethod
    def generate_questions(self, text: str, num_questions: int = 5) -> List[Dict[str, str]]:
        """Generate study questions from text"""
        ...
    
    @abstractmethod
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text"""
        ...


class StreamingServiceInterface(Protocol):
    """Content streaming service interface"""
    
    @abstractmethod
    async def stream_content(self, content_id: str, user_id: str,
                             personalization_params: Optional[Dict[str, Any]] = None):
        """Stream content with personalization"""
        ...
    
    @abstractmethod
    async def stream_chat_response(self, message: str, conversation_id: str,
                                   user_id: str, context: Optional[Dict[str, Any]] = None):
        """Stream chat response"""
        ...
    
    @abstractmethod
    def get_streaming_metrics(self, session_id: str) -> Dict[str, Any]:
        """Get metrics for a streaming session"""
        ...


class TodoServiceInterface(Protocol):
    """Todo management service interface"""
    
    @abstractmethod
    def create_todo(self, user_id: str, title: str, description: Optional[str] = None,
                    due_date: Optional[datetime] = None, priority: str = 'medium') -> Todo:
        """Create a new todo item"""
        ...
    
    @abstractmethod
    def get_todo(self, todo_id: str, user_id: str) -> Optional[Todo]:
        """Get todo by ID"""
        ...
    
    @abstractmethod
    def get_todos_for_user(self, user_id: str, status: Optional[str] = None,
                           limit: int = 50) -> List[Todo]:
        """Get all todos for a user"""
        ...
    
    @abstractmethod
    def update_todo(self, todo_id: str, user_id: str, **kwargs) -> Optional[Todo]:
        """Update todo item"""
        ...
    
    @abstractmethod
    def delete_todo(self, todo_id: str, user_id: str) -> bool:
        """Delete todo item"""
        ...
    
    @abstractmethod
    def mark_complete(self, todo_id: str, user_id: str) -> Optional[Todo]:
        """Mark todo as complete"""
        ...


class AdminServiceInterface(Protocol):
    """Admin service interface"""
    
    @abstractmethod
    def get_system_stats(self) -> Dict[str, Any]:
        """Get system-wide statistics"""
        ...
    
    @abstractmethod
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for a specific user"""
        ...
    
    @abstractmethod
    def get_course_analytics(self, course_id: str) -> Dict[str, Any]:
        """Get detailed analytics for a course"""
        ...
    
    @abstractmethod
    def cleanup_orphaned_files(self) -> int:
        """Clean up files not associated with any course/module"""
        ...
    
    @abstractmethod
    def reprocess_all_files(self) -> Dict[str, Any]:
        """Reprocess all files for embeddings"""
        ...
    
    @abstractmethod
    def export_course_data(self, course_id: str, format: str = 'json') -> bytes:
        """Export course data in specified format"""
        ...
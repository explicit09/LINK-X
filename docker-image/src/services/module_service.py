from typing import Dict, List
from ..repositories.module_repository import ModuleRepository
from ..repositories.course_repository import CourseRepository
from ..repositories.user_repository import UserRepository
from ..core.exceptions import NotFoundError, ValidationError, AuthorizationError

class ModuleService:
    """Service for module-related business logic"""
    
    def __init__(self):
        self.module_repo = ModuleRepository()
        self.course_repo = CourseRepository()
        self.user_repo = UserRepository()
    
    def get_module_with_access_check(self, module_id: str, user_id: str) -> Dict:
        """Get module details with access verification"""
        module = self.module_repo.get_by_id(module_id)
        
        if not module:
            raise NotFoundError("Module not found")
        
        # Get course to check access
        course = self.course_repo.get_by_id(module.course_id)
        if not course:
            raise NotFoundError("Course not found")
        
        # Check access based on user role
        user = self.user_repo.get_by_id(user_id)
        
        if user.role.role_type == 'admin':
            # Admin has access to all modules
            return module
        elif user.role.role_type == 'instructor':
            # Instructor has access to their own courses
            if str(course.instructor_id) != str(user_id):
                raise AuthorizationError("Access denied")
        else:  # Student
            # Check if student is enrolled
            from ..repositories.enrollment_repository import EnrollmentRepository
            enrollment_repo = EnrollmentRepository()
            enrollment = enrollment_repo.get_by_student_course(user_id, course.id)
            if not enrollment and not course.published:
                raise AuthorizationError("Access denied")
        
        return module
    
    def update_module(self, module_id: str, user_id: str, **kwargs) -> Dict:
        """Update module details"""
        module = self.module_repo.get_by_id(module_id)
        
        if not module:
            raise NotFoundError("Module not found")
        
        # Check authorization through course
        course = self.course_repo.get_by_id(module.course_id)
        user = self.user_repo.get_by_id(user_id)
        
        # Allow all authenticated users to update modules
        # You can add more specific logic here if needed
        
        # Validate updates
        if 'title' in kwargs and len(kwargs['title']) < 3:
            raise ValidationError("Title must be at least 3 characters")
        
        # Update module
        updated_module = self.module_repo.update(module_id, **kwargs)
        
        return updated_module
    
    def delete_module(self, module_id: str, user_id: str) -> bool:
        """Delete a module"""
        module = self.module_repo.get_by_id(module_id)
        
        if not module:
            raise NotFoundError("Module not found")
        
        # Check authorization through course
        course = self.course_repo.get_by_id(module.course_id)
        user = self.user_repo.get_by_id(user_id)
        
        # Allow all authenticated users to delete modules
        # You can add more specific logic here if needed
        
        # Check if module has files
        from ..repositories.file_repository import FileRepository
        file_repo = FileRepository()
        files = file_repo.get_by_module(module_id)
        if files:
            raise ValidationError("Cannot delete module with files. Delete files first.")
        
        # Delete module
        success = self.module_repo.delete(module_id)
        
        return success
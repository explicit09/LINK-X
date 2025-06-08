from typing import Dict, List
from repositories.module_repository import ModuleRepository
from repositories.course_repository import CourseRepository
from repositories.user_repository import UserRepository
from core.exceptions import NotFoundError, ValidationError, PermissionError

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
                raise PermissionError("Access denied")
        else:  # Student
            # Check if student is enrolled
            from repositories.enrollment_repository import EnrollmentRepository
            enrollment_repo = EnrollmentRepository()
            enrollment = enrollment_repo.get_by_student_course(user_id, course.id)
            if not enrollment and not course.published:
                raise PermissionError("Access denied")
        
        return module
    
    def create_module(self, course_id: str, title: str, description: str = None, ordering: int = None) -> Dict:
        """Create a new module in a course"""
        # Validate input
        if not title or len(title) < 3:
            raise ValidationError("Module title must be at least 3 characters")
        
        # Check if course exists
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundError("Course not found")
        
        # Create module
        module = self.module_repo.create(
            course_id=course_id,
            title=title,
            description=description,
            ordering=ordering
        )
        
        return module
    
    def update_module(self, module_id: str, user_id: str, **kwargs) -> Dict:
        """Update module details"""
        module = self.module_repo.get_by_id(module_id)
        
        if not module:
            raise NotFoundError("Module not found")
        
        # Check authorization through course
        course = self.course_repo.get_by_id(module.course_id)
        user = self.user_repo.get_by_id(user_id)
        
        # Check if user owns the course or is admin
        is_owner = str(course.creator_id) == str(user_id)
        is_admin = user.role and user.role.role_type == 'admin'
        
        if not is_owner and not is_admin:
            raise PermissionError("Only course owner or admin can update modules")
        
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
        
        # Check if user owns the course or is admin
        is_owner = str(course.creator_id) == str(user_id)
        is_admin = user.role and user.role.role_type == 'admin'
        
        if not is_owner and not is_admin:
            raise PermissionError("Only course owner or admin can delete modules")
        
        # Check if module has files
        from repositories.file_repository import FileRepository
        file_repo = FileRepository()
        files = file_repo.get_by_module(module_id)
        if files:
            raise ValidationError("Cannot delete module with files. Delete files first.")
        
        # Delete module
        success = self.module_repo.delete(module_id)
        
        return success
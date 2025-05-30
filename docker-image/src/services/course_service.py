from typing import List, Dict, Optional
from datetime import datetime
import secrets

from repositories.course_repository import CourseRepository
from repositories.user_repository import UserRepository
from repositories.enrollment_repository import EnrollmentRepository
from core.exceptions import NotFoundError, ValidationError, AuthorizationError
from core.cache import cache, invalidate_cache

class CourseService:
    """Service for course-related business logic"""
    
    def __init__(self):
        self.course_repo = CourseRepository()
        self.user_repo = UserRepository()
        self.enrollment_repo = EnrollmentRepository()
    
    def get_course_with_access_check(self, course_id: str, user_id: str) -> Dict:
        """Get course details with access verification"""
        print(f"[ACCESS CHECK] Course ID: {course_id}, User ID: {user_id}")
        course = self.course_repo.get_with_modules(course_id)
        
        if not course:
            raise NotFoundError("Course not found")
        
        print(f"[ACCESS CHECK] Course found: {course.title}, Published: {course.published}, Instructor: {course.instructor_id}")
        
        # Check access based on user role
        # Re-fetch user to ensure we have a fresh instance with relationships loaded
        user = self.user_repo.get_by_id(user_id)
        
        if not user:
            raise AuthorizationError("User not found")
        
        print(f"[ACCESS CHECK] User found: {user.email}, Role: {user.role.role_type if user.role else 'No role'}")
            
        if user.role.role_type == 'admin':
            # Admin has access to all courses
            return course
        elif user.role.role_type == 'instructor':
            # Instructor has access to their own courses
            if str(course.instructor_id) != str(user_id):
                raise AuthorizationError("Access denied")
        else:  # Student
            # Check if student is enrolled
            enrollment = self.enrollment_repo.get_by_student_course(user_id, course_id)
            print(f"[ACCESS CHECK] Student enrollment check: {enrollment is not None}")
            if not enrollment and course.published:
                # Allow viewing published courses
                pass
            elif not enrollment:
                raise AuthorizationError("Access denied")
        
        return course
    
    def check_course_access(self, course_id: str, user_id: str) -> bool:
        """Check if user has access to a course"""
        try:
            self.get_course_with_access_check(course_id, user_id)
            return True
        except (NotFoundError, AuthorizationError):
            return False
    
    def get_student_courses(self, student_id: str, page: int = 1, limit: int = 20) -> List[Dict]:
        """Get courses a student is enrolled in"""
        return self.course_repo.get_student_courses(
            student_id=student_id,
            offset=(page - 1) * limit,
            limit=limit
        )
    
    def get_instructor_courses(self, instructor_id: str, page: int = 1, limit: int = 20) -> List[Dict]:
        """Get courses created by an instructor"""
        return self.course_repo.get_by_instructor(
            instructor_id=instructor_id,
            offset=(page - 1) * limit,
            limit=limit
        )
    
    def get_all_courses(self, page: int = 1, limit: int = 20) -> List[Dict]:
        """Get all courses (admin only)"""
        return self.course_repo.get_all_paginated(
            offset=(page - 1) * limit,
            limit=limit
        )
    
    def create_course(self, instructor_id: str, title: str, description: str, 
                     category: str = None, tags: List[str] = None) -> Dict:
        """Create a new course"""
        # Validate user exists
        user = self.user_repo.get_by_id(instructor_id)
        if not user:
            raise ValidationError("Invalid user")
        # Allow all authenticated users to create courses
        
        # Validate input
        if not title or len(title) < 3:
            raise ValidationError("Title must be at least 3 characters")
        
        if not description or len(description) < 10:
            raise ValidationError("Description must be at least 10 characters")
        
        # Create course
        course = self.course_repo.create(
            title=title,
            description=description,
            instructor_id=instructor_id,
            category=category,
            tags=tags or [],
            published=False
        )
        
        # Generate access code
        access_code = self._generate_access_code(course.id)
        
        # Invalidate cache
        invalidate_cache(f"courses:instructor:{instructor_id}:*")
        
        return course
    
    def update_course(self, course_id: str, user_id: str, **kwargs) -> Dict:
        """Update course details"""
        course = self.course_repo.get_by_id(course_id)
        
        if not course:
            raise NotFoundError("Course not found")
        
        # Allow all authenticated users to update courses
        user = self.user_repo.get_by_id(user_id)
        # You can add more specific logic here if needed
        
        # Validate updates
        if 'title' in kwargs and len(kwargs['title']) < 3:
            raise ValidationError("Title must be at least 3 characters")
        
        if 'description' in kwargs and len(kwargs['description']) < 10:
            raise ValidationError("Description must be at least 10 characters")
        
        # Update course
        updated_course = self.course_repo.update(course_id, **kwargs)
        
        # Invalidate cache
        invalidate_cache(f"courses:{course_id}:*")
        invalidate_cache(f"courses:instructor:{course.instructor_id}:*")
        
        return updated_course
    
    def delete_course(self, course_id: str, user_id: str) -> bool:
        """Delete a course"""
        course = self.course_repo.get_by_id(course_id)
        
        if not course:
            raise NotFoundError("Course not found")
        
        # Allow all authenticated users to delete courses
        user = self.user_repo.get_by_id(user_id)
        # You can add more specific logic here if needed
        
        # Check if course has enrollments
        enrollments = self.enrollment_repo.get_by_course(course_id)
        if enrollments:
            raise ValidationError("Cannot delete course with active enrollments")
        
        # Delete course (will cascade to modules and files)
        success = self.course_repo.delete(course_id)
        
        # Invalidate cache
        if success:
            invalidate_cache(f"courses:{course_id}:*")
            invalidate_cache(f"courses:instructor:{course.instructor_id}:*")
        
        return success
    
    def publish_course(self, course_id: str, user_id: str) -> Dict:
        """Publish a course"""
        course = self.course_repo.get_with_modules(course_id)
        
        if not course:
            raise NotFoundError("Course not found")
        
        # Allow all authenticated users to publish courses
        user = self.user_repo.get_by_id(user_id)
        # You can add more specific logic here if needed
        
        # Validate course is ready for publishing
        if not course.modules or len(course.modules) == 0:
            raise ValidationError("Course must have at least one module")
        
        # Check each module has at least one file
        for module in course.modules:
            if not module.files or len(module.files) == 0:
                raise ValidationError(f"Module '{module.title}' must have at least one file")
        
        # Publish course
        updated_course = self.course_repo.update(course_id, published=True, published_at=datetime.utcnow())
        
        # Invalidate cache
        invalidate_cache(f"courses:{course_id}:*")
        invalidate_cache("courses:public:*")
        
        return updated_course
    
    def get_course_modules(self, course_id: str, user_id: str) -> List[Dict]:
        """Get all modules for a course"""
        # Check access
        self.get_course_with_access_check(course_id, user_id)
        
        return self.course_repo.get_modules(course_id)
    
    def create_module(self, course_id: str, user_id: str, title: str, 
                     description: str = None, order: int = None) -> Dict:
        """Create a new module in a course"""
        course = self.course_repo.get_by_id(course_id)
        
        if not course:
            raise NotFoundError("Course not found")
        
        # Check authorization - allow students, instructors, and admins
        user = self.user_repo.get_by_id(user_id)
        # For now, allow all authenticated users to create modules
        # You can add more specific logic here if needed
        
        # Validate input
        if not title or len(title) < 3:
            raise ValidationError("Module title must be at least 3 characters")
        
        # Determine order if not provided
        if order is None:
            existing_modules = self.course_repo.get_modules(course_id)
            order = len(existing_modules) + 1
        
        # Create module
        module = self.course_repo.create_module(
            course_id=course_id,
            title=title,
            description=description,
            order=order
        )
        
        # Invalidate cache
        invalidate_cache(f"courses:{course_id}:*")
        
        return module
    
    def enroll_student(self, course_id: str, student_id: str, access_code: str) -> Dict:
        """Enroll a student in a course"""
        course = self.course_repo.get_by_id(course_id)
        
        if not course:
            raise NotFoundError("Course not found")
        
        if not course.published:
            raise ValidationError("Course is not available for enrollment")
        
        # Verify access code
        stored_code = self.course_repo.get_access_code(course_id)
        if not stored_code or stored_code.code != access_code:
            raise ValidationError("Invalid access code")
        
        # Check if already enrolled
        existing = self.enrollment_repo.get_by_student_course(student_id, course_id)
        if existing:
            raise ValidationError("Already enrolled in this course")
        
        # Create enrollment
        enrollment = self.enrollment_repo.create(
            student_id=student_id,
            course_id=course_id
        )
        
        # Invalidate cache
        invalidate_cache(f"courses:student:{student_id}:*")
        
        return enrollment
    
    def get_course_statistics(self, course_id: str, user_id: str) -> Dict:
        """Get course statistics"""
        course = self.course_repo.get_by_id(course_id)
        
        if not course:
            raise NotFoundError("Course not found")
        
        # Check authorization
        user = self.user_repo.get_by_id(user_id)
        if user.role.role_type != 'admin' and str(course.instructor_id) != str(user_id):
            raise AuthorizationError("Not authorized to view course statistics")
        
        # Get statistics
        stats = {
            'total_students': self.enrollment_repo.count_by_course(course_id),
            'total_modules': len(self.course_repo.get_modules(course_id)),
            'total_files': self.course_repo.count_files(course_id),
            'completion_rate': self._calculate_completion_rate(course_id),
            'average_progress': self._calculate_average_progress(course_id)
        }
        
        return stats
    
    def _generate_access_code(self, course_id: str) -> str:
        """Generate unique access code for course"""
        code = secrets.token_urlsafe(6).upper()
        
        # Store in database
        self.course_repo.create_access_code(
            course_id=course_id,
            code=code
        )
        
        return code
    
    def _calculate_completion_rate(self, course_id: str) -> float:
        """Calculate course completion rate"""
        # Temporarily return 0 as Activity model doesn't exist
        return 0.0
        
        # from db.schema import Activity, Enrollment
        
        # # Get all enrolled students
        # enrollments = self.enrollment_repo.get_by_course(course_id)
        # if not enrollments:
        #     return 0.0
        
        # # Get course modules and files
        # course = self.course_repo.get_with_modules(course_id)
        # if not course or not course.modules:
        #     return 0.0
        
        # total_files = sum(len(module.files) for module in course.modules)
        # if total_files == 0:
        #     return 0.0
        
        # completed_students = 0
        
        # for enrollment in enrollments:
        #     # Count unique files viewed by this student
        #     viewed_files = self.db.query(Activity.metadata['file_id']).filter(
        #         Activity.user_id == enrollment.student_id,
        #         Activity.activity_type == 'file_view',
        #         Activity.metadata['course_id'].astext == course_id
        #     ).distinct().count()
            
        #     # Consider student completed if they viewed all files
        #     if viewed_files >= total_files:
        #         completed_students += 1
        
        # return (completed_students / len(enrollments)) * 100 if enrollments else 0.0
    
    def _calculate_average_progress(self, course_id: str) -> float:
        """Calculate average student progress"""
        # Temporarily return 0 as Activity model doesn't exist
        return 0.0
        
        # from db.schema import Activity, Enrollment
        
        # # Get all enrolled students
        # enrollments = self.enrollment_repo.get_by_course(course_id)
        # if not enrollments:
        #     return 0.0
        
        # # Get course modules and files
        # course = self.course_repo.get_with_modules(course_id)
        # if not course or not course.modules:
        #     return 0.0
        
        # total_files = sum(len(module.files) for module in course.modules)
        # if total_files == 0:
        #     return 0.0
        
        # total_progress = 0.0
        
        # for enrollment in enrollments:
        #     # Count unique files viewed by this student
        #     viewed_files = self.db.query(Activity.metadata['file_id']).filter(
        #         Activity.user_id == enrollment.student_id,
        #         Activity.activity_type == 'file_view',
        #         Activity.metadata['course_id'].astext == course_id
        #     ).distinct().count()
            
        #     # Calculate individual progress
        #     student_progress = (viewed_files / total_files) * 100
        #     total_progress += student_progress
        
        # return total_progress / len(enrollments) if enrollments else 0.0
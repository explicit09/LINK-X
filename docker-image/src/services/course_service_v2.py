"""
Course Service V2
Implements CourseServiceInterface with dependency injection
"""

import logging
import secrets
from typing import List, Optional, Dict, Any
from datetime import datetime

from redis import Redis

from services.interfaces import CourseServiceInterface
from services.base_service import BaseService, track_performance, validate_input
from repositories.course_repository import CourseRepository
from repositories.enrollment_repository import EnrollmentRepository
from repositories.user_repository import UserRepository
from repositories.module_repository import ModuleRepository
from db.schema import Course, User, Enrollment
from core.exceptions import NotFoundError, ValidationError, UnauthorizedException

logger = logging.getLogger(__name__)


class CourseServiceV2(BaseService, CourseServiceInterface):
    """
    Course management service with interface implementation
    """
    
    def __init__(self, 
                 course_repo: CourseRepository,
                 enrollment_repo: EnrollmentRepository,
                 user_repo: UserRepository,
                 module_repo: ModuleRepository,
                 redis_client: Optional[Redis] = None):
        """
        Initialize course service with dependencies
        
        Args:
            course_repo: Course repository
            enrollment_repo: Enrollment repository
            user_repo: User repository
            module_repo: Module repository
            redis_client: Optional Redis client for caching
        """
        super().__init__(redis_client)
        self.course_repo = course_repo
        self.enrollment_repo = enrollment_repo
        self.user_repo = user_repo
        self.module_repo = module_repo
        
    @track_performance
    @validate_input(
        name=lambda x: x and len(x.strip()) > 0,
        instructor_id=lambda x: x and len(str(x)) > 0
    )
    def create_course(self, name: str, description: str, instructor_id: str,
                      access_code: Optional[str] = None) -> Course:
        """Create a new course"""
        logger.info(f"Creating course: {name} for instructor: {instructor_id}")
        
        # Validate instructor exists and has correct role
        instructor = self.user_repo.get_by_id(instructor_id)
        if not instructor:
            raise NotFoundError(f"Instructor {instructor_id} not found")
            
        if instructor.role.role_type not in ['instructor', 'admin']:
            raise ValidationError("User must be an instructor or admin to create courses")
            
        # Generate access code if not provided
        if not access_code:
            access_code = self._generate_access_code()
            
        # Create course
        course = self.course_repo.create(
            title=name.strip(),
            description=description.strip() if description else "",
            instructor_id=instructor_id,
            access_code=access_code,
            published=False,
            created_at=datetime.utcnow()
        )
        
        # Log action
        self._log_action(
            instructor_id, 
            "create_course",
            "course",
            course.course_id,
            {"name": name}
        )
        
        # Invalidate caches
        self._invalidate_cache(f"courses:user:{instructor_id}:*")
        
        return course
        
    @track_performance
    def get_course(self, course_id: str, user_id: Optional[str] = None) -> Optional[Course]:
        """Get course by ID with optional access check"""
        # Try cache first
        cache_key = self._cache_key("course", course_id, user_id)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
            
        # Get course with modules
        course = self.course_repo.get_with_modules(course_id)
        if not course:
            return None
            
        # Check access if user_id provided
        if user_id:
            if not self._can_access_course(course, user_id):
                raise UnauthorizedException(f"User {user_id} cannot access course {course_id}")
                
        # Cache result
        self._set_cached(cache_key, course, timeout=300)
        
        return course
        
    @track_performance
    def get_courses_for_user(self, user_id: str, role: str) -> List[Course]:
        """Get all courses for a user based on their role"""
        cache_key = self._cache_key("courses", "user", user_id, role)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
            
        courses = []
        
        if role == 'admin':
            # Admins see all courses
            courses = self.course_repo.get_all()
        elif role == 'instructor':
            # Instructors see their own courses
            courses = self.course_repo.get_by_instructor(user_id)
        elif role == 'student':
            # Students see enrolled courses
            enrollments = self.enrollment_repo.get_by_student(user_id)
            course_ids = [e.course_id for e in enrollments]
            if course_ids:
                courses = [self.course_repo.get_by_id(cid) for cid in course_ids]
                courses = [c for c in courses if c]  # Filter None values
        else:
            raise ValidationError(f"Invalid role: {role}")
            
        # Cache result
        self._set_cached(cache_key, courses, timeout=300)
        
        return courses
        
    @track_performance
    def update_course(self, course_id: str, user_id: str, **kwargs) -> Optional[Course]:
        """Update course details"""
        # Get course and check permissions
        course = self.get_course(course_id)
        if not course:
            raise NotFoundError(f"Course {course_id} not found")
            
        # Check permission
        self._require_permission(user_id, "course", course_id, "write")
        
        # Filter allowed fields
        allowed_fields = ['title', 'description', 'published', 'access_code']
        update_data = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not update_data:
            return course
            
        # Update course
        updated_course = self.course_repo.update(course_id, **update_data)
        
        # Log action
        self._log_action(user_id, "update_course", "course", course_id, update_data)
        
        # Invalidate caches
        self._invalidate_cache(f"course:{course_id}:*")
        self._invalidate_cache(f"courses:*")
        
        return updated_course
        
    @track_performance
    def delete_course(self, course_id: str, user_id: str) -> bool:
        """Delete a course"""
        # Check permission
        self._require_permission(user_id, "course", course_id, "delete")
        
        # Get course to verify it exists
        course = self.get_course(course_id)
        if not course:
            raise NotFoundError(f"Course {course_id} not found")
            
        # Delete enrollments first
        self.enrollment_repo.delete_by_course(course_id)
        
        # Delete modules
        modules = self.module_repo.get_by_course(course_id)
        for module in modules:
            self.module_repo.delete(module.module_id)
            
        # Delete course
        result = self.course_repo.delete(course_id)
        
        # Log action
        self._log_action(user_id, "delete_course", "course", course_id)
        
        # Invalidate caches
        self._invalidate_cache(f"course:{course_id}:*")
        self._invalidate_cache(f"courses:*")
        
        return result
        
    @track_performance
    @validate_input(
        course_id=lambda x: x and len(str(x)) > 0,
        student_id=lambda x: x and len(str(x)) > 0
    )
    def enroll_student(self, course_id: str, student_id: str, 
                       access_code: Optional[str] = None) -> bool:
        """Enroll a student in a course"""
        # Get course
        course = self.get_course(course_id)
        if not course:
            raise NotFoundError(f"Course {course_id} not found")
            
        # Verify access code if required
        if course.access_code and course.access_code != access_code:
            raise ValidationError("Invalid access code")
            
        # Check if already enrolled
        existing = self.enrollment_repo.get_by_student_course(student_id, course_id)
        if existing:
            return True  # Already enrolled
            
        # Create enrollment
        enrollment = self.enrollment_repo.create(
            student_id=student_id,
            course_id=course_id,
            enrolled_at=datetime.utcnow()
        )
        
        # Log action
        self._log_action(
            student_id,
            "enroll",
            "course",
            course_id,
            {"access_code_used": bool(access_code)}
        )
        
        # Invalidate caches
        self._invalidate_cache(f"courses:user:{student_id}:*")
        self._invalidate_cache(f"course:{course_id}:stats")
        
        return bool(enrollment)
        
    @track_performance
    def unenroll_student(self, course_id: str, student_id: str) -> bool:
        """Remove a student from a course"""
        # Get enrollment
        enrollment = self.enrollment_repo.get_by_student_course(student_id, course_id)
        if not enrollment:
            return False
            
        # Delete enrollment
        result = self.enrollment_repo.delete(enrollment.enrollment_id)
        
        # Log action
        self._log_action(student_id, "unenroll", "course", course_id)
        
        # Invalidate caches
        self._invalidate_cache(f"courses:user:{student_id}:*")
        self._invalidate_cache(f"course:{course_id}:stats")
        
        return result
        
    @track_performance
    def get_course_statistics(self, course_id: str) -> Dict[str, Any]:
        """Get course statistics"""
        cache_key = self._cache_key("course", course_id, "stats")
        cached = self._get_cached(cache_key)
        if cached:
            return cached
            
        # Get course
        course = self.get_course(course_id)
        if not course:
            raise NotFoundError(f"Course {course_id} not found")
            
        # Get enrollments
        enrollments = self.enrollment_repo.get_by_course(course_id)
        
        # Get modules
        modules = self.module_repo.get_by_course(course_id)
        
        # Calculate statistics
        stats = {
            "course_id": course_id,
            "course_name": course.title,
            "instructor_id": course.instructor_id,
            "created_at": course.created_at.isoformat() if course.created_at else None,
            "published": course.published,
            "student_count": len(enrollments),
            "module_count": len(modules),
            "total_files": sum(len(m.materials or []) for m in modules),
            "enrollment_trend": self._calculate_enrollment_trend(enrollments),
            "last_activity": self._get_last_activity(course_id)
        }
        
        # Cache result
        self._set_cached(cache_key, stats, timeout=600)
        
        return stats
        
    # Helper methods
    
    def _can_access_course(self, course: Course, user_id: str) -> bool:
        """Check if user can access course"""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            return False
            
        # Admin can access all
        if user.role.role_type == 'admin':
            return True
            
        # Instructor can access their own courses
        if user.role.role_type == 'instructor':
            return str(course.instructor_id) == str(user_id)
            
        # Students can access enrolled courses or published courses
        if user.role.role_type == 'student':
            # Check enrollment
            enrollment = self.enrollment_repo.get_by_student_course(user_id, course.course_id)
            return bool(enrollment) or course.published
            
        return False
        
    def _generate_access_code(self) -> str:
        """Generate unique access code"""
        return secrets.token_urlsafe(6).upper()
        
    def _calculate_enrollment_trend(self, enrollments: List[Enrollment]) -> Dict[str, Any]:
        """Calculate enrollment trend over time"""
        if not enrollments:
            return {"trend": "stable", "change": 0}
            
        # Simple implementation - can be enhanced
        recent_count = sum(
            1 for e in enrollments 
            if e.enrolled_at and (datetime.utcnow() - e.enrolled_at).days <= 7
        )
        
        return {
            "trend": "growing" if recent_count > 0 else "stable",
            "recent_enrollments": recent_count,
            "total_enrollments": len(enrollments)
        }
        
    def _get_last_activity(self, course_id: str) -> Optional[str]:
        """Get timestamp of last activity in course"""
        # This would check various activity sources
        # For now, return None
        return None
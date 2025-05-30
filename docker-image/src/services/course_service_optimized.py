"""Optimized Course Service with N+1 query fixes"""
from typing import List, Dict, Optional
from datetime import datetime
import secrets
import logging

from repositories.course_repository import CourseRepository
from repositories.user_repository import UserRepository
from repositories.enrollment_repository import EnrollmentRepository
from repositories.optimized_queries import optimized_queries
from core.exceptions import NotFoundError, ValidationError, AuthorizationError
from core.cache import cache, invalidate_cache
from core.database import db_manager

logger = logging.getLogger(__name__)


class OptimizedCourseService:
    """Service for course-related business logic with optimized queries"""
    
    def __init__(self):
        self.course_repo = CourseRepository()
        self.user_repo = UserRepository()
        self.enrollment_repo = EnrollmentRepository()
    
    def get_course_with_access_check(self, course_id: str, user_id: str) -> Dict:
        """Get course details with access verification - OPTIMIZED"""
        session = db_manager.get_session()
        
        try:
            # Single query with all needed data
            course = optimized_queries.get_course_with_all_data(session, course_id)
            
            if not course:
                raise NotFoundError("Course not found")
            
            # Single query for user with role
            user = optimized_queries.get_user_with_profile(session, user_id)
            
            if not user:
                raise AuthorizationError("User not found")
            
            # Access check without additional queries
            user_role = user.role.role_type if user.role else 'student'
            
            if user_role == 'admin':
                # Admin has access to all courses
                pass
            elif user_role == 'instructor':
                # Instructor has access to their own courses
                if str(course.instructor_id) != str(user_id):
                    raise AuthorizationError("Access denied")
            else:  # Student
                # Check enrollment (already loaded with course)
                enrolled = any(
                    e.student_id == user_id and not e.dropped_at
                    for e in course.enrollments
                )
                
                if not enrolled and not course.is_published:
                    raise AuthorizationError("Course not available")
            
            # Convert to dict with all data already loaded
            return self._course_to_dict_optimized(course)
            
        finally:
            session.close()
    
    def list_courses_for_user(self, user_id: str) -> List[Dict]:
        """List courses for a user - OPTIMIZED"""
        session = db_manager.get_session()
        
        try:
            # Get user with role in one query
            user = optimized_queries.get_user_with_profile(session, user_id)
            
            if not user:
                raise NotFoundError("User not found")
            
            user_role = user.role.role_type if user.role else 'student'
            
            if user_role == 'instructor':
                # Get instructor courses with all related data
                courses = optimized_queries.get_courses_for_instructor_optimized(
                    session, user_id, include_enrollments=True
                )
            elif user_role == 'student':
                # Get enrolled courses with modules
                courses = optimized_queries.get_courses_for_student_optimized(
                    session, user_id, include_modules=True
                )
            else:  # admin
                # Get all courses
                courses = session.query(Course).options(
                    joinedload(Course.instructor).joinedload(User.instructor_profile),
                    selectinload(Course.modules),
                    selectinload(Course.enrollments)
                ).all()
            
            # Convert to dict - all data already loaded
            return [self._course_to_dict_optimized(c) for c in courses]
            
        finally:
            session.close()
    
    def get_course_modules_with_files(self, course_id: str, user_id: str) -> List[Dict]:
        """Get course modules with files - OPTIMIZED"""
        session = db_manager.get_session()
        
        try:
            # Verify access first
            course = optimized_queries.get_course_with_all_data(session, course_id)
            if not course:
                raise NotFoundError("Course not found")
            
            # All modules and files already loaded
            modules_data = []
            for module in sorted(course.modules, key=lambda m: m.order_index):
                module_dict = {
                    'id': str(module.id),
                    'title': module.title,
                    'description': module.description,
                    'order_index': module.order_index,
                    'is_published': module.is_published,
                    'files': [
                        {
                            'id': str(f.id),
                            'title': f.title,
                            'filename': f.filename,
                            'file_type': f.file_type,
                            'size': f.file_size,
                            'url': f.s3_url or f.file_path,
                            'created_at': f.created_at.isoformat() if f.created_at else None
                        }
                        for f in module.files
                    ]
                }
                modules_data.append(module_dict)
            
            return modules_data
            
        finally:
            session.close()
    
    def get_course_statistics(self, course_id: str) -> Dict:
        """Get course statistics - OPTIMIZED (single query)"""
        session = db_manager.get_session()
        
        try:
            stats = optimized_queries.get_course_statistics(session, course_id)
            return stats
        finally:
            session.close()
    
    def search_course_files(
        self,
        user_id: str,
        search_term: str,
        course_id: Optional[str] = None
    ) -> List[Dict]:
        """Search files across courses - OPTIMIZED"""
        session = db_manager.get_session()
        
        try:
            # Get user accessible courses
            user = optimized_queries.get_user_with_profile(session, user_id)
            if not user:
                raise NotFoundError("User not found")
            
            user_role = user.role.role_type if user.role else 'student'
            
            # Determine accessible course IDs
            if course_id:
                accessible_course_ids = [course_id]
            elif user_role == 'instructor':
                courses = optimized_queries.get_courses_for_instructor_optimized(
                    session, user_id, include_enrollments=False
                )
                accessible_course_ids = [str(c.id) for c in courses]
            elif user_role == 'student':
                courses = optimized_queries.get_courses_for_student_optimized(
                    session, user_id, include_modules=False
                )
                accessible_course_ids = [str(c.id) for c in courses]
            else:  # admin
                accessible_course_ids = None  # Search all
            
            # Search files with course data already loaded
            files = optimized_queries.search_files_optimized(
                session,
                search_term,
                accessible_course_ids,
                limit=50
            )
            
            # Convert to dict - all data already loaded
            results = []
            for file in files:
                results.append({
                    'id': str(file.id),
                    'title': file.title,
                    'filename': file.filename,
                    'course_id': str(file.module.course_id),
                    'course_title': file.module.course.title,
                    'module_id': str(file.module_id),
                    'module_title': file.module.title,
                    'url': file.s3_url or file.file_path
                })
            
            return results
            
        finally:
            session.close()
    
    def _course_to_dict_optimized(self, course) -> Dict:
        """Convert course to dict with already loaded data"""
        # All relationships should already be loaded
        return {
            'id': str(course.id),
            'title': course.title,
            'description': course.description,
            'access_code': course.access_code,
            'is_published': course.is_published,
            'instructor': {
                'id': str(course.instructor.id),
                'name': course.instructor.instructor_profile.name if course.instructor.instructor_profile else course.instructor.email,
                'email': course.instructor.email
            },
            'module_count': len(course.modules),
            'enrollment_count': len([e for e in course.enrollments if not e.dropped_at]),
            'created_at': course.created_at.isoformat() if course.created_at else None,
            'updated_at': course.updated_at.isoformat() if course.updated_at else None
        }


# Export optimized service
optimized_course_service = OptimizedCourseService()
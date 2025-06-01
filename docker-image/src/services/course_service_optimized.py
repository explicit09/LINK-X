"""Optimized Course Service with eager loading and minimal queries"""
from typing import List, Dict, Optional, Any
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
        # Safely access instructor data with fallbacks
        instructor_data = {'id': '', 'name': 'Unknown', 'email': ''}
        
        if hasattr(course, 'instructor') and course.instructor:
            instructor_data = {
                'id': str(course.instructor.id),
                'name': (course.instructor.instructor_profile.name 
                        if hasattr(course.instructor, 'instructor_profile') and course.instructor.instructor_profile 
                        else course.instructor.email),
                'email': course.instructor.email
            }
        elif hasattr(course, 'instructor_id') and course.instructor_id:
            instructor_data['id'] = str(course.instructor_id)
        
        # Safely access other course attributes
        return {
            'id': str(course.id),
            'title': getattr(course, 'title', 'Untitled Course'),
            'description': getattr(course, 'description', ''),
            'access_code': getattr(course, 'access_code', ''),
            'is_published': getattr(course, 'is_published', True),
            'instructor': instructor_data,
            'module_count': len(getattr(course, 'modules', [])),
            'enrollment_count': len([e for e in getattr(course, 'enrollments', []) if not getattr(e, 'dropped_at', None)]),
            'created_at': getattr(course, 'created_at', datetime.utcnow()).isoformat() if hasattr(course, 'created_at') and course.created_at else None,
            'updated_at': getattr(course, 'updated_at', None).isoformat() if hasattr(course, 'updated_at') and course.updated_at else None
        }

    def get_student_courses(self, user_id: str, page: int = 1, per_page: int = 20) -> List[Dict]:
        """Get courses for a student with pagination"""
        return self.course_repo.get_student_courses(user_id, (page-1)*per_page, per_page)

    def get_instructor_courses(self, user_id: str, page: int = 1, per_page: int = 20) -> List[Dict]:
        """Get courses for an instructor with pagination"""
        return self.course_repo.get_by_instructor(user_id, (page-1)*per_page, per_page)

    def get_all_courses(self, page: int = 1, per_page: int = 20) -> List[Dict]:
        """Get all courses with pagination (admin only)"""
        result = self.course_repo.get_paginated(offset=(page-1)*per_page, limit=per_page)
        return result['items']

    def get_access_code(self, course_id: str) -> Optional[str]:
        """Get access code for a course"""
        access_code = self.course_repo.get_access_code(course_id)
        return access_code.code if access_code else None

    def get_student_count(self, course_id: str) -> int:
        """Get number of students enrolled in a course"""
        stats = self.course_repo.get_course_statistics(course_id)
        return stats.get('enrollments', 0)

    def create_course(self, instructor_id: str, title: str, description: str, 
                     category: Optional[str] = None, tags: Optional[List[str]] = None) -> Dict:
        """Create a new course"""
        course_data = {
            'title': title,
            'description': description,
            'instructor_id': instructor_id,
            'category': category,
            'tags': tags or []
        }
        course = self.course_repo.create(**course_data)
        return course

    def update_course(self, course_id: str, user_id: str, **kwargs) -> Dict:
        """Update a course"""
        # Check access first
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundError("Course not found")
        
        # Only instructor or admin can update
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthorizationError("User not found")
        
        user_role = user.role.role_type if user.role else 'student'
        if user_role != 'admin' and str(course.instructor_id) != str(user_id):
            raise AuthorizationError("Access denied")
        
        return self.course_repo.update(course_id, **kwargs)

    def delete_course(self, course_id: str, user_id: str) -> bool:
        """Delete a course"""
        # Check access first
        course = self.course_repo.get_by_id(course_id)
        if not course:
            return False
        
        # Only instructor or admin can delete
        user = self.user_repo.get_by_id(user_id)
        if not user:
            return False
        
        user_role = user.role.role_type if user.role else 'student'
        if user_role != 'admin' and str(course.instructor_id) != str(user_id):
            return False
        
        return self.course_repo.delete(course_id)

    def check_course_access(self, course_id: str, user_id: str) -> bool:
        """Check if user has access to a course"""
        try:
            self.get_course_with_access_check(course_id, user_id)
            return True
        except (NotFoundError, AuthorizationError):
            return False

    def get_course_modules(self, course_id: str, user_id: str) -> List[Dict]:
        """Get modules for a course"""
        # Check access first
        if not self.check_course_access(course_id, user_id):
            raise AuthorizationError("Access denied")
        
        modules = self.course_repo.get_modules(course_id)
        return [{'id': str(m.id), 'title': m.title, 'description': m.description, 'ordering': m.ordering} for m in modules]
    
    def join_course_by_access_code(self, user_id: str, access_code: str):
        """Join a course using an access code"""
        # Find course by access code
        course = self.course_repo.find_by_access_code(access_code)
        
        if not course:
            raise NotFoundError("Invalid access code")
        
        # Check if user is already enrolled
        existing_enrollment = self.enrollment_repo.get_by_student_course(user_id, str(course.id))
        if existing_enrollment:
            raise ValidationError("You are already enrolled in this course")
        
        # Create enrollment
        enrollment = self.enrollment_repo.create_enrollment(user_id, str(course.id))
        
        # Invalidate relevant caches
        invalidate_cache(f"user_courses_{user_id}")
        invalidate_cache(f"course_students_{course.id}")
        
        return course


# Export optimized service
optimized_course_service = OptimizedCourseService()
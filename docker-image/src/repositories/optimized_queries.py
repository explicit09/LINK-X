"""Optimized queries with eager loading to prevent N+1 problems"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload, selectinload, contains_eager
from sqlalchemy import select, and_, or_, func
from datetime import datetime
import logging

from db.schema import (
    User, Role, Course, Module, File, Enrollment,
    StudentProfile, InstructorProfile, AdminProfile,
    Todo
)

logger = logging.getLogger(__name__)


class OptimizedQueries:
    """Repository methods with proper eager loading to prevent N+1 queries"""
    
    @staticmethod
    def get_user_with_profile(session: Session, user_id: str) -> Optional[User]:
        """Get user with role and profile eagerly loaded"""
        stmt = (
            select(User)
            .options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile),
                joinedload(User.admin_profile)
            )
            .filter(User.id == user_id)
        )
        return session.scalar(stmt)
    
    @staticmethod
    def get_user_by_email_with_role(session: Session, email: str) -> Optional[User]:
        """Get user by email with role eagerly loaded"""
        stmt = (
            select(User)
            .options(joinedload(User.role))
            .filter(User.email == email)
        )
        return session.scalar(stmt)
    
    @staticmethod
    def get_course_with_all_data(session: Session, course_id: str) -> Optional[Course]:
        """Get course with modules, files, and instructor eagerly loaded"""
        stmt = (
            select(Course)
            .options(
                # Eager load instructor with their profile
                joinedload(Course.instructor).joinedload(User.instructor_profile),
                # Eager load modules with their files
                selectinload(Course.modules).selectinload(Module.files),
                # Eager load enrollments count
                selectinload(Course.enrollments)
            )
            .filter(Course.id == course_id)
        )
        return session.scalar(stmt)
    
    @staticmethod
    def get_courses_for_student_optimized(
        session: Session,
        student_id: str,
        include_modules: bool = False
    ) -> List[Course]:
        """Get all courses for a student with optimized loading"""
        # Get enrolled courses
        enrolled_stmt = (
            select(Course)
            .join(Enrollment)
            .options(
                # Always load instructor info
                joinedload(Course.instructor).joinedload(User.instructor_profile),
                # Use contains_eager since we're joining enrollment
                contains_eager(Course.enrollments)
            )
            .filter(
                Enrollment.student_id == student_id,
                Enrollment.dropped_at.is_(None)
            )
        )
        
        # Get courses created by the student
        created_stmt = (
            select(Course)
            .options(
                # Always load instructor info
                joinedload(Course.instructor).joinedload(User.instructor_profile),
                selectinload(Course.enrollments)
            )
            .filter(Course.creator_id == student_id)
        )
        
        # Optionally load modules and files for both queries
        if include_modules:
            enrolled_stmt = enrolled_stmt.options(
                selectinload(Course.modules).selectinload(Module.files)
            )
            created_stmt = created_stmt.options(
                selectinload(Course.modules).selectinload(Module.files)
            )
        
        # Execute both queries and combine results
        enrolled_courses = list(session.scalars(enrolled_stmt).unique())
        created_courses = list(session.scalars(created_stmt).unique())
        
        # Combine and deduplicate
        all_courses = enrolled_courses + created_courses
        seen = set()
        unique_courses = []
        for course in all_courses:
            if course.id not in seen:
                seen.add(course.id)
                unique_courses.append(course)
        
        return unique_courses
    
    @staticmethod
    def get_courses_for_instructor_optimized(
        session: Session,
        instructor_id: str,
        include_enrollments: bool = True
    ) -> List[Course]:
        """Get all courses for an instructor with optimized loading"""
        stmt = (
            select(Course)
            .options(
                # Load modules with file counts
                selectinload(Course.modules).selectinload(Module.files),
            )
            .filter(Course.instructor_id == instructor_id)
        )
        
        if include_enrollments:
            stmt = stmt.options(
                selectinload(Course.enrollments).joinedload(Enrollment.student)
            )
        
        return list(session.scalars(stmt))
    
    @staticmethod
    def get_module_with_files_and_course(
        session: Session,
        module_id: str
    ) -> Optional[Module]:
        """Get module with files and parent course eagerly loaded"""
        stmt = (
            select(Module)
            .options(
                joinedload(Module.course).joinedload(Course.instructor),
                selectinload(Module.files)
            )
            .filter(Module.id == module_id)
        )
        return session.scalar(stmt)
    
    @staticmethod
    def get_files_for_course_optimized(
        session: Session,
        course_id: str
    ) -> List[File]:
        """Get all files for a course with module info"""
        stmt = (
            select(File)
            .join(Module)
            .options(
                contains_eager(File.module)
            )
            .filter(Module.course_id == course_id)
            .order_by(Module.order_index, File.created_at)
        )
        return list(session.scalars(stmt))
    
    @staticmethod
    def get_user_todos_optimized(
        session: Session,
        user_id: str,
        include_completed: bool = False
    ) -> List[Todo]:
        """Get user todos with optimized query"""
        stmt = select(Todo).filter(Todo.user_id == user_id)
        
        if not include_completed:
            stmt = stmt.filter(Todo.completed == False)
        
        stmt = stmt.order_by(Todo.due_date.asc().nullsfirst(), Todo.created_at.desc())
        
        return list(session.scalars(stmt))
    
    @staticmethod
    def get_course_statistics(
        session: Session,
        course_id: str
    ) -> Dict[str, Any]:
        """Get course statistics in a single optimized query"""
        # Use subqueries to get all stats in one go
        enrollment_count = (
            select(func.count(Enrollment.id))
            .filter(
                Enrollment.course_id == course_id,
                Enrollment.dropped_at.is_(None)
            )
            .scalar_subquery()
        )
        
        module_count = (
            select(func.count(Module.id))
            .filter(Module.course_id == course_id)
            .scalar_subquery()
        )
        
        file_count = (
            select(func.count(File.id))
            .join(Module)
            .filter(Module.course_id == course_id)
            .scalar_subquery()
        )
        
        # Execute all subqueries in one go
        result = session.execute(
            select(
                enrollment_count.label('enrollments'),
                module_count.label('modules'),
                file_count.label('files')
            )
        ).first()
        
        return {
            'enrollment_count': result.enrollments or 0,
            'module_count': result.modules or 0,
            'file_count': result.files or 0
        }
    
    @staticmethod
    def batch_get_users_with_profiles(
        session: Session,
        user_ids: List[str]
    ) -> Dict[str, User]:
        """Batch get users with profiles to avoid N+1"""
        if not user_ids:
            return {}
        
        stmt = (
            select(User)
            .options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile)
            )
            .filter(User.id.in_(user_ids))
        )
        
        users = session.scalars(stmt).all()
        return {str(user.id): user for user in users}
    
    @staticmethod
    def get_enrollments_with_students(
        session: Session,
        course_id: str
    ) -> List[Enrollment]:
        """Get enrollments with student data eagerly loaded"""
        stmt = (
            select(Enrollment)
            .options(
                joinedload(Enrollment.student)
                .joinedload(User.student_profile)
            )
            .filter(
                Enrollment.course_id == course_id,
                Enrollment.dropped_at.is_(None)
            )
            .order_by(Enrollment.enrolled_at.desc())
        )
        return list(session.scalars(stmt))
    
    @staticmethod
    def search_files_optimized(
        session: Session,
        search_term: str,
        course_ids: Optional[List[str]] = None,
        limit: int = 50
    ) -> List[File]:
        """Search files with full text search and eager loading"""
        stmt = (
            select(File)
            .join(Module)
            .options(
                contains_eager(File.module).joinedload(Module.course)
            )
        )
        
        # Add search condition
        search_pattern = f"%{search_term}%"
        stmt = stmt.filter(
            or_(
                File.title.ilike(search_pattern),
                File.description.ilike(search_pattern),
                File.filename.ilike(search_pattern)
            )
        )
        
        # Filter by courses if provided
        if course_ids:
            stmt = stmt.filter(Module.course_id.in_(course_ids))
        
        stmt = stmt.limit(limit)
        
        return list(session.scalars(stmt))


# Export as singleton
optimized_queries = OptimizedQueries()
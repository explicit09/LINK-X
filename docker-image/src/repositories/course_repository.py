from typing import List, Optional
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import joinedload
from datetime import datetime

from repositories.base_repository import BaseRepository
from db.schema import Course, Module, File, AccessCode, Enrollment
from core.database import db_manager

class CourseRepository(BaseRepository[Course]):
    """Repository for course-related database operations"""
    
    def __init__(self, session_factory=None):
        if session_factory is None:
            session_factory = db_manager.session_factory
        super().__init__(Course, session_factory)
    
    def get_with_modules(self, course_id: str) -> Optional[Course]:
        """Get course with all modules eagerly loaded"""
        return self.get_by_id(course_id, load_options=[joinedload(Course.modules)])
    
    def get_with_enrollments(self, course_id: str) -> Optional[Course]:
        """Get course with enrollments eagerly loaded"""
        return self.get_by_id(course_id, load_options=[joinedload(Course.enrollments)])
    
    def get_by_instructor(self, instructor_id: str, offset: int = 0, limit: int = 20, 
                         published_only: bool = False) -> List[Course]:
        """Get courses by instructor with optional filtering"""
        filters = {'instructor_id': instructor_id}
        if published_only:
            filters['published'] = True
        
        result = self.get_paginated(
            offset=offset,
            limit=limit,
            filters=filters,
            order_by=Course.created_at.desc()
        )
        return result['items']
    
    def get_student_courses(self, student_id: str, offset: int = 0, limit: int = 20) -> List[Course]:
        """Get all courses a student is enrolled in OR created"""
        with self.get_session() as session:
            # Get enrolled courses
            enrolled_courses = session.query(Course)\
                .join(Enrollment)\
                .filter(Enrollment.user_id == student_id)\
                .all()
            
            # Get courses created by the student (where instructor_id matches)
            # Note: instructor_id in Course table refers to InstructorProfile.user_id
            # But for students who create courses, we need to check against User.id
            created_courses = session.query(Course)\
                .filter(Course.instructor_id == student_id)\
                .all()
            
            # Combine and deduplicate
            all_courses = list({course.id: course for course in enrolled_courses + created_courses}.values())
            
            # Detach all courses from session
            for course in all_courses:
                session.expunge(course)
            
            # Sort by most recent activity
            all_courses.sort(key=lambda x: x.last_updated or x.created_at, reverse=True)
            
            # Apply pagination
            return all_courses[offset:offset + limit]
    
    def search(self, query: str, limit: int = 10) -> List[Course]:
        """Search courses by title or description"""
        with self.get_session() as session:
            search_term = f"%{query}%"
            courses = session.query(Course)\
                .filter(
                    and_(
                        Course.published == True,
                        or_(
                            Course.title.ilike(search_term),
                            Course.description.ilike(search_term)
                        )
                    )
                )\
                .limit(limit)\
                .all()
            
            # Detach all courses from session
            for course in courses:
                session.expunge(course)
            
            return courses
    
    def get_modules(self, course_id: str) -> List[Module]:
        """Get all modules for a course"""
        with self.get_session() as session:
            modules = session.query(Module)\
                .filter_by(course_id=course_id)\
                .order_by(Module.ordering)\
                .all()
            
            # Detach all modules from session
            for module in modules:
                session.expunge(module)
            
            return modules
    
    def create_module(self, course_id: str, title: str, description: str = None, 
                     order: int = None) -> Module:
        """Create a new module in a course"""
        with self.get_session() as session:
            module = Module(
                course_id=course_id,
                title=title,
                description=description,
                ordering=order or 1
            )
            session.add(module)
            session.flush()  # Flush to get ID
            session.refresh(module)  # Refresh to load all fields
            
            # Make a copy of the module data before detaching
            module_dict = {c.name: getattr(module, c.name) 
                          for c in module.__table__.columns}
            session.expunge(module)
            
            # Recreate module with all data
            return Module(**module_dict)
    
    def get_access_code(self, course_id: str) -> Optional[AccessCode]:
        """Get access code for a course"""
        with self.get_session() as session:
            access_code = session.query(AccessCode)\
                .filter_by(course_id=course_id)\
                .first()
            
            if access_code:
                session.expunge(access_code)
            
            return access_code
    
    def create_access_code(self, course_id: str, code: str) -> AccessCode:
        """Create access code for a course"""
        with self.get_session() as session:
            access_code = AccessCode(
                course_id=course_id,
                code=code
            )
            session.add(access_code)
            session.flush()  # Flush to get ID
            session.refresh(access_code)  # Refresh to load all fields
            
            # Make a copy of the access code data before detaching
            access_code_dict = {c.name: getattr(access_code, c.name) 
                               for c in access_code.__table__.columns}
            session.expunge(access_code)
            
            # Recreate access code with all data
            return AccessCode(**access_code_dict)
    
    def count_files(self, course_id: str) -> int:
        """Count total files in a course"""
        with self.get_session() as session:
            return session.query(File)\
                .join(Module)\
                .filter(Module.course_id == course_id)\
                .count()
    
    def get_course_statistics(self, course_id: str) -> dict:
        """Get detailed statistics for a course"""
        course = self.get_by_id(course_id)
        if not course:
            return {}
        
        with self.get_session() as session:
            # Count modules
            module_count = session.query(Module)\
                .filter_by(course_id=course_id)\
                .count()
            
            # Count files
            file_count = session.query(File)\
                .join(Module)\
                .filter(Module.course_id == course_id)\
                .count()
            
            # Count enrollments
            enrollment_count = session.query(Enrollment)\
                .filter_by(course_id=course_id)\
                .count()
            
            return {
                'modules': module_count,
                'files': file_count,
                'enrollments': enrollment_count,
                'published': course.published,
                'created_at': course.created_at
            }
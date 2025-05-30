from typing import List, Optional
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import joinedload
from datetime import datetime

from repositories.base_repository import BaseRepository
from db.schema import Course, Module, File, AccessCode, Enrollment

class CourseRepository(BaseRepository[Course]):
    """Repository for course-related database operations"""
    
    def __init__(self):
        super().__init__(Course)
    
    def get_with_modules(self, course_id: str) -> Optional[Course]:
        """Get course with all modules eagerly loaded"""
        try:
            return self.db.query(Course)\
                .options(joinedload(Course.modules))\
                .filter_by(id=course_id)\
                .first()
        finally:
            self.db.close()
    
    def get_by_instructor(self, instructor_id: str, offset: int = 0, limit: int = 20, 
                         published_only: bool = False) -> List[Course]:
        """Get courses by instructor with optional filtering"""
        try:
            query = self.db.query(Course).filter_by(instructor_id=instructor_id)
            
            if published_only:
                query = query.filter_by(published=True)
            
            return query.order_by(Course.created_at.desc())\
                       .offset(offset)\
                       .limit(limit)\
                       .all()
        finally:
            self.db.close()
    
    def get_student_courses(self, student_id: str, offset: int = 0, limit: int = 20) -> List[Course]:
        """Get all courses a student is enrolled in"""
        try:
            return self.db.query(Course)\
                .join(Enrollment)\
                .filter(Enrollment.user_id == student_id)\
                .order_by(Enrollment.enrolled_at.desc())\
                .offset(offset)\
                .limit(limit)\
                .all()
        finally:
            self.db.close()
    
    def search(self, query: str, limit: int = 10) -> List[Course]:
        """Search courses by title or description"""
        try:
            search_term = f"%{query}%"
            return self.db.query(Course)\
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
        finally:
            self.db.close()
    
    def get_modules(self, course_id: str) -> List[Module]:
        """Get all modules for a course"""
        try:
            return self.db.query(Module)\
                .filter_by(course_id=course_id)\
                .order_by(Module.ordering)\
                .all()
        finally:
            self.db.close()
    
    def create_module(self, course_id: str, title: str, description: str = None, 
                     order: int = None) -> Module:
        """Create a new module in a course"""
        try:
            module = Module(
                course_id=course_id,
                title=title,
                description=description,
                ordering=order or 1
            )
            self.db.add(module)
            self.db.commit()
            self.db.refresh(module)
            return module
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def get_access_code(self, course_id: str) -> Optional[AccessCode]:
        """Get access code for a course"""
        try:
            return self.db.query(AccessCode)\
                .filter_by(course_id=course_id)\
                .first()
        finally:
            self.db.close()
    
    def create_access_code(self, course_id: str, code: str) -> AccessCode:
        """Create access code for a course"""
        try:
            access_code = AccessCode(
                course_id=course_id,
                code=code
            )
            self.db.add(access_code)
            self.db.commit()
            self.db.refresh(access_code)
            return access_code
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def count_files(self, course_id: str) -> int:
        """Count total files in a course"""
        try:
            return self.db.query(File)\
                .join(Module)\
                .filter(Module.course_id == course_id)\
                .count()
        finally:
            self.db.close()
    
    def get_course_statistics(self, course_id: str) -> dict:
        """Get detailed statistics for a course"""
        try:
            course = self.get_by_id(course_id)
            if not course:
                return {}
            
            # Count modules
            module_count = self.db.query(Module)\
                .filter_by(course_id=course_id)\
                .count()
            
            # Count files
            file_count = self.db.query(File)\
                .join(Module)\
                .filter(Module.course_id == course_id)\
                .count()
            
            # Count enrollments
            enrollment_count = self.db.query(Enrollment)\
                .filter_by(course_id=course_id)\
                .count()
            
            return {
                'modules': module_count,
                'files': file_count,
                'enrollments': enrollment_count,
                'published': course.published,
                'created_at': course.created_at
            }
        finally:
            self.db.close()
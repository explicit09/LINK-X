from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import and_

from repositories.base_repository import BaseRepository
from db.schema import Enrollment

class EnrollmentRepository(BaseRepository[Enrollment]):
    """Repository for enrollment-related database operations"""
    
    def __init__(self):
        super().__init__(Enrollment)
    
    def get_by_student_course(self, student_id: str, course_id: str) -> Optional[Enrollment]:
        """Get enrollment by student and course"""
        return self.find_by(user_id=student_id, course_id=course_id)
    
    def get_by_student(self, student_id: str) -> List[Enrollment]:
        """Get all enrollments for a student"""
        return self.find_all_by(user_id=student_id)
    
    def get_by_course(self, course_id: str) -> List[Enrollment]:
        """Get all enrollments for a course"""
        return self.find_all_by(course_id=course_id)
    
    def count_by_course(self, course_id: str) -> int:
        """Count enrollments for a course"""
        return self.count(course_id=course_id)
    
    def create(self, student_id: str, course_id: str) -> Enrollment:
        """Create new enrollment"""
        try:
            enrollment = Enrollment(
                user_id=student_id,
                course_id=course_id,
                enrolled_at=datetime.utcnow()
            )
            self.db.add(enrollment)
            self.db.commit()
            self.db.refresh(enrollment)
            return enrollment
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def get_recent_enrollments(self, course_id: str, days: int = 7) -> List[Enrollment]:
        """Get recent enrollments for a course"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            return self.db.query(Enrollment)\
                .filter(
                    and_(
                        Enrollment.course_id == course_id,
                        Enrollment.enrolled_at >= cutoff_date
                    )
                )\
                .order_by(Enrollment.enrolled_at.desc())\
                .all()
        finally:
            self.db.close()
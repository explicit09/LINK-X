from typing import Optional, List, Dict
from sqlalchemy import or_, and_
from datetime import datetime

from .base_repository import BaseRepository
from ..db.schema import User, StudentProfile, InstructorProfile, Role

class UserRepository(BaseRepository[User]):
    """Repository for user-related database operations"""
    
    def __init__(self):
        super().__init__(User)
    
    def create(self, **kwargs) -> User:
        """Create user with role"""
        try:
            # Extract role if provided
            role_type = kwargs.pop('role', 'student')
            
            # Handle password_hash vs password field name
            if 'password_hash' in kwargs:
                kwargs['password'] = kwargs.pop('password_hash')
            
            # Create user
            user = User(**kwargs)
            self.db.add(user)
            self.db.flush()  # Flush to get the user ID
            
            # Create role
            role = Role(user_id=user.id, role_type=role_type)
            self.db.add(role)
            
            self.db.commit()
            self.db.refresh(user)
            
            # Load relationships
            from sqlalchemy.orm import joinedload
            user = self.db.query(User).options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile)
            ).filter_by(id=user.id).first()
            
            return user
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email"""
        return self.find_by(email=email)
    
    def find_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        """Find user by Firebase UID"""
        from sqlalchemy.orm import joinedload
        try:
            print(f"Querying database for Firebase UID: {firebase_uid}")
            user = self.db.query(User).options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile)
            ).filter_by(firebase_uid=firebase_uid).first()
            print(f"Query result: {user}")
            return user
        except Exception as e:
            print(f"Database query error: {e}")
            raise
        finally:
            self.db.close()
    
    def create_student_profile(self, user_id: str, name: str, grade_level: str = None, 
                             learning_style: str = None) -> StudentProfile:
        """Create student profile"""
        try:
            profile = StudentProfile(
                user_id=user_id,
                name=name,
                grade_level=grade_level,
                learning_style=learning_style
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
            return profile
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def create_instructor_profile(self, user_id: str, name: str, department: str = None, 
                                bio: str = None) -> InstructorProfile:
        """Create instructor profile"""
        try:
            profile = InstructorProfile(
                user_id=user_id,
                name=name,
                department=department,
                bio=bio
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
            return profile
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def get_with_profile(self, user_id: str) -> Optional[User]:
        """Get user with their profile"""
        try:
            user = self.db.query(User).filter_by(id=user_id).first()
            if user:
                # Eagerly load profile based on role
                if user.role == Role.STUDENT:
                    self.db.query(StudentProfile).filter_by(user_id=user_id).first()
                elif user.role == Role.INSTRUCTOR:
                    self.db.query(InstructorProfile).filter_by(user_id=user_id).first()
            return user
        finally:
            self.db.close()
    
    def search_users(self, query: str, role: str = None, limit: int = 10) -> List[User]:
        """Search users by name or email"""
        try:
            search_term = f"%{query}%"
            q = self.db.query(User)
            
            # Filter by role if specified
            if role:
                q = q.filter(User.role == Role[role.upper()])
            
            # Search in email and profiles
            q = q.filter(
                or_(
                    User.email.ilike(search_term),
                    User.id.in_(
                        self.db.query(StudentProfile.user_id).filter(
                            StudentProfile.name.ilike(search_term)
                        )
                    ),
                    User.id.in_(
                        self.db.query(InstructorProfile.user_id).filter(
                            InstructorProfile.name.ilike(search_term)
                        )
                    )
                )
            )
            
            return q.limit(limit).all()
        finally:
            self.db.close()
    
    def get_active_users(self, days: int = 30) -> List[User]:
        """Get users active in the last N days"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            return self.db.query(User).filter(
                User.last_login >= cutoff_date
            ).all()
        finally:
            self.db.close()
    
    def get_users_by_role(self, role: str, offset: int = 0, limit: int = 20) -> List[User]:
        """Get users by role with pagination"""
        try:
            return self.db.query(User).filter(
                User.role == Role[role.upper()]
            ).offset(offset).limit(limit).all()
        finally:
            self.db.close()
    
    def update_profile(self, user_id: str, role: str, **kwargs) -> bool:
        """Update user profile based on role"""
        try:
            if role == 'student':
                profile = self.db.query(StudentProfile).filter_by(user_id=user_id).first()
            elif role == 'instructor':
                profile = self.db.query(InstructorProfile).filter_by(user_id=user_id).first()
            else:
                return False
            
            if profile:
                for key, value in kwargs.items():
                    if hasattr(profile, key):
                        setattr(profile, key, value)
                self.db.commit()
                return True
            return False
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def suspend_user(self, user_id: str) -> bool:
        """Suspend a user account"""
        return self.update(user_id, suspended=True, suspended_at=datetime.utcnow())
    
    def activate_user(self, user_id: str) -> bool:
        """Activate a suspended user account"""
        return self.update(user_id, suspended=False, suspended_at=None)
    
    def get_user_statistics(self, user_id: str) -> Dict:
        """Get user statistics"""
        try:
            user = self.get_by_id(user_id)
            if not user:
                return {}
            
            stats = {
                'created_at': user.created_at,
                'last_login': user.last_login,
                'role': user.role.value
            }
            
            if user.role == Role.STUDENT:
                # Add student-specific stats
                from .enrollment_repository import EnrollmentRepository
                enrollment_repo = EnrollmentRepository()
                stats['enrolled_courses'] = enrollment_repo.count(user_id=user_id)
            elif user.role == Role.INSTRUCTOR:
                # Add instructor-specific stats
                from .course_repository import CourseRepository
                course_repo = CourseRepository()
                stats['created_courses'] = course_repo.count(instructor_id=user_id)
            
            return stats
        finally:
            self.db.close()
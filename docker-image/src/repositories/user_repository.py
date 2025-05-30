from typing import Optional, List, Dict
from sqlalchemy import or_, and_
from sqlalchemy.orm import joinedload, sessionmaker
from datetime import datetime, timedelta
import logging

from repositories.base_repository import BaseRepository
from db.schema import User, StudentProfile, InstructorProfile, Role
from core.database import db_manager

logger = logging.getLogger(__name__)

class UserRepository(BaseRepository[User]):
    """Repository for user-related database operations"""
    
    def __init__(self, session_factory: sessionmaker = None):
        try:
            if session_factory is None:
                session_factory = db_manager.session_factory
            super().__init__(User, session_factory)
            logger.info(f"UserRepository initialized successfully with session factory: {type(session_factory)}")
        except Exception as e:
            logger.error(f"Failed to initialize UserRepository: {type(e).__name__}: {str(e)}")
            raise
    
    def create(self, **kwargs) -> User:
        """Create user with role"""
        with self.get_session() as session:
            # Extract role if provided
            role_type = kwargs.pop('role', 'student')
            
            # Handle password_hash vs password field name
            if 'password_hash' in kwargs:
                kwargs['password'] = kwargs.pop('password_hash')
            
            # Create user
            user = User(**kwargs)
            session.add(user)
            session.flush()  # Flush to get the user ID
            
            # Create role
            role = Role(user_id=user.id, role_type=role_type)
            session.add(role)
            
            session.flush()
            session.refresh(user)
            
            # Load relationships
            user = session.query(User).options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile)
            ).filter_by(id=user.id).first()
            
            # Copy user data before detaching
            user_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns}
            # Also preserve the role relationship
            user_role = user.role
            
            session.expunge(user)
            
            # Recreate user with data
            new_user = User(**user_dict)
            new_user.role = user_role
            
            return new_user
    
    def get_by_id(self, id: str) -> Optional[User]:
        """Get user by ID with eager loading of relationships"""
        load_options = [
            joinedload(User.role),
            joinedload(User.student_profile),
            joinedload(User.instructor_profile)
        ]
        return super().get_by_id(id, load_options=load_options)
    
    def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email"""
        return self.find_by(email=email)
    
    def find_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        """Find user by Firebase UID"""
        with self.get_session() as session:
            print(f"Querying database for Firebase UID: {firebase_uid}")
            user = session.query(User).options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile)
            ).filter_by(firebase_uid=firebase_uid).first()
            print(f"Query result: {user}")
            
            if user:
                session.expunge(user)
            return user
    
    def create_student_profile(self, user_id: str, name: str, grade_level: str = None, 
                             learning_style: str = None) -> StudentProfile:
        """Create student profile"""
        with self.get_session() as session:
            profile = StudentProfile(
                user_id=user_id,
                name=name,
                grade_level=grade_level,
                learning_style=learning_style
            )
            session.add(profile)
            session.flush()
            session.refresh(profile)
            
            # Copy profile data before detaching
            profile_dict = {c.name: getattr(profile, c.name) for c in profile.__table__.columns}
            session.expunge(profile)
            
            return StudentProfile(**profile_dict)
    
    def create_instructor_profile(self, user_id: str, name: str, department: str = None, 
                                bio: str = None) -> InstructorProfile:
        """Create instructor profile"""
        with self.get_session() as session:
            profile = InstructorProfile(
                user_id=user_id,
                name=name,
                department=department,
                bio=bio
            )
            session.add(profile)
            session.flush()
            session.refresh(profile)
            
            # Copy profile data before detaching
            profile_dict = {c.name: getattr(profile, c.name) for c in profile.__table__.columns}
            session.expunge(profile)
            
            return InstructorProfile(**profile_dict)
    
    def get_with_profile(self, user_id: str) -> Optional[User]:
        """Get user with their profile"""
        with self.get_session() as session:
            user = session.query(User).options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile)
            ).filter_by(id=user_id).first()
            
            if user:
                session.expunge(user)
            return user
    
    def search_users(self, query: str, role: str = None, limit: int = 10) -> List[User]:
        """Search users by name or email"""
        with self.get_session() as session:
            search_term = f"%{query}%"
            q = session.query(User)
            
            # Filter by role if specified
            if role:
                q = q.join(Role).filter(Role.role_type == role.lower())
            
            # Search in email and profiles
            q = q.filter(
                or_(
                    User.email.ilike(search_term),
                    User.id.in_(
                        session.query(StudentProfile.user_id).filter(
                            StudentProfile.name.ilike(search_term)
                        )
                    ),
                    User.id.in_(
                        session.query(InstructorProfile.user_id).filter(
                            InstructorProfile.name.ilike(search_term)
                        )
                    )
                )
            )
            
            users = q.limit(limit).all()
            
            # Detach all users
            for user in users:
                session.expunge(user)
            return users
    
    def get_active_users(self, days: int = 30) -> List[User]:
        """Get users active in the last N days"""
        with self.get_session() as session:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            users = session.query(User).filter(
                User.last_login >= cutoff_date
            ).all()
            
            # Detach all users
            for user in users:
                session.expunge(user)
            return users
    
    def get_users_by_role(self, role: str, offset: int = 0, limit: int = 20) -> List[User]:
        """Get users by role with pagination"""
        with self.get_session() as session:
            users = session.query(User).join(Role).filter(
                Role.role_type == role.lower()
            ).offset(offset).limit(limit).all()
            
            # Detach all users
            for user in users:
                session.expunge(user)
            return users
    
    def update_profile(self, user_id: str, role: str, **kwargs) -> bool:
        """Update user profile based on role"""
        with self.get_session() as session:
            if role == 'student':
                profile = session.query(StudentProfile).filter_by(user_id=user_id).first()
            elif role == 'instructor':
                profile = session.query(InstructorProfile).filter_by(user_id=user_id).first()
            else:
                return False
            
            if profile:
                for key, value in kwargs.items():
                    if hasattr(profile, key):
                        setattr(profile, key, value)
                # Session will commit automatically
                return True
            return False
    
    def suspend_user(self, user_id: str) -> bool:
        """Suspend a user account"""
        return self.update(user_id, suspended=True, suspended_at=datetime.utcnow())
    
    def activate_user(self, user_id: str) -> bool:
        """Activate a suspended user account"""
        return self.update(user_id, suspended=False, suspended_at=None)
    
    def get_user_statistics(self, user_id: str) -> Dict:
        """Get user statistics"""
        user = self.get_by_id(user_id)
        if not user:
            return {}
        
        stats = {
            'created_at': user.created_at,
            'last_login': user.last_login,
            'role': user.role.role_type if user.role else 'student'
        }
        
        if user.role and user.role.role_type == 'student':
            # Add student-specific stats
            from .enrollment_repository import EnrollmentRepository
            enrollment_repo = EnrollmentRepository(self.session_factory)
            stats['enrolled_courses'] = enrollment_repo.count(user_id=user_id)
        elif user.role and user.role.role_type == 'instructor':
            # Add instructor-specific stats
            from .course_repository import CourseRepository
            course_repo = CourseRepository(self.session_factory)
            stats['created_courses'] = course_repo.count(instructor_id=user_id)
        
        return stats
    
    def update_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp"""
        return self.update(user_id, last_login=datetime.utcnow())
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email address"""
        load_options = [
            joinedload(User.role),
            joinedload(User.student_profile),
            joinedload(User.instructor_profile)
        ]
        return self.find_by(email=email, load_options=load_options)
    
    def get_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        """Get user by Firebase UID - alias for find_by_firebase_uid"""
        return self.find_by_firebase_uid(firebase_uid)
    
    def get_by_role(self, role: str, offset: int = 0, limit: int = 20) -> List[User]:
        """Get users by role - alias for get_users_by_role"""
        return self.get_users_by_role(role, offset, limit)
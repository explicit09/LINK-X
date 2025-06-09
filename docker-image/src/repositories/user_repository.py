from typing import Optional, List, Dict
from sqlalchemy import or_, and_
from sqlalchemy.orm import joinedload, sessionmaker
from datetime import datetime, timedelta
import logging
from contextlib import contextmanager

from repositories.base_repository import BaseRepository
from db.schema import User, StudentProfile, InstructorProfile, Role, AdminProfile
from core.database_supabase import db_manager

logger = logging.getLogger(__name__)

class UserRepository(BaseRepository[User]):
    """Repository for user-related database operations"""
    
    def __init__(self, session_factory: sessionmaker = None):
        try:
            # Store the initial session factory (might be None)
            self._initial_session_factory = session_factory
            self._session_factory = session_factory
            
            # If no session factory provided, we'll try to get it later
            if session_factory is None:
                # Don't immediately try to get from db_manager - it might not be ready
                logger.info("UserRepository initialized with deferred session factory loading")
                # Initialize with a dummy session factory to avoid errors
                self.model = User
            else:
                # Initialize normally with provided session factory
                super().__init__(User, session_factory)
                logger.info(f"UserRepository initialized successfully with session factory: {type(session_factory)}")
        except Exception as e:
            logger.error(f"Failed to initialize UserRepository: {type(e).__name__}: {str(e)}")
            raise
    
    @property
    def session_factory(self):
        """Get session factory, loading it lazily if needed"""
        if self._session_factory is None:
            # Try to get from db_manager now
            from core.database_supabase import db_manager
            if db_manager.session_factory is not None:
                self._session_factory = db_manager.session_factory
                logger.info(f"UserRepository session factory loaded lazily: {type(self._session_factory)}")
            else:
                logger.warning("db_manager.session_factory is still None - database may not be initialized yet")
                raise RuntimeError("Database session factory not available")
        
        return self._session_factory
    
    @contextmanager
    def get_session(self):
        """Get database session with proper cleanup"""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
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
            
            # Preserve the role relationship before expunging
            user_role = user.role
            
            # Expunge the user from session (this detaches it safely)
            session.expunge(user)
            
            # Preserve the role relationship on the detached user
            user.role = user_role
            
            return user
    
    def get_by_id(self, id: str) -> Optional[User]:
        """Get user by ID with eager loading of relationships"""
        load_options = [
            joinedload(User.role),
            joinedload(User.student_profile),
            joinedload(User.instructor_profile),
            joinedload(User.admin_profile)
        ]
        return super().get_by_id(id, load_options=load_options)
    
    def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email"""
        return self.find_by(email=email)
    
    def find_by_supabase_uid(self, supabase_uid: str) -> Optional[User]:
        """Find user by Supabase UID"""
        with self.get_session() as session:
            print(f"Querying database for Supabase UID: {supabase_uid}")
            user = session.query(User).options(
                joinedload(User.role),
                joinedload(User.student_profile),
                joinedload(User.instructor_profile),
                joinedload(User.admin_profile)
            ).filter_by(supabase_uid=supabase_uid).first()
            print(f"Query result: {user}")
            
            if user:
                session.expunge(user)
            return user
    
    def create_student_profile(self, user_id: str, name: str, onboard_answers: dict = None, 
                             want_quizzes: bool = False, model_preference: str = None) -> StudentProfile:
        """Create student profile with onboarding data"""
        with self.get_session() as session:
            profile = StudentProfile(
                user_id=user_id,
                name=name,
                onboard_answers=onboard_answers or {},
                want_quizzes=want_quizzes,
                model_preference=model_preference
            )
            session.add(profile)
            session.flush()
            session.refresh(profile)
            
            # Expunge profile to detach it from session
            session.expunge(profile)
            
            return profile
    
    def create_instructor_profile(self, user_id: str, name: str, university: str = None, 
                                department: str = None, bio: str = None) -> InstructorProfile:
        """Create instructor profile"""
        with self.get_session() as session:
            profile = InstructorProfile(
                user_id=user_id,
                name=name,
                university=university,
                bio=bio
            )
            session.add(profile)
            session.flush()
            session.refresh(profile)
            
            # Expunge profile to detach it from session
            session.expunge(profile)
            
            return profile
    
    def create_admin_profile(self, user_id: str, name: str) -> AdminProfile:
        """Create admin profile"""
        with self.get_session() as session:
            profile = AdminProfile(
                user_id=user_id,
                name=name
            )
            session.add(profile)
            session.flush()
            session.refresh(profile)
            
            # Expunge profile to detach it from session
            session.expunge(profile)
            
            return profile
    
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
    
    def get_by_supabase_uid(self, supabase_uid: str) -> Optional[User]:
        """Get user by Supabase UID - alias for find_by_supabase_uid"""
        return self.find_by_supabase_uid(supabase_uid)
    
    def get_by_role(self, role: str, offset: int = 0, limit: int = 20) -> List[User]:
        """Get users by role - alias for get_users_by_role"""
        return self.get_users_by_role(role, offset, limit)
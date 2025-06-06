"""Supabase and PostgreSQL Authentication Sync Service"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from contextlib import contextmanager
from sqlalchemy.orm import Session
from sqlalchemy import text

from core.database_supabase import db_manager
from db.schema import User, Role, StudentProfile, InstructorProfile
from core.exceptions import AuthenticationError, DatabaseError
from core.supabase_config import get_supabase_admin_client

logger = logging.getLogger(__name__)


class SupabaseAuthSyncService:
    """Service to handle Supabase and PostgreSQL user synchronization"""
    
    def __init__(self):
        self.supabase = get_supabase_admin_client()
    
    @contextmanager
    def db_transaction(self, session: Session):
        """
        Context manager for database transactions
        """
        try:
            session.begin()
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
    
    def create_user_with_sync(
        self,
        email: str,
        password: str,
        name: str,
        role: str = 'student',
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create user in both Supabase Auth and PostgreSQL
        """
        session = db_manager.get_session()
        supabase_user = None
        
        try:
            # Step 1: Create Supabase Auth user
            try:
                if self.supabase:
                    auth_response = self.supabase.auth.admin.create_user({
                        "email": email,
                        "password": password,
                        "email_confirm": False,
                        "user_metadata": {
                            "full_name": name,
                            "role": role
                        }
                    })
                    supabase_user = auth_response.user
                    logger.info(f"Created Supabase user: {supabase_user.id}")
                else:
                    # If Supabase client not available, generate a placeholder ID
                    import uuid
                    supabase_user = type('obj', (object,), {'id': str(uuid.uuid4()), 'email': email})
                    logger.warning("Supabase client not available, using placeholder user")
                    
            except Exception as e:
                logger.error(f"Supabase user creation failed: {e}")
                raise AuthenticationError(f"Failed to create account: {str(e)}")
            
            # Step 2: Create PostgreSQL user
            with self.db_transaction(session) as txn_session:
                # Check if user already exists
                existing_user = txn_session.query(User).filter_by(email=email).first()
                if existing_user:
                    # If Supabase user was created, delete it
                    if self.supabase and supabase_user:
                        try:
                            self.supabase.auth.admin.delete_user(supabase_user.id)
                        except Exception as e:
                            logger.error(f"Failed to cleanup Supabase user: {e}")
                    raise AuthenticationError("User already exists in database")
                
                # Create user
                new_user = User(
                    id=supabase_user.id,  # Use Supabase user ID
                    email=email,
                    firebase_uid=supabase_user.id,  # Store Supabase ID in firebase_uid for compatibility
                    # password field is nullable for Supabase auth
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    is_active=True,
                    email_verified=False,
                    full_name=name,
                    role=role  # Store role directly on user
                )
                txn_session.add(new_user)
                txn_session.flush()
                
                # Create role entry
                user_role = Role(
                    user_id=new_user.id,
                    role_type=role
                )
                txn_session.add(user_role)
                
                # Create profile based on role
                if role == 'student':
                    profile = StudentProfile(
                        user_id=new_user.id,
                        name=name,
                        onboard_answers={},
                        want_quizzes=False,
                        model_preference=kwargs.get('model_preference')
                    )
                    txn_session.add(profile)
                elif role == 'instructor':
                    profile = InstructorProfile(
                        user_id=new_user.id,
                        name=name,
                        university=kwargs.get('university')
                    )
                    txn_session.add(profile)
                
                return {
                    'user_id': str(new_user.id),
                    'supabase_id': supabase_user.id,
                    'email': email,
                    'role': role,
                    'created': True
                }
                
        except Exception as e:
            # If PostgreSQL failed but Supabase user was created, delete it
            if supabase_user and self.supabase:
                try:
                    self.supabase.auth.admin.delete_user(supabase_user.id)
                    logger.info(f"Cleaned up Supabase user after PostgreSQL failure: {supabase_user.id}")
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup Supabase user: {cleanup_error}")
            
            logger.error(f"User creation failed: {e}")
            raise
        finally:
            session.close()
    
    def sync_supabase_user_to_postgres(
        self,
        supabase_user_id: str,
        user_data: Optional[Dict[str, Any]] = None
    ) -> Optional[User]:
        """
        Sync an existing Supabase user to PostgreSQL
        Used when a Supabase user logs in but doesn't exist in PostgreSQL yet
        """
        session = db_manager.get_session()
        
        try:
            # Get Supabase user data if not provided
            if not user_data and self.supabase:
                try:
                    user_response = self.supabase.auth.admin.get_user_by_id(supabase_user_id)
                    user_data = {
                        'id': user_response.user.id,
                        'email': user_response.user.email,
                        'email_verified': user_response.user.email_confirmed_at is not None,
                        'full_name': user_response.user.user_metadata.get('full_name', ''),
                        'role': user_response.user.user_metadata.get('role', 'student')
                    }
                except Exception as e:
                    logger.error(f"Failed to get Supabase user: {e}")
                    return None
            
            if not user_data:
                logger.error("No user data available for sync")
                return None
                
            with self.db_transaction(session) as txn_session:
                # Check if already exists
                existing_user = txn_session.query(User).filter_by(
                    id=supabase_user_id
                ).first()
                
                if existing_user:
                    # Update last login
                    existing_user.last_login_at = datetime.now()
                    return existing_user
                
                # Create new user
                new_user = User(
                    id=supabase_user_id,
                    email=user_data['email'],
                    firebase_uid=supabase_user_id,  # For compatibility
                    role=user_data.get('role', 'student'),
                    email_verified=user_data.get('email_verified', False),
                    full_name=user_data.get('full_name', ''),
                    last_login_at=datetime.now(),
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    is_active=True
                )
                txn_session.add(new_user)
                txn_session.flush()
                
                # Create role entry
                role = Role(
                    user_id=new_user.id,
                    role_type=user_data.get('role', 'student')
                )
                txn_session.add(role)
                
                # Create default profile
                if user_data.get('role', 'student') == 'student':
                    profile = StudentProfile(
                        user_id=new_user.id,
                        name=user_data.get('full_name', user_data['email'].split('@')[0]),
                        onboard_answers={},
                        want_quizzes=False
                    )
                    txn_session.add(profile)
                
                logger.info(f"Synced Supabase user to PostgreSQL: {supabase_user_id}")
                return new_user
                
        except Exception as e:
            logger.error(f"Failed to sync Supabase user: {e}")
            return None
        finally:
            session.close()
    
    def update_user_with_sync(
        self,
        user_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """
        Update user in both systems
        """
        session = db_manager.get_session()
        
        try:
            with self.db_transaction(session) as txn_session:
                # Get user
                user = txn_session.query(User).filter_by(id=user_id).first()
                if not user:
                    raise ValueError("User not found")
                
                # Update Supabase if email changed
                if 'email' in updates and updates['email'] != user.email and self.supabase:
                    try:
                        self.supabase.auth.admin.update_user_by_id(
                            user_id,
                            {"email": updates['email']}
                        )
                    except Exception as e:
                        logger.error(f"Supabase update failed: {e}")
                        raise AuthenticationError(f"Failed to update account: {str(e)}")
                
                # Update PostgreSQL
                if 'email' in updates:
                    user.email = updates['email']
                    user.email_verified = False  # Require re-verification
                
                if 'full_name' in updates:
                    user.full_name = updates['full_name']
                
                user.updated_at = datetime.now()
                
                # Update profile
                if user.student_profile and 'name' in updates:
                    user.student_profile.name = updates['name']
                elif user.instructor_profile and 'name' in updates:
                    user.instructor_profile.name = updates['name']
                
                return True
                
        except Exception as e:
            logger.error(f"User update failed: {e}")
            return False
        finally:
            session.close()
    
    def delete_user_with_sync(self, user_id: str) -> bool:
        """
        Delete user from both systems (soft delete in DB, hard delete in Supabase)
        """
        session = db_manager.get_session()
        
        try:
            with self.db_transaction(session) as txn_session:
                # Get user
                user = txn_session.query(User).filter_by(id=user_id).first()
                if not user:
                    return False
                
                # Soft delete in PostgreSQL
                user.is_active = False
                user.updated_at = datetime.now()
                
                # Delete from Supabase
                if self.supabase:
                    try:
                        self.supabase.auth.admin.delete_user(user_id)
                        logger.info(f"Deleted Supabase user: {user_id}")
                    except Exception as e:
                        logger.error(f"Supabase deletion failed: {e}")
                        # Continue with PostgreSQL soft delete
                
                return True
                
        except Exception as e:
            logger.error(f"User deletion failed: {e}")
            return False
        finally:
            session.close()


# Singleton instance
auth_sync_service = SupabaseAuthSyncService()
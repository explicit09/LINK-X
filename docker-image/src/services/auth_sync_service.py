"""Firebase and PostgreSQL Authentication Sync Service with 2PC"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from contextlib import contextmanager
from sqlalchemy.orm import Session
from sqlalchemy import text
import firebase_admin.auth as firebase_auth
from firebase_admin.exceptions import FirebaseError

from core.database_supabase import db_manager
from db.schema import User, Role, StudentProfile, InstructorProfile
from core.exceptions import AuthenticationError, DatabaseError

logger = logging.getLogger(__name__)


class AuthSyncService:
    """Service to handle Firebase and PostgreSQL user synchronization with proper transactions"""
    
    @contextmanager
    def two_phase_commit(self, session: Session):
        """
        Context manager for two-phase commit pattern
        
        This ensures Firebase and PostgreSQL stay in sync
        """
        firebase_user = None
        postgres_rollback_needed = False
        
        try:
            # Begin PostgreSQL transaction
            session.begin()
            postgres_rollback_needed = True
            
            yield session
            
            # If we get here, commit PostgreSQL
            session.commit()
            postgres_rollback_needed = False
            
        except Exception as e:
            # Rollback PostgreSQL if needed
            if postgres_rollback_needed:
                session.rollback()
            
            # If we created a Firebase user, try to delete it
            if firebase_user:
                try:
                    firebase_auth.delete_user(firebase_user.uid)
                    logger.info(f"Rolled back Firebase user creation: {firebase_user.uid}")
                except Exception as fb_error:
                    logger.error(f"Failed to rollback Firebase user: {fb_error}")
            
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
        Create user in both Firebase and PostgreSQL with transaction safety
        """
        session = db_manager.get_session()
        firebase_user = None
        
        try:
            # Step 1: Create Firebase user first (can be rolled back)
            try:
                firebase_user = firebase_auth.create_user(
                    email=email,
                    password=password,
                    display_name=name,
                    email_verified=False
                )
                logger.info(f"Created Firebase user: {firebase_user.uid}")
            except FirebaseError as e:
                logger.error(f"Firebase user creation failed: {e}")
                raise AuthenticationError(f"Failed to create account: {str(e)}")
            
            # Step 2: Create PostgreSQL user with two-phase commit
            with self.two_phase_commit(session) as txn_session:
                # Check if user already exists
                existing_user = txn_session.query(User).filter_by(email=email).first()
                if existing_user:
                    raise AuthenticationError("User already exists in database")
                
                # Get or create role
                user_role = txn_session.query(Role).filter_by(role_type=role).first()
                if not user_role:
                    raise ValueError(f"Invalid role: {role}")
                
                # Create user
                new_user = User(
                    email=email,
                    firebase_uid=firebase_user.uid,
                    role_id=user_role.id,
                    auth_provider='firebase',
                    email_verified=False,
                    created_at=datetime.utcnow()
                )
                txn_session.add(new_user)
                txn_session.flush()  # Get the user ID
                
                # Create profile based on role
                if role == 'student':
                    profile = StudentProfile(
                        user_id=new_user.id,
                        name=name,
                        university=kwargs.get('university'),
                        created_at=datetime.utcnow()
                    )
                    txn_session.add(profile)
                elif role == 'instructor':
                    profile = InstructorProfile(
                        user_id=new_user.id,
                        name=name,
                        department=kwargs.get('department'),
                        created_at=datetime.utcnow()
                    )
                    txn_session.add(profile)
                
                # Create audit log
                self._create_audit_log(
                    txn_session,
                    user_id=new_user.id,
                    action='user_created',
                    details={'role': role, 'email': email}
                )
                
                # Commit happens automatically at end of context manager
                
                return {
                    'user_id': str(new_user.id),
                    'firebase_uid': firebase_user.uid,
                    'email': email,
                    'role': role,
                    'created': True
                }
                
        except Exception as e:
            # If Firebase user was created but PostgreSQL failed, delete Firebase user
            if firebase_user:
                try:
                    firebase_auth.delete_user(firebase_user.uid)
                    logger.info(f"Cleaned up Firebase user after PostgreSQL failure: {firebase_user.uid}")
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup Firebase user: {cleanup_error}")
            
            logger.error(f"User creation failed: {e}")
            raise
        finally:
            session.close()
    
    def sync_firebase_user_to_postgres(
        self,
        firebase_uid: str,
        id_token: Optional[str] = None
    ) -> Optional[User]:
        """
        Sync an existing Firebase user to PostgreSQL
        Used when a Firebase user logs in but doesn't exist in PostgreSQL yet
        """
        session = db_manager.get_session()
        
        try:
            # Get Firebase user
            try:
                firebase_user = firebase_auth.get_user(firebase_uid)
            except FirebaseError as e:
                logger.error(f"Failed to get Firebase user: {e}")
                return None
            
            with self.two_phase_commit(session) as txn_session:
                # Check if already exists
                existing_user = txn_session.query(User).filter_by(
                    firebase_uid=firebase_uid
                ).first()
                
                if existing_user:
                    # Update last login
                    existing_user.last_login = datetime.utcnow()
                    existing_user.login_count = (existing_user.login_count or 0) + 1
                    return existing_user
                
                # Create new user
                default_role = txn_session.query(Role).filter_by(
                    role_type='student'
                ).first()
                
                new_user = User(
                    email=firebase_user.email,
                    firebase_uid=firebase_uid,
                    role_id=default_role.id,
                    auth_provider='firebase',
                    email_verified=firebase_user.email_verified,
                    last_login=datetime.utcnow(),
                    login_count=1,
                    created_at=datetime.utcnow()
                )
                txn_session.add(new_user)
                txn_session.flush()
                
                # Create default student profile
                profile = StudentProfile(
                    user_id=new_user.id,
                    name=firebase_user.display_name or firebase_user.email.split('@')[0],
                    created_at=datetime.utcnow()
                )
                txn_session.add(profile)
                
                # Audit log
                self._create_audit_log(
                    txn_session,
                    user_id=new_user.id,
                    action='user_synced_from_firebase',
                    details={'email': firebase_user.email}
                )
                
                logger.info(f"Synced Firebase user to PostgreSQL: {firebase_uid}")
                return new_user
                
        except Exception as e:
            logger.error(f"Failed to sync Firebase user: {e}")
            return None
        finally:
            session.close()
    
    def update_user_with_sync(
        self,
        user_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """
        Update user in both systems with transaction safety
        """
        session = db_manager.get_session()
        original_firebase_data = {}
        
        try:
            with self.two_phase_commit(session) as txn_session:
                # Get user
                user = txn_session.query(User).filter_by(id=user_id).first()
                if not user:
                    raise ValueError("User not found")
                
                # Update Firebase if email or password changed
                firebase_updates = {}
                if 'email' in updates and updates['email'] != user.email:
                    firebase_updates['email'] = updates['email']
                if 'password' in updates:
                    firebase_updates['password'] = updates['password']
                
                if firebase_updates and user.firebase_uid:
                    # Store original data for rollback
                    try:
                        fb_user = firebase_auth.get_user(user.firebase_uid)
                        original_firebase_data = {
                            'email': fb_user.email,
                            'display_name': fb_user.display_name
                        }
                        
                        # Update Firebase
                        firebase_auth.update_user(
                            user.firebase_uid,
                            **firebase_updates
                        )
                    except FirebaseError as e:
                        logger.error(f"Firebase update failed: {e}")
                        raise AuthenticationError(f"Failed to update account: {str(e)}")
                
                # Update PostgreSQL
                if 'email' in updates:
                    user.email = updates['email']
                    user.email_verified = False  # Require re-verification
                
                # Update profile
                if user.student_profile and 'name' in updates:
                    user.student_profile.name = updates['name']
                elif user.instructor_profile and 'name' in updates:
                    user.instructor_profile.name = updates['name']
                
                # Audit log
                self._create_audit_log(
                    txn_session,
                    user_id=user.id,
                    action='user_updated',
                    details={'fields': list(updates.keys())}
                )
                
                return True
                
        except Exception as e:
            # Try to rollback Firebase changes
            if original_firebase_data and user.firebase_uid:
                try:
                    firebase_auth.update_user(
                        user.firebase_uid,
                        **original_firebase_data
                    )
                    logger.info("Rolled back Firebase changes")
                except Exception as rollback_error:
                    logger.error(f"Failed to rollback Firebase: {rollback_error}")
            
            logger.error(f"User update failed: {e}")
            return False
        finally:
            session.close()
    
    def delete_user_with_sync(self, user_id: str) -> bool:
        """
        Delete user from both systems with transaction safety
        """
        session = db_manager.get_session()
        firebase_uid = None
        
        try:
            with self.two_phase_commit(session) as txn_session:
                # Get user
                user = txn_session.query(User).filter_by(id=user_id).first()
                if not user:
                    return False
                
                firebase_uid = user.firebase_uid
                
                # Soft delete in PostgreSQL
                user.deleted_at = datetime.utcnow()
                
                # Delete from Firebase
                if firebase_uid:
                    try:
                        firebase_auth.delete_user(firebase_uid)
                        logger.info(f"Deleted Firebase user: {firebase_uid}")
                    except FirebaseError as e:
                        logger.error(f"Firebase deletion failed: {e}")
                        # Continue with PostgreSQL deletion
                
                # Audit log
                self._create_audit_log(
                    txn_session,
                    user_id=user.id,
                    action='user_deleted',
                    details={'email': user.email}
                )
                
                return True
                
        except Exception as e:
            logger.error(f"User deletion failed: {e}")
            return False
        finally:
            session.close()
    
    def _create_audit_log(
        self,
        session: Session,
        user_id: str,
        action: str,
        details: Optional[Dict] = None
    ):
        """Create audit log entry"""
        from db.schema import AuditLog
        
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type='user',
            resource_id=user_id,
            details=details or {},
            ip_address=None,  # Would be set from request context
            created_at=datetime.utcnow()
        )
        session.add(audit_log)


# Singleton instance
auth_sync_service = AuthSyncService()
"""
Data processing module for streaming personalization
"""
import uuid as uuid_lib
import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import datetime as dt

from sqlalchemy.orm import Session
from db.schema import PersonalizedFile, FileChunk, File
from db.queries import (
    get_user_by_supabase_uid, 
    get_student_profile,
    get_file_by_id
)

from .recommendation_engine import StudentProfile

logger = logging.getLogger(__name__)


class DataProcessor:
    """Handles data processing for personalization"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.logger = logging.getLogger(__name__)
    
    def get_user_info(self, supabase_uid: Optional[str]) -> Tuple[Optional[int], Optional[StudentProfile]]:
        """Get user ID and profile from Supabase UID"""
        if not supabase_uid:
            self.logger.warning("No supabase_uid provided")
            return None, None
        
        try:
            # Get user from supabase UID
            user = get_user_by_supabase_uid(self.db, supabase_uid)
            if not user:
                self.logger.warning(f"User not found for supabase_uid: {supabase_uid}")
                return None, None
            
            # Get student profile
            student_profile_db = get_student_profile(self.db, user.id)
            if not student_profile_db:
                self.logger.warning(f"Student profile not found for user: {user.id}")
                return user.id, None
            
            # Create StudentProfile object
            profile = StudentProfile()
            if student_profile_db.name:
                profile.name = student_profile_db.name
            
            if student_profile_db.onboard_answers:
                answers = student_profile_db.onboard_answers
                profile.learning_style = answers.get('learningStyle')
                profile.interests = answers.get('interests')
                profile.expertise_level = answers.get('depth')
            
            return student_profile_db.user_id, profile
            
        except Exception as e:
            self.logger.error(f"Error getting user info: {str(e)}", exc_info=True)
            return None, None
    
    def check_personalized_content(
        self, 
        user_id: int, 
        file_id: str
    ) -> Optional[Dict[str, Any]]:
        """Check if personalized content exists for user and file"""
        try:
            personalized = self.db.query(PersonalizedFile).filter(
                PersonalizedFile.user_id == user_id,
                PersonalizedFile.original_file_id == file_id
            ).order_by(PersonalizedFile.created_at.desc()).first()
            
            if personalized:
                return {
                    'exists': True,
                    'personalizedFileId': str(personalized.id),
                    'content': personalized.content,
                    'createdAt': personalized.created_at.isoformat()
                }
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error checking personalized content: {str(e)}", exc_info=True)
            raise
    
    def save_personalized_content(
        self, 
        user_id: int, 
        file_id: str, 
        content: Dict[str, Any]
    ) -> bool:
        """Save or update personalized content"""
        try:
            # Check if personalized content already exists
            existing = self.db.query(PersonalizedFile).filter(
                PersonalizedFile.user_id == user_id,
                PersonalizedFile.original_file_id == file_id
            ).first()
            
            if existing:
                # Update existing content
                existing.content = content
                existing.created_at = datetime.now(dt.timezone.utc)
            else:
                # Create new personalized file
                personalized = PersonalizedFile(
                    user_id=user_id,
                    original_file_id=file_id,
                    content=content
                )
                self.db.add(personalized)
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving personalized content: {str(e)}", exc_info=True)
            self.db.rollback()
            raise
    
    def get_file_context(self, file_id: str) -> Tuple[Optional[str], str]:
        """Get file content and name for context"""
        context = None
        file_name = "Document"
        
        try:
            # Validate UUID
            uuid_lib.UUID(file_id)
            
            # Try to get file directly
            file = get_file_by_id(self.db, file_id)
            if file:
                file_name = file.filename
                # Get chunks
                chunks = self.db.query(FileChunk).filter_by(
                    file_id=file_id
                ).order_by(FileChunk.ordering).limit(10).all()
                
                if chunks:
                    context = "\n\n".join([
                        chunk.content for chunk in chunks 
                        if chunk.content
                    ])
            else:
                # Check if it's a personalized file
                personalized_file = self.db.query(PersonalizedFile).filter(
                    PersonalizedFile.id == file_id
                ).first()
                
                if personalized_file and personalized_file.original_file_id:
                    file = get_file_by_id(self.db, personalized_file.original_file_id)
                    if file:
                        file_name = file.filename
                        chunks = self.db.query(FileChunk).filter_by(
                            file_id=personalized_file.original_file_id
                        ).order_by(FileChunk.ordering).limit(10).all()
                        
                        if chunks:
                            context = "\n\n".join([
                                chunk.content for chunk in chunks 
                                if chunk.content
                            ])
                            
        except Exception as e:
            self.logger.warning(f"Error getting file context: {e}")
        
        # Default context if none found
        if not context:
            context = f"""This is a personalized learning experience for {file_name}. 
            The content will be generated in real-time based on your profile and learning preferences.
            Each section is carefully crafted to match your learning style and pace."""
        
        return context, file_name
    
    def get_document_outline(self, file_id: str) -> Dict[str, Any]:
        """Generate document outline for skeleton UI"""
        try:
            # Try to get file info for better outline
            _, file_name = self.get_file_context(file_id)
            
            return {
                "fileId": file_id,
                "fileName": file_name,
                "chapters": [
                    {
                        "id": "chapter-1",
                        "title": "Introduction & Overview",
                        "estimatedTokens": 2000,
                        "subsections": [
                            {"id": "1.1", "title": "Welcome & Context", "estimatedTokens": 500},
                            {"id": "1.2", "title": "Key Concepts", "estimatedTokens": 600},
                            {"id": "1.3", "title": "Learning Objectives", "estimatedTokens": 500},
                            {"id": "1.4", "title": "How to Use This Guide", "estimatedTokens": 400}
                        ]
                    },
                    {
                        "id": "chapter-2",
                        "title": "Core Content",
                        "estimatedTokens": 2500,
                        "subsections": [
                            {"id": "2.1", "title": "Fundamental Principles", "estimatedTokens": 700},
                            {"id": "2.2", "title": "Detailed Explanations", "estimatedTokens": 600},
                            {"id": "2.3", "title": "Examples & Applications", "estimatedTokens": 600},
                            {"id": "2.4", "title": "Common Patterns", "estimatedTokens": 600}
                        ]
                    },
                    {
                        "id": "chapter-3",
                        "title": "Practice & Mastery",
                        "estimatedTokens": 2000,
                        "subsections": [
                            {"id": "3.1", "title": "Hands-on Exercises", "estimatedTokens": 600},
                            {"id": "3.2", "title": "Real-world Scenarios", "estimatedTokens": 500},
                            {"id": "3.3", "title": "Tips & Best Practices", "estimatedTokens": 500},
                            {"id": "3.4", "title": "Next Steps", "estimatedTokens": 400}
                        ]
                    }
                ],
                "totalEstimatedTokens": 6500
            }
            
        except Exception as e:
            self.logger.error(f"Error generating outline: {str(e)}", exc_info=True)
            # Return minimal outline on error
            return {
                "fileId": file_id,
                "fileName": "Document",
                "chapters": [
                    {
                        "id": "chapter-1",
                        "title": "Introduction & Overview",
                        "estimatedTokens": 2000,
                        "subsections": [
                            {"id": "1.1", "title": "Getting Started", "estimatedTokens": 500},
                            {"id": "1.2", "title": "Core Concepts", "estimatedTokens": 600},
                            {"id": "1.3", "title": "Key Objectives", "estimatedTokens": 500},
                            {"id": "1.4", "title": "Learning Path", "estimatedTokens": 400}
                        ]
                    }
                ],
                "totalEstimatedTokens": 2000
            }
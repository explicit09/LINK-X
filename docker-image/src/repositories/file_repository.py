from typing import List, Optional
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from repositories.base_repository import BaseRepository
from db.schema import File, PersonalizedFile, Module
from core.database import db_manager

class FileRepository(BaseRepository[File]):
    """Repository for file-related database operations"""
    
    def __init__(self, session_factory: sessionmaker = None):
        if session_factory is None:
            session_factory = db_manager.session_factory
        super().__init__(File, session_factory)
    
    def get_by_module(self, module_id: str) -> List[File]:
        """Get all files in a module"""
        with self.get_session() as session:
            files = session.query(File)\
                .filter_by(module_id=module_id)\
                .order_by(File.created_at.desc())\
                .all()
            
            # Detach from session
            for file in files:
                session.expunge(file)
            return files
    
    def get_personalized_file(self, file_id: str, user_id: str) -> Optional[PersonalizedFile]:
        """Get personalized version of a file for a user"""
        with self.get_session() as session:
            pf = session.query(PersonalizedFile)\
                .filter_by(original_file_id=file_id, user_id=user_id)\
                .first()
            
            if pf:
                session.expunge(pf)
            return pf
    
    def create_personalized_file(self, user_id: str, original_file_id: str) -> PersonalizedFile:
        """Create a personalized file record"""
        with self.get_session() as session:
            pf = PersonalizedFile(
                user_id=user_id,
                original_file_id=original_file_id,
                processed=False
            )
            session.add(pf)
            session.flush()
            session.refresh(pf)
            
            # Make a copy of the data before detaching
            pf_dict = {c.name: getattr(pf, c.name) 
                      for c in pf.__table__.columns}
            session.expunge(pf)
            
            # Recreate with all data
            return PersonalizedFile(**pf_dict)
    
    def search(self, query: str, course_ids: List[str] = None, 
              course_id: str = None, file_type: str = None) -> List[File]:
        """Search files with various filters"""
        with self.get_session() as session:
            search_term = f"%{query}%"
            q = session.query(File).join(Module)
            
            # Apply search on title and extracted text
            q = q.filter(
                or_(
                    File.title.ilike(search_term),
                    File.extracted_text.ilike(search_term)
                )
            )
            
            # Filter by course if specified
            if course_id:
                q = q.filter(Module.course_id == course_id)
            elif course_ids is not None:
                q = q.filter(Module.course_id.in_(course_ids))
            
            # Filter by file type if specified
            if file_type:
                q = q.filter(File.file_type == file_type)
            
            files = q.limit(50).all()
            
            # Detach from session
            for file in files:
                session.expunge(file)
            return files
    
    def update_processing_status(self, file_id: str, processed: bool, 
                               extracted_text: str = None, error: str = None) -> Optional[File]:
        """Update file processing status"""
        with self.get_session() as session:
            file = session.query(File).filter_by(id=file_id).first()
            if file:
                file.processed = processed
                file.processing_error = error
                if extracted_text:
                    file.extracted_text = extracted_text
                file.processed_at = datetime.utcnow() if processed else None
                session.flush()
                session.refresh(file)
                
                # Make a copy before detaching
                file_dict = {c.name: getattr(file, c.name) 
                            for c in file.__table__.columns}
                session.expunge(file)
                return File(**file_dict)
            return None
    
    def get_unprocessed_files(self, limit: int = 10) -> List[File]:
        """Get files that need processing"""
        with self.get_session() as session:
            files = session.query(File)\
                .filter_by(processed=False)\
                .limit(limit)\
                .all()
            
            # Detach from session
            for file in files:
                session.expunge(file)
            return files
    
    def get_files_by_course(self, course_id: str) -> List[File]:
        """Get all files in a course"""
        with self.get_session() as session:
            files = session.query(File)\
                .join(Module)\
                .filter(Module.course_id == course_id)\
                .order_by(Module.ordering, File.created_at)\
                .all()
            
            # Detach from session
            for file in files:
                session.expunge(file)
            return files
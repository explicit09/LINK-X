from typing import List, Optional
from sqlalchemy import and_, or_, func
from datetime import datetime

from repositories.base_repository import BaseRepository
from db.schema import File, PersonalizedFile, Module

class FileRepository(BaseRepository[File]):
    """Repository for file-related database operations"""
    
    def __init__(self):
        super().__init__(File)
    
    def get_by_module(self, module_id: str) -> List[File]:
        """Get all files in a module"""
        try:
            return self.db.query(File)\
                .filter_by(module_id=module_id)\
                .order_by(File.created_at.desc())\
                .all()
        finally:
            self.db.close()
    
    def get_personalized_file(self, file_id: str, user_id: str) -> Optional[PersonalizedFile]:
        """Get personalized version of a file for a user"""
        try:
            return self.db.query(PersonalizedFile)\
                .filter_by(original_file_id=file_id, user_id=user_id)\
                .first()
        finally:
            self.db.close()
    
    def create_personalized_file(self, user_id: str, original_file_id: str) -> PersonalizedFile:
        """Create a personalized file record"""
        try:
            pf = PersonalizedFile(
                user_id=user_id,
                original_file_id=original_file_id,
                processed=False
            )
            self.db.add(pf)
            self.db.commit()
            self.db.refresh(pf)
            return pf
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def search(self, query: str, course_ids: List[str] = None, 
              course_id: str = None, file_type: str = None) -> List[File]:
        """Search files with various filters"""
        try:
            search_term = f"%{query}%"
            q = self.db.query(File).join(Module)
            
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
            
            return q.limit(50).all()
        finally:
            self.db.close()
    
    def update_processing_status(self, file_id: str, processed: bool, 
                               extracted_text: str = None, error: str = None) -> Optional[File]:
        """Update file processing status"""
        try:
            file = self.db.query(File).filter_by(id=file_id).first()
            if file:
                file.processed = processed
                file.processing_error = error
                if extracted_text:
                    file.extracted_text = extracted_text
                file.processed_at = datetime.utcnow() if processed else None
                self.db.commit()
                self.db.refresh(file)
            return file
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def get_unprocessed_files(self, limit: int = 10) -> List[File]:
        """Get files that need processing"""
        try:
            return self.db.query(File)\
                .filter_by(processed=False)\
                .limit(limit)\
                .all()
        finally:
            self.db.close()
    
    def get_files_by_course(self, course_id: str) -> List[File]:
        """Get all files in a course"""
        try:
            return self.db.query(File)\
                .join(Module)\
                .filter(Module.course_id == course_id)\
                .order_by(Module.ordering, File.created_at)\
                .all()
        finally:
            self.db.close()
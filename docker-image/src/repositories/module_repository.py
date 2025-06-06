from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import sessionmaker

from repositories.base_repository import BaseRepository
from db.schema import Module, File
from core.database_supabase import db_manager

class ModuleRepository(BaseRepository[Module]):
    """Repository for module-related database operations"""
    
    def __init__(self, session_factory: sessionmaker = None):
        if session_factory is None:
            session_factory = db_manager.session_factory
        super().__init__(Module, session_factory)
    
    def get_by_course(self, course_id: str) -> List[Module]:
        """Get all modules for a course ordered by ordering"""
        with self.get_session() as session:
            modules = session.query(Module)\
                .filter_by(course_id=course_id)\
                .order_by(Module.ordering)\
                .all()
            
            # Detach from session
            for module in modules:
                session.expunge(module)
            return modules
    
    def get_with_files(self, module_id: str) -> Optional[Module]:
        """Get module with its files"""
        with self.get_session() as session:
            module = session.query(Module)\
                .filter_by(id=module_id)\
                .first()
            
            if module:
                # Load files
                files = session.query(File)\
                    .filter_by(module_id=module_id)\
                    .order_by(File.created_at)\
                    .all()
                
                # Detach module and files
                session.expunge(module)
                for file in files:
                    session.expunge(file)
                
                # Manually set files after detachment
                module.files = files
            
            return module
    
    def update_ordering(self, course_id: str, module_orders: List[tuple]) -> bool:
        """Update module ordering for a course
        module_orders: List of (module_id, order) tuples
        """
        with self.get_session() as session:
            for module_id, order in module_orders:
                session.query(Module)\
                    .filter_by(id=module_id, course_id=course_id)\
                    .update({'ordering': order})
            
            # Commit is handled by context manager
            return True
    
    def get_next_order(self, course_id: str) -> int:
        """Get the next ordering number for a new module"""
        with self.get_session() as session:
            max_order = session.query(func.max(Module.ordering))\
                .filter_by(course_id=course_id)\
                .scalar()
            
            return (max_order or 0) + 1
    
    def count_files(self, module_id: str) -> int:
        """Count files in a module"""
        with self.get_session() as session:
            return session.query(File)\
                .filter_by(module_id=module_id)\
                .count()
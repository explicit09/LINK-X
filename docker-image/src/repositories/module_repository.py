from typing import List, Optional
from sqlalchemy import func

from repositories.base_repository import BaseRepository
from db.schema import Module, File

class ModuleRepository(BaseRepository[Module]):
    """Repository for module-related database operations"""
    
    def __init__(self):
        super().__init__(Module)
    
    def get_by_course(self, course_id: str) -> List[Module]:
        """Get all modules for a course ordered by ordering"""
        try:
            return self.db.query(Module)\
                .filter_by(course_id=course_id)\
                .order_by(Module.ordering)\
                .all()
        finally:
            self.db.close()
    
    def get_with_files(self, module_id: str) -> Optional[Module]:
        """Get module with its files"""
        try:
            module = self.db.query(Module)\
                .filter_by(id=module_id)\
                .first()
            
            if module:
                # Load files
                module.files = self.db.query(File)\
                    .filter_by(module_id=module_id)\
                    .order_by(File.created_at)\
                    .all()
            
            return module
        finally:
            self.db.close()
    
    def update_ordering(self, course_id: str, module_orders: List[tuple]) -> bool:
        """Update module ordering for a course
        module_orders: List of (module_id, order) tuples
        """
        try:
            for module_id, order in module_orders:
                self.db.query(Module)\
                    .filter_by(id=module_id, course_id=course_id)\
                    .update({'ordering': order})
            
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def get_next_order(self, course_id: str) -> int:
        """Get the next ordering number for a new module"""
        try:
            max_order = self.db.query(func.max(Module.ordering))\
                .filter_by(course_id=course_id)\
                .scalar()
            
            return (max_order or 0) + 1
        finally:
            self.db.close()
    
    def count_files(self, module_id: str) -> int:
        """Count files in a module"""
        try:
            return self.db.query(File)\
                .filter_by(module_id=module_id)\
                .count()
        finally:
            self.db.close()
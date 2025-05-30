from typing import Generic, TypeVar, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from core.database import db_manager

T = TypeVar('T')

class BaseRepository(Generic[T]):
    """Base repository with common CRUD operations"""
    
    def __init__(self, model: T):
        self.model = model
    
    @property
    def db(self) -> Session:
        """Get database session"""
        return db_manager.get_session()
    
    def get_by_id(self, id: str) -> Optional[T]:
        """Get entity by ID"""
        try:
            return self.db.query(self.model).filter_by(id=id).first()
        finally:
            self.db.close()
    
    def get_all(self) -> List[T]:
        """Get all entities"""
        try:
            return self.db.query(self.model).all()
        finally:
            self.db.close()
    
    def get_all_paginated(self, offset: int = 0, limit: int = 20) -> List[T]:
        """Get all entities with pagination"""
        try:
            return self.db.query(self.model).offset(offset).limit(limit).all()
        finally:
            self.db.close()
    
    def create(self, **kwargs) -> T:
        """Create new entity"""
        try:
            entity = self.model(**kwargs)
            self.db.add(entity)
            self.db.commit()
            self.db.refresh(entity)
            return entity
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def update(self, id: str, **kwargs) -> Optional[T]:
        """Update entity"""
        try:
            entity = self.db.query(self.model).filter_by(id=id).first()
            if entity:
                for key, value in kwargs.items():
                    if hasattr(entity, key):
                        setattr(entity, key, value)
                self.db.commit()
                self.db.refresh(entity)
            return entity
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def delete(self, id: str) -> bool:
        """Delete entity"""
        try:
            entity = self.db.query(self.model).filter_by(id=id).first()
            if entity:
                self.db.delete(entity)
                self.db.commit()
                return True
            return False
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def count(self, **filters) -> int:
        """Count entities with optional filters"""
        try:
            query = self.db.query(self.model)
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
            return query.count()
        finally:
            self.db.close()
    
    def exists(self, **filters) -> bool:
        """Check if entity exists with given filters"""
        try:
            query = self.db.query(self.model)
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
            return query.first() is not None
        finally:
            self.db.close()
    
    def find_by(self, **filters) -> Optional[T]:
        """Find single entity by filters"""
        try:
            query = self.db.query(self.model)
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
            return query.first()
        finally:
            self.db.close()
    
    def find_all_by(self, **filters) -> List[T]:
        """Find all entities by filters"""
        try:
            query = self.db.query(self.model)
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
            return query.all()
        finally:
            self.db.close()
    
    def bulk_create(self, entities: List[Dict[str, Any]]) -> List[T]:
        """Create multiple entities"""
        try:
            objects = [self.model(**entity) for entity in entities]
            self.db.bulk_save_objects(objects, return_defaults=True)
            self.db.commit()
            return objects
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
    
    def bulk_update(self, updates: List[Dict[str, Any]]) -> int:
        """Update multiple entities"""
        try:
            count = 0
            for update in updates:
                id = update.pop('id', None)
                if id:
                    entity = self.db.query(self.model).filter_by(id=id).first()
                    if entity:
                        for key, value in update.items():
                            if hasattr(entity, key):
                                setattr(entity, key, value)
                        count += 1
            self.db.commit()
            return count
        except Exception as e:
            self.db.rollback()
            raise e
        finally:
            self.db.close()
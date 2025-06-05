"""
Base Repository with Dependency Injection
Uses session factory instead of global db_manager
"""

from typing import Generic, TypeVar, Optional, List, Dict, Any, Type
from contextlib import contextmanager
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import and_, or_
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class BaseRepository(Generic[T]):
    """
    Base repository with common CRUD operations using dependency injection
    """
    
    def __init__(self, model: Type[T], session_factory: sessionmaker):
        """
        Initialize repository with model and session factory
        
        Args:
            model: SQLAlchemy model class
            session_factory: Session factory from DI container
        """
        self.model = model
        self.session_factory = session_factory
        
    @contextmanager
    def get_session(self) -> Session:
        """
        Get database session with proper cleanup
        
        Yields:
            Database session
        """
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def get_by_id(self, id: Any, load_options: Optional[List] = None) -> Optional[T]:
        """
        Get entity by ID
        
        Args:
            id: Entity ID
            load_options: Optional SQLAlchemy load options (joinedload, etc.)
            
        Returns:
            Entity or None
        """
        with self.get_session() as session:
            query = session.query(self.model)
            
            # Apply load options if provided
            if load_options:
                for option in load_options:
                    query = query.options(option)
                    
            # Handle different ID field names
            if hasattr(self.model, 'id'):
                entity = query.filter(self.model.id == id).first()
            elif hasattr(self.model, f'{self.model.__tablename__}_id'):
                # Handle tables with prefixed ID (e.g., user_id, course_id)
                id_field = getattr(self.model, f'{self.model.__tablename__}_id')
                entity = query.filter(id_field == id).first()
            else:
                raise AttributeError(f"Model {self.model.__name__} has no id field")
                
            if entity:
                # Detach from session to avoid lazy loading issues
                session.expunge(entity)
            return entity
    
    def get_all(self, load_options: Optional[List] = None) -> List[T]:
        """Get all entities"""
        with self.get_session() as session:
            query = session.query(self.model)
            
            if load_options:
                for option in load_options:
                    query = query.options(option)
                    
            entities = query.all()
            
            # Detach all entities
            for entity in entities:
                session.expunge(entity)
            return entities
    
    def get_paginated(self, offset: int = 0, limit: int = 20, 
                      filters: Optional[Dict] = None,
                      order_by: Optional[Any] = None,
                      load_options: Optional[List] = None) -> Dict[str, Any]:
        """
        Get paginated results
        
        Args:
            offset: Number of records to skip
            limit: Maximum number of records to return
            filters: Optional filters to apply
            order_by: Optional ordering
            load_options: Optional SQLAlchemy load options
            
        Returns:
            Dict with items and total count
        """
        with self.get_session() as session:
            query = session.query(self.model)
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key):
                        query = query.filter(getattr(self.model, key) == value)
                        
            # Get total count before pagination
            total = query.count()
            
            # Apply ordering
            if order_by is not None:
                query = query.order_by(order_by)
                
            # Apply load options
            if load_options:
                for option in load_options:
                    query = query.options(option)
                    
            # Apply pagination
            items = query.offset(offset).limit(limit).all()
            
            # Detach all items
            for item in items:
                session.expunge(item)
                
            return {
                'items': items,
                'total': total,
                'offset': offset,
                'limit': limit
            }
    
    def create(self, **kwargs) -> T:
        """Create new entity"""
        with self.get_session() as session:
            entity = self.model(**kwargs)
            session.add(entity)
            session.flush()  # Flush to get ID
            session.refresh(entity)  # Refresh to load all fields
            
            # Expunge the entity to detach it from the session safely
            session.expunge(entity)
            
            # Return the detached entity directly (no need to recreate)
            return entity
    
    def update(self, id: Any, **kwargs) -> Optional[T]:
        """Update entity"""
        if id is None:
            logger.error("Cannot update entity: ID is None")
            return None
            
        with self.get_session() as session:
            entity = self.get_by_id(id)
            if not entity:
                logger.error(f"Cannot update entity: No entity found with ID {id}")
                return None
                
            try:
                # Re-attach to session
                entity = session.merge(entity)
                
                # Update fields
                for key, value in kwargs.items():
                    if hasattr(entity, key):
                        setattr(entity, key, value)
                        
                session.flush()
                session.refresh(entity)
                
                # Detach and return
                session.expunge(entity)
                return entity
            except Exception as e:
                logger.error(f"Error updating entity with ID {id}: {type(e).__name__}: {str(e)}")
                raise
    
    def delete(self, id: Any) -> bool:
        """Delete entity"""
        with self.get_session() as session:
            entity = self.get_by_id(id)
            if not entity:
                return False
                
            # Re-attach and delete
            entity = session.merge(entity)
            session.delete(entity)
            return True
    
    def count(self, **filters) -> int:
        """Count entities with optional filters"""
        with self.get_session() as session:
            query = session.query(self.model)
            
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
                    
            return query.count()
    
    def exists(self, **filters) -> bool:
        """Check if entity exists with given filters"""
        return self.count(**filters) > 0
    
    def find_by(self, load_options: Optional[List] = None, **filters) -> Optional[T]:
        """Find single entity by filters"""
        with self.get_session() as session:
            query = session.query(self.model)
            
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
                    
            if load_options:
                for option in load_options:
                    query = query.options(option)
                    
            entity = query.first()
            if entity:
                session.expunge(entity)
            return entity
    
    def find_all_by(self, load_options: Optional[List] = None, **filters) -> List[T]:
        """Find all entities by filters"""
        with self.get_session() as session:
            query = session.query(self.model)
            
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
                    
            if load_options:
                for option in load_options:
                    query = query.options(option)
                    
            entities = query.all()
            for entity in entities:
                session.expunge(entity)
            return entities
    
    def bulk_create(self, entities: List[Dict[str, Any]]) -> List[T]:
        """Create multiple entities"""
        with self.get_session() as session:
            objects = []
            for entity_data in entities:
                entity = self.model(**entity_data)
                session.add(entity)
                objects.append(entity)
                
            session.flush()
            
            # Refresh and expunge objects
            for obj in objects:
                session.refresh(obj)
                session.expunge(obj)
                
            return objects
    
    def bulk_update(self, updates: List[Dict[str, Any]]) -> int:
        """
        Update multiple entities
        
        Args:
            updates: List of dicts with 'id' and fields to update
            
        Returns:
            Number of entities updated
        """
        count = 0
        with self.get_session() as session:
            for update in updates:
                id_value = update.pop('id', None)
                if id_value and update:
                    entity = self.get_by_id(id_value)
                    if entity:
                        entity = session.merge(entity)
                        for key, value in update.items():
                            if hasattr(entity, key):
                                setattr(entity, key, value)
                        count += 1
                        
        return count
    
    def execute_query(self, query: Any) -> List[Any]:
        """Execute raw SQLAlchemy query"""
        with self.get_session() as session:
            return session.execute(query).fetchall()
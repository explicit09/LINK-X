from typing import List, Optional
from sqlalchemy import desc
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from repositories.base_repository import BaseRepository
from db.schema import Todo
from core.exceptions import NotFoundError
from core.database_supabase import db_manager

class TodoRepository(BaseRepository[Todo]):
    """Repository for Todo operations"""
    
    def __init__(self, session_factory: sessionmaker = None):
        if session_factory is None:
            session_factory = db_manager.session_factory
        super().__init__(Todo, session_factory)
    
    def get_by_user(self, user_id: str, completed: Optional[bool] = None) -> List[Todo]:
        """Get all todos for a user, optionally filtered by completion status"""
        with self.get_session() as session:
            query = session.query(Todo).filter(Todo.user_id == user_id)
            
            if completed is not None:
                query = query.filter(Todo.completed == completed)
            
            todos = query.order_by(desc(Todo.created_at)).all()
            
            # Detach from session
            for todo in todos:
                session.expunge(todo)
            return todos
    
    def create_todo(self, user_id: str, title: str, course: str, type: str, 
                   priority: str, due_date: Optional[datetime] = None) -> Todo:
        """Create a new todo item"""
        # Use the base class create method
        return self.create(
            user_id=user_id,
            title=title,
            course=course,
            type=type,
            priority=priority,
            due_date=due_date,
            completed=False
        )
    
    def update_todo(self, todo_id: str, user_id: str, **kwargs) -> Optional[Todo]:
        """Update a todo item"""
        with self.get_session() as session:
            todo = session.query(Todo).filter(
                Todo.id == todo_id,
                Todo.user_id == user_id
            ).first()
            
            if not todo:
                return None
            
            # Update allowed fields
            allowed_fields = ['title', 'course', 'type', 'priority', 'due_date', 'completed']
            for field, value in kwargs.items():
                if field in allowed_fields:
                    setattr(todo, field, value)
            
            session.flush()
            session.refresh(todo)
            
            # Make a copy before detaching
            todo_dict = {c.name: getattr(todo, c.name) 
                        for c in todo.__table__.columns}
            session.expunge(todo)
            
            return Todo(**todo_dict)
    
    def delete_todo(self, todo_id: str, user_id: str) -> bool:
        """Delete a todo item"""
        with self.get_session() as session:
            result = session.query(Todo).filter(
                Todo.id == todo_id,
                Todo.user_id == user_id
            ).delete()
            
            # Commit is handled by context manager
            return result > 0
    
    def mark_completed(self, todo_id: str, user_id: str) -> Optional[Todo]:
        """Mark a todo as completed"""
        return self.update_todo(todo_id, user_id, completed=True)
    
    def mark_incomplete(self, todo_id: str, user_id: str) -> Optional[Todo]:
        """Mark a todo as incomplete"""
        return self.update_todo(todo_id, user_id, completed=False)
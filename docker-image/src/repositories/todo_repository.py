from typing import List, Optional
from sqlalchemy import desc
from datetime import datetime

from .base_repository import BaseRepository
from ..db.schema import Todo
from ..core.exceptions import NotFoundError

class TodoRepository(BaseRepository[Todo]):
    """Repository for Todo operations"""
    
    def __init__(self):
        super().__init__(Todo)
    
    def get_by_user(self, user_id: str, completed: Optional[bool] = None) -> List[Todo]:
        """Get all todos for a user, optionally filtered by completion status"""
        query = self.db.query(Todo).filter(Todo.user_id == user_id)
        
        if completed is not None:
            query = query.filter(Todo.completed == completed)
        
        return query.order_by(desc(Todo.created_at)).all()
    
    def create_todo(self, user_id: str, title: str, course: str, type: str, 
                   priority: str, due_date: Optional[datetime] = None) -> Todo:
        """Create a new todo item"""
        todo = Todo(
            user_id=user_id,
            title=title,
            course=course,
            type=type,
            priority=priority,
            due_date=due_date,
            completed=False
        )
        
        self.db.add(todo)
        self.db.commit()
        self.db.refresh(todo)
        
        return todo
    
    def update_todo(self, todo_id: str, user_id: str, **kwargs) -> Optional[Todo]:
        """Update a todo item"""
        todo = self.db.query(Todo).filter(
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
        
        self.db.commit()
        self.db.refresh(todo)
        
        return todo
    
    def delete_todo(self, todo_id: str, user_id: str) -> bool:
        """Delete a todo item"""
        result = self.db.query(Todo).filter(
            Todo.id == todo_id,
            Todo.user_id == user_id
        ).delete()
        
        self.db.commit()
        return result > 0
    
    def mark_completed(self, todo_id: str, user_id: str) -> Optional[Todo]:
        """Mark a todo as completed"""
        return self.update_todo(todo_id, user_id, completed=True)
    
    def mark_incomplete(self, todo_id: str, user_id: str) -> Optional[Todo]:
        """Mark a todo as incomplete"""
        return self.update_todo(todo_id, user_id, completed=False)
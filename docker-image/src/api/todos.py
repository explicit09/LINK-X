from flask import Blueprint, request, jsonify, g
from datetime import datetime
from sqlalchemy import desc
import uuid

from core.database_supabase import db
from db.schema import Todo
from repositories.todo_repository import TodoRepository
from repositories.course_repository import CourseRepository

todos_bp = Blueprint('todos', __name__)

@todos_bp.route('', methods=['GET'])

def list_todos():
    """Get all todos for the current user"""
    todo_repo = TodoRepository()
    todos = todo_repo.get_by_user("default-user-id")
    
    # Transform todos to match frontend expectations
    todo_items = []
    for t in todos:
        # Get course name if course_id exists
        course_name = "General"
        if t.course_id:
            course_repo = CourseRepository()
            course = course_repo.get_by_id(t.course_id)
            if course:
                course_name = course.title
        
        # Determine type based on title or description
        todo_type = "assignment"  # default
        title_lower = t.title.lower()
        if "quiz" in title_lower:
            todo_type = "quiz"
        elif "read" in title_lower:
            todo_type = "reading"
        elif "review" in title_lower:
            todo_type = "review"
        
        # Determine priority based on due date
        priority = "medium"  # default
        if t.due_date:
            days_until_due = (t.due_date - datetime.now()).days
            if days_until_due <= 1:
                priority = "high"
            elif days_until_due >= 7:
                priority = "low"
        
        todo_items.append({
            'id': str(t.id),
            'title': t.title,
            'course': course_name,
            'dueDate': t.due_date.isoformat() if t.due_date else None,
            'type': todo_type,
            'priority': priority,
            'completed': t.completed,
            'description': t.description,
            'course_id': str(t.course_id) if t.course_id else None,
            'created_at': t.created_at.isoformat() if t.created_at else None
        })
    
    return jsonify(todo_items), 200

@todos_bp.route('', methods=['POST'])

def create_todo():
    """Create a new todo"""
    data = request.get_json() or {}
    title = data.get('title')
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    
    todo_repo = TodoRepository()
    todo = todo_repo.create(
        user_id="default-user-id",
        title=title,
        description=data.get('description', ''),
        due_date=data.get('due_date'),
        course_id=data.get('course_id')
    )
    
    # Get course name if course_id exists
    course_name = "General"
    if todo.course_id:
        course_repo = CourseRepository()
        course = course_repo.get_by_id(todo.course_id)
        if course:
            course_name = course.title
    
    # Determine type and priority
    todo_type = "assignment"
    title_lower = todo.title.lower()
    if "quiz" in title_lower:
        todo_type = "quiz"
    elif "read" in title_lower:
        todo_type = "reading"
    elif "review" in title_lower:
        todo_type = "review"
    
    priority = "medium"
    if todo.due_date:
        days_until_due = (todo.due_date - datetime.now()).days
        if days_until_due <= 1:
            priority = "high"
        elif days_until_due >= 7:
            priority = "low"
    
    return jsonify({
        'id': str(todo.id),
        'title': todo.title,
        'course': course_name,
        'dueDate': todo.due_date.isoformat() if todo.due_date else None,
        'type': todo_type,
        'priority': priority,
        'completed': todo.completed,
        'description': todo.description,
        'course_id': str(todo.course_id) if todo.course_id else None,
        'created_at': todo.created_at.isoformat() if todo.created_at else None
    }), 201

@todos_bp.route('/<todo_id>', methods=['GET'])

def get_todo(todo_id):
    """Get a specific todo"""
    todo_repo = TodoRepository()
    todo = todo_repo.get_by_id(todo_id)
    
    if not todo or str(todo.user_id) != str("default-user-id"):
        return jsonify({'error': 'Todo not found'}), 404
    
    # Get course name if course_id exists
    course_name = "General"
    if todo.course_id:
        course_repo = CourseRepository()
        course = course_repo.get_by_id(todo.course_id)
        if course:
            course_name = course.title
    
    # Determine type and priority
    todo_type = "assignment"
    title_lower = todo.title.lower()
    if "quiz" in title_lower:
        todo_type = "quiz"
    elif "read" in title_lower:
        todo_type = "reading"
    elif "review" in title_lower:
        todo_type = "review"
    
    priority = "medium"
    if todo.due_date:
        days_until_due = (todo.due_date - datetime.now()).days
        if days_until_due <= 1:
            priority = "high"
        elif days_until_due >= 7:
            priority = "low"
    
    return jsonify({
        'id': str(todo.id),
        'title': todo.title,
        'course': course_name,
        'dueDate': todo.due_date.isoformat() if todo.due_date else None,
        'type': todo_type,
        'priority': priority,
        'completed': todo.completed,
        'description': todo.description,
        'course_id': str(todo.course_id) if todo.course_id else None,
        'created_at': todo.created_at.isoformat() if todo.created_at else None
    }), 200

@todos_bp.route('/<todo_id>', methods=['PATCH'])

def update_todo(todo_id):
    """Update a todo"""
    data = request.get_json() or {}
    
    todo_repo = TodoRepository()
    todo = todo_repo.get_by_id(todo_id)
    
    if not todo or str(todo.user_id) != str("default-user-id"):
        return jsonify({'error': 'Todo not found'}), 404
    
    # Update fields
    allowed_fields = ['title', 'description', 'due_date', 'completed', 'course_id']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        return jsonify({'error': 'No valid fields to update'}), 400
    
    updated_todo = todo_repo.update(todo_id, **update_data)
    
    # Get course name if course_id exists
    course_name = "General"
    if updated_todo.course_id:
        course_repo = CourseRepository()
        course = course_repo.get_by_id(updated_todo.course_id)
        if course:
            course_name = course.title
    
    # Determine type and priority
    todo_type = "assignment"
    title_lower = updated_todo.title.lower()
    if "quiz" in title_lower:
        todo_type = "quiz"
    elif "read" in title_lower:
        todo_type = "reading"
    elif "review" in title_lower:
        todo_type = "review"
    
    priority = "medium"
    if updated_todo.due_date:
        days_until_due = (updated_todo.due_date - datetime.now()).days
        if days_until_due <= 1:
            priority = "high"
        elif days_until_due >= 7:
            priority = "low"
    
    return jsonify({
        'id': str(updated_todo.id),
        'title': updated_todo.title,
        'course': course_name,
        'dueDate': updated_todo.due_date.isoformat() if updated_todo.due_date else None,
        'type': todo_type,
        'priority': priority,
        'completed': updated_todo.completed,
        'description': updated_todo.description,
        'course_id': str(updated_todo.course_id) if updated_todo.course_id else None,
        'created_at': updated_todo.created_at.isoformat() if updated_todo.created_at else None
    }), 200

@todos_bp.route('/<todo_id>', methods=['DELETE'])

def delete_todo(todo_id):
    """Delete a todo"""
    todo_repo = TodoRepository()
    todo = todo_repo.get_by_id(todo_id)
    
    if not todo or str(todo.user_id) != str("default-user-id"):
        return jsonify({'error': 'Todo not found'}), 404
    
    todo_repo.delete(todo_id)
    return jsonify({'message': 'Todo deleted successfully'}), 200
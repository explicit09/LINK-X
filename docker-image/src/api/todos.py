from flask import Blueprint, request, jsonify, g
from datetime import datetime
from sqlalchemy import desc
import uuid
import json

from ..core.decorators import firebase_auth_required, validate_json
from ..core.exceptions import NotFoundError, ValidationError
from ..repositories.todo_repository import TodoRepository

bp = Blueprint('todos', __name__)

@bp.route('', methods=['GET'])
@firebase_auth_required
def get_todos():
    """Get all todos for the current user"""
    user = g.current_user
    user_id = str(user.id)
    
    # Get query parameters
    completed = request.args.get('completed')
    if completed is not None:
        completed = completed.lower() == 'true'
    
    # Get todos from database
    todo_repo = TodoRepository()
    todos = todo_repo.get_by_user(user_id, completed)
    
    # Convert to dict format
    todos_data = []
    for todo in todos:
        todos_data.append({
            'id': str(todo.id),
            'title': todo.title,
            'course': todo.course,
            'type': todo.type,
            'priority': todo.priority,
            'dueDate': todo.due_date.isoformat() if todo.due_date else None,
            'completed': todo.completed,
            'createdAt': todo.created_at.isoformat()
        })
    
    return jsonify(todos_data), 200

@bp.route('', methods=['POST'])
@firebase_auth_required
@validate_json(['title', 'type', 'priority'])
def create_todo():
    """Create a new todo item"""
    user = g.current_user
    user_id = str(user.id)
    data = request.get_json()
    
    # Validate input
    if data['type'] not in ['quiz', 'assignment', 'reading', 'review']:
        return jsonify({'error': 'Invalid todo type'}), 400
    
    if data['priority'] not in ['high', 'medium', 'low']:
        return jsonify({'error': 'Invalid priority'}), 400
    
    # Parse due date if provided
    due_date = None
    if 'dueDate' in data and data['dueDate']:
        try:
            due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
        except:
            pass
    
    # Create todo in database
    todo_repo = TodoRepository()
    todo = todo_repo.create_todo(
        user_id=user_id,
        title=data['title'],
        course=data.get('course', 'General'),
        type=data['type'],
        priority=data['priority'],
        due_date=due_date
    )
    
    # Return created todo
    return jsonify({
        'id': str(todo.id),
        'title': todo.title,
        'course': todo.course,
        'type': todo.type,
        'priority': todo.priority,
        'dueDate': todo.due_date.isoformat() if todo.due_date else None,
        'completed': todo.completed,
        'createdAt': todo.created_at.isoformat()
    }), 201

@bp.route('/<todo_id>', methods=['PATCH'])
@firebase_auth_required
def update_todo(todo_id):
    """Update a todo item"""
    user = g.current_user
    user_id = str(user.id)
    data = request.get_json()
    
    # Parse due date if provided
    if 'dueDate' in data and data['dueDate']:
        try:
            data['due_date'] = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
            del data['dueDate']
        except:
            pass
    
    # Update todo in database
    todo_repo = TodoRepository()
    todo = todo_repo.update_todo(todo_id, user_id, **data)
    
    if not todo:
        return jsonify({'error': 'Todo not found'}), 404
    
    return jsonify({
        'message': 'Todo updated successfully',
        'todo': {
            'id': str(todo.id),
            'title': todo.title,
            'course': todo.course,
            'type': todo.type,
            'priority': todo.priority,
            'dueDate': todo.due_date.isoformat() if todo.due_date else None,
            'completed': todo.completed,
            'createdAt': todo.created_at.isoformat()
        }
    }), 200

@bp.route('/<todo_id>', methods=['DELETE'])
@firebase_auth_required
def delete_todo(todo_id):
    """Delete a todo item"""
    user = g.current_user
    user_id = str(user.id)
    
    # Delete from database
    todo_repo = TodoRepository()
    success = todo_repo.delete_todo(todo_id, user_id)
    
    if not success:
        return jsonify({'error': 'Todo not found'}), 404
    
    return jsonify({'message': 'Todo deleted successfully'}), 200

@bp.route('/<todo_id>/complete', methods=['POST'])
@firebase_auth_required
def complete_todo(todo_id):
    """Mark a todo as completed"""
    user = g.current_user
    user_id = str(user.id)
    
    todo_repo = TodoRepository()
    todo = todo_repo.mark_completed(todo_id, user_id)
    
    if not todo:
        return jsonify({'error': 'Todo not found'}), 404
    
    return jsonify({'message': 'Todo marked as completed'}), 200

@bp.route('/<todo_id>/incomplete', methods=['POST'])
@firebase_auth_required
def incomplete_todo(todo_id):
    """Mark a todo as incomplete"""
    user = g.current_user
    user_id = str(user.id)
    
    todo_repo = TodoRepository()
    todo = todo_repo.mark_incomplete(todo_id, user_id)
    
    if not todo:
        return jsonify({'error': 'Todo not found'}), 404
    
    return jsonify({'message': 'Todo marked as incomplete'}), 200
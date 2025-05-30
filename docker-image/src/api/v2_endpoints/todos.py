"""
API v2 Todo Endpoints
"""
from flask import Blueprint, request, g
from datetime import datetime
import logging

from core.decorators_unified import firebase_auth_required
from core.exceptions import ValidationError, NotFoundError
from repositories.todo_repository import TodoRepository

from .utils import success_response, error_response, paginated_response, validate_pagination

logger = logging.getLogger(__name__)

# Create todos blueprint
todos_bp = Blueprint('api_v2_todos', __name__)

# Initialize repository
todo_repo = TodoRepository()


@todos_bp.route('', methods=['GET'])
@firebase_auth_required
def list_todos_v2():
    """List todos with pagination and filtering"""
    try:
        user = g.current_user
        
        # Pagination
        page, per_page = validate_pagination()
        
        # Filtering
        status = request.args.get('status', 'all')  # all, completed, pending
        priority = request.args.get('priority')  # high, medium, low
        
        # Get all todos for user
        all_todos = todo_repo.get_by_user(str(user.id))
        
        # Filter by status
        if status == 'completed':
            todos = [t for t in all_todos if t.completed]
        elif status == 'pending':
            todos = [t for t in all_todos if not t.completed]
        else:
            todos = all_todos
        
        # Filter by priority
        if priority and priority in ['high', 'medium', 'low']:
            todos = [t for t in todos if t.priority == priority]
        
        # Calculate pagination
        total = len(todos)
        start = (page - 1) * per_page
        end = start + per_page
        todos = todos[start:end]
        
        # Format todos
        formatted_todos = []
        for todo in todos:
            formatted_todos.append({
                'id': str(todo.id),
                'title': todo.title,
                'description': todo.description,
                'priority': todo.priority,
                'completed': todo.completed,
                'completed_at': todo.completed_at.isoformat() if todo.completed_at else None,
                'due_date': todo.due_date.isoformat() if todo.due_date else None,
                'created_at': todo.created_at.isoformat() if todo.created_at else None,
                'updated_at': todo.last_updated.isoformat() if todo.last_updated else None
            })
        
        return paginated_response(
            items=formatted_todos,
            page=page,
            per_page=per_page,
            total=total,
            endpoint='api_v2_todos.list_todos_v2',
            status=status,
            priority=priority
        )
        
    except Exception as e:
        logger.error(f"List todos error: {str(e)}")
        return error_response("An error occurred fetching todos", status_code=500)


@todos_bp.route('', methods=['POST'])
@firebase_auth_required
def create_todo_v2():
    """Create a new todo item"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        # Validate required fields
        if 'title' not in data:
            return error_response("Title is required")
        
        # Create todo
        todo = todo_repo.create(
            user_id=str(user.id),
            title=data['title'],
            description=data.get('description', ''),
            priority=data.get('priority', 'medium'),
            due_date=data.get('due_date')
        )
        
        # Format response
        formatted_todo = {
            'id': str(todo.id),
            'title': todo.title,
            'description': todo.description,
            'priority': todo.priority,
            'completed': False,
            'completed_at': None,
            'due_date': todo.due_date.isoformat() if todo.due_date else None,
            'created_at': datetime.utcnow().isoformat()
        }
        
        return success_response(
            formatted_todo,
            message="Todo created successfully",
            status_code=201
        )
        
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"Create todo error: {str(e)}")
        return error_response("An error occurred creating the todo", status_code=500)


@todos_bp.route('/<todo_id>', methods=['GET'])
@firebase_auth_required
def get_todo_v2(todo_id):
    """Get a specific todo item"""
    try:
        user = g.current_user
        
        # Get todo
        todo = todo_repo.get_by_id(todo_id)
        if not todo:
            return error_response("Todo not found", status_code=404)
        
        # Check ownership
        if todo.user_id != user.id:
            return error_response("Access denied", status_code=403)
        
        # Format response
        formatted_todo = {
            'id': str(todo.id),
            'title': todo.title,
            'description': todo.description,
            'priority': todo.priority,
            'completed': todo.completed,
            'completed_at': todo.completed_at.isoformat() if todo.completed_at else None,
            'due_date': todo.due_date.isoformat() if todo.due_date else None,
            'created_at': todo.created_at.isoformat() if todo.created_at else None,
            'updated_at': todo.last_updated.isoformat() if todo.last_updated else None
        }
        
        return success_response(formatted_todo)
        
    except Exception as e:
        logger.error(f"Get todo error: {str(e)}")
        return error_response("An error occurred fetching the todo", status_code=500)


@todos_bp.route('/<todo_id>', methods=['PATCH'])
@firebase_auth_required
def update_todo_v2(todo_id):
    """Update a todo item"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        # Get todo
        todo = todo_repo.get_by_id(todo_id)
        if not todo:
            return error_response("Todo not found", status_code=404)
        
        # Check ownership
        if todo.user_id != user.id:
            return error_response("Access denied", status_code=403)
        
        # Update todo
        update_fields = {}
        for field in ['title', 'description', 'priority', 'completed', 'due_date']:
            if field in data:
                update_fields[field] = data[field]
        
        # If marking as completed, set completed_at
        if 'completed' in data and data['completed'] and not todo.completed:
            update_fields['completed_at'] = datetime.utcnow()
        elif 'completed' in data and not data['completed']:
            update_fields['completed_at'] = None
        
        updated_todo = todo_repo.update(todo_id, **update_fields)
        
        # Return updated todo
        return get_todo_v2(todo_id)
        
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"Update todo error: {str(e)}")
        return error_response("An error occurred updating the todo", status_code=500)


@todos_bp.route('/<todo_id>', methods=['DELETE'])
@firebase_auth_required
def delete_todo_v2(todo_id):
    """Delete a todo item"""
    try:
        user = g.current_user
        
        # Get todo
        todo = todo_repo.get_by_id(todo_id)
        if not todo:
            return error_response("Todo not found", status_code=404)
        
        # Check ownership
        if todo.user_id != user.id:
            return error_response("Access denied", status_code=403)
        
        # Delete todo
        success = todo_repo.delete(todo_id)
        
        if success:
            return success_response(message="Todo deleted successfully")
        else:
            return error_response("Failed to delete todo", status_code=500)
            
    except Exception as e:
        logger.error(f"Delete todo error: {str(e)}")
        return error_response("An error occurred deleting the todo", status_code=500)
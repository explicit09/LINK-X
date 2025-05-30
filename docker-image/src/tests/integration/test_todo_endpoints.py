import pytest
from unittest.mock import patch, Mock
import json
from datetime import datetime

from app import create_app
from core.database import db


@pytest.fixture
def app():
    """Create test app"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Create auth headers with mocked Firebase verification"""
    with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
        mock_verify.return_value = {
            'uid': 'test_user_123',
            'email': 'test@example.com'
        }
        return {'Authorization': 'Bearer fake-token'}


@pytest.fixture
def test_user():
    """Create test user"""
    return {
        'id': 'test_user_123',
        'email': 'test@example.com',
        'role': 'student',
        'firebase_uid': 'test_user_123'
    }


class TestTodoEndpoints:
    """Test cases for todo-related endpoints"""
    
    def test_create_todo_success(self, client, auth_headers, test_user):
        """Test successful todo creation"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.create_todo.return_value = {
                'id': 'todo_123',
                'title': 'Study for exam',
                'description': 'Review chapters 1-5',
                'due_date': '2024-12-31T23:59:59',
                'priority': 'high',
                'status': 'pending',
                'user_id': test_user['id'],
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Make request
            todo_data = {
                'title': 'Study for exam',
                'description': 'Review chapters 1-5',
                'due_date': '2024-12-31T23:59:59',
                'priority': 'high'
            }
            
            response = client.post(
                '/api/v1/todos',
                headers=auth_headers,
                json=todo_data
            )
            
            # Assert
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['title'] == 'Study for exam'
            assert data['priority'] == 'high'
            assert data['status'] == 'pending'
    
    def test_create_todo_invalid_data(self, client, auth_headers):
        """Test todo creation with invalid data"""
        # Missing required title
        response = client.post(
            '/api/v1/todos',
            headers=auth_headers,
            json={'description': 'No title'}
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'title' in data['error'].lower()
    
    def test_get_user_todos(self, client, auth_headers, test_user):
        """Test retrieving user's todos"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.get_user_todos.return_value = [
                {
                    'id': 'todo_1',
                    'title': 'Complete assignment',
                    'status': 'pending',
                    'priority': 'high'
                },
                {
                    'id': 'todo_2',
                    'title': 'Read research paper',
                    'status': 'completed',
                    'priority': 'medium'
                }
            ]
            
            # Make request
            response = client.get(
                '/api/v1/todos',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert len(data) == 2
            assert data[0]['title'] == 'Complete assignment'
            assert data[1]['status'] == 'completed'
    
    def test_get_todo_by_id(self, client, auth_headers, test_user):
        """Test retrieving specific todo"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.get_todo.return_value = {
                'id': 'todo_123',
                'title': 'Study for exam',
                'description': 'Focus on algorithms',
                'user_id': test_user['id']
            }
            
            # Make request
            response = client.get(
                '/api/v1/todos/todo_123',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['id'] == 'todo_123'
            assert data['title'] == 'Study for exam'
    
    def test_get_todo_not_found(self, client, auth_headers):
        """Test retrieving non-existent todo"""
        with patch('services.todo_service.TodoService') as mock_service:
            from core.exceptions import ResourceNotFoundError
            mock_instance = mock_service.return_value
            mock_instance.get_todo.side_effect = ResourceNotFoundError("Todo not found")
            
            response = client.get(
                '/api/v1/todos/nonexistent',
                headers=auth_headers
            )
            
            assert response.status_code == 404
    
    def test_update_todo_success(self, client, auth_headers, test_user):
        """Test successful todo update"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.update_todo.return_value = {
                'id': 'todo_123',
                'title': 'Updated title',
                'status': 'in_progress',
                'user_id': test_user['id']
            }
            
            # Make request
            update_data = {
                'title': 'Updated title',
                'status': 'in_progress'
            }
            
            response = client.put(
                '/api/v1/todos/todo_123',
                headers=auth_headers,
                json=update_data
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['title'] == 'Updated title'
            assert data['status'] == 'in_progress'
    
    def test_update_todo_unauthorized(self, client, auth_headers):
        """Test updating todo by unauthorized user"""
        with patch('services.todo_service.TodoService') as mock_service:
            from core.exceptions import AuthorizationError
            mock_instance = mock_service.return_value
            mock_instance.update_todo.side_effect = AuthorizationError("Not authorized")
            
            response = client.put(
                '/api/v1/todos/todo_123',
                headers=auth_headers,
                json={'title': 'Hacked'}
            )
            
            assert response.status_code == 403
    
    def test_delete_todo_success(self, client, auth_headers):
        """Test successful todo deletion"""
        with patch('services.todo_service.TodoService') as mock_service:
            mock_instance = mock_service.return_value
            mock_instance.delete_todo.return_value = None
            
            response = client.delete(
                '/api/v1/todos/todo_123',
                headers=auth_headers
            )
            
            assert response.status_code == 204
    
    def test_toggle_todo_status(self, client, auth_headers, test_user):
        """Test toggling todo completion status"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.toggle_todo_status.return_value = {
                'id': 'todo_123',
                'title': 'Complete assignment',
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat()
            }
            
            # Make request
            response = client.post(
                '/api/v1/todos/todo_123/toggle',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'completed'
            assert 'completed_at' in data
    
    def test_get_todos_by_status(self, client, auth_headers):
        """Test filtering todos by status"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.get_user_todos.return_value = [
                {
                    'id': 'todo_1',
                    'title': 'Pending task',
                    'status': 'pending'
                }
            ]
            
            # Make request
            response = client.get(
                '/api/v1/todos?status=pending',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert len(data) == 1
            assert all(todo['status'] == 'pending' for todo in data)
    
    def test_get_todos_by_priority(self, client, auth_headers):
        """Test filtering todos by priority"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.get_user_todos.return_value = [
                {
                    'id': 'todo_1',
                    'title': 'Urgent task',
                    'priority': 'high'
                },
                {
                    'id': 'todo_2',
                    'title': 'Another urgent task',
                    'priority': 'high'
                }
            ]
            
            # Make request
            response = client.get(
                '/api/v1/todos?priority=high',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert len(data) == 2
            assert all(todo['priority'] == 'high' for todo in data)
    
    def test_bulk_update_todos(self, client, auth_headers):
        """Test bulk updating multiple todos"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.bulk_update_todos.return_value = {
                'updated': 3,
                'failed': 0
            }
            
            # Make request
            bulk_data = {
                'todo_ids': ['todo_1', 'todo_2', 'todo_3'],
                'updates': {'status': 'completed'}
            }
            
            response = client.post(
                '/api/v1/todos/bulk-update',
                headers=auth_headers,
                json=bulk_data
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['updated'] == 3
            assert data['failed'] == 0
    
    def test_get_todo_statistics(self, client, auth_headers):
        """Test getting todo statistics for user"""
        with patch('services.todo_service.TodoService') as mock_service:
            # Setup mock
            mock_instance = mock_service.return_value
            mock_instance.get_user_todo_stats.return_value = {
                'total': 10,
                'completed': 6,
                'pending': 3,
                'in_progress': 1,
                'by_priority': {
                    'high': 2,
                    'medium': 5,
                    'low': 3
                }
            }
            
            # Make request
            response = client.get(
                '/api/v1/todos/stats',
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['total'] == 10
            assert data['completed'] == 6
            assert data['by_priority']['medium'] == 5
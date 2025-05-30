import pytest
from unittest.mock import Mock, patch
from datetime import datetime

from services.module_service import ModuleService
from core.exceptions import ValidationError, ResourceNotFoundError, AuthorizationError


@pytest.fixture
def mock_module_repository():
    """Mock module repository"""
    return Mock()


@pytest.fixture
def mock_course_repository():
    """Mock course repository"""
    return Mock()


@pytest.fixture
def mock_file_repository():
    """Mock file repository"""
    return Mock()


@pytest.fixture
def module_service(mock_module_repository, mock_course_repository, mock_file_repository):
    """Create module service with mocked dependencies"""
    with patch('services.module_service.ModuleRepository', return_value=mock_module_repository):
        with patch('services.module_service.CourseRepository', return_value=mock_course_repository):
            with patch('services.module_service.FileRepository', return_value=mock_file_repository):
                return ModuleService()


class TestModuleService:
    """Test cases for ModuleService"""
    
    def test_create_module_success(self, module_service, mock_module_repository, mock_course_repository):
        """Test successful module creation"""
        # Arrange
        user_id = "instructor123"
        course_id = "course123"
        module_data = {
            "title": "Introduction to Python",
            "description": "Learn Python basics",
            "order_index": 1
        }
        
        mock_course_repository.get_by_id.return_value = {
            "id": course_id,
            "instructor_id": user_id
        }
        
        mock_module_repository.create.return_value = {
            "id": "module123",
            "course_id": course_id,
            "title": module_data["title"],
            "description": module_data["description"],
            "order_index": module_data["order_index"],
            "created_at": datetime.utcnow()
        }
        
        # Act
        result = module_service.create_module(user_id, course_id, module_data)
        
        # Assert
        mock_course_repository.get_by_id.assert_called_once_with(course_id)
        mock_module_repository.create.assert_called_once()
        assert result["title"] == module_data["title"]
        assert result["course_id"] == course_id
    
    def test_create_module_unauthorized(self, module_service, mock_course_repository):
        """Test module creation by unauthorized user"""
        # Arrange
        user_id = "user123"
        course_id = "course123"
        
        mock_course_repository.get_by_id.return_value = {
            "id": course_id,
            "instructor_id": "other_user"
        }
        
        # Act & Assert
        with pytest.raises(AuthorizationError):
            module_service.create_module(user_id, course_id, {"title": "Test"})
    
    def test_create_module_invalid_data(self, module_service, mock_course_repository):
        """Test module creation with invalid data"""
        # Arrange
        user_id = "instructor123"
        course_id = "course123"
        
        mock_course_repository.get_by_id.return_value = {
            "id": course_id,
            "instructor_id": user_id
        }
        
        # Act & Assert - Missing title
        with pytest.raises(ValidationError) as exc:
            module_service.create_module(user_id, course_id, {})
        assert "title" in str(exc.value)
    
    def test_update_module_success(self, module_service, mock_module_repository, mock_course_repository):
        """Test successful module update"""
        # Arrange
        user_id = "instructor123"
        module_id = "module123"
        update_data = {
            "title": "Updated Title",
            "description": "Updated description"
        }
        
        mock_module_repository.get_by_id.return_value = {
            "id": module_id,
            "course_id": "course123",
            "title": "Old Title"
        }
        
        mock_course_repository.get_by_id.return_value = {
            "id": "course123",
            "instructor_id": user_id
        }
        
        mock_module_repository.update.return_value = {
            "id": module_id,
            "title": update_data["title"],
            "description": update_data["description"]
        }
        
        # Act
        result = module_service.update_module(user_id, module_id, update_data)
        
        # Assert
        mock_module_repository.update.assert_called_once_with(module_id, update_data)
        assert result["title"] == update_data["title"]
    
    def test_update_module_not_found(self, module_service, mock_module_repository):
        """Test updating non-existent module"""
        # Arrange
        mock_module_repository.get_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ResourceNotFoundError):
            module_service.update_module("user123", "nonexistent", {"title": "Test"})
    
    def test_delete_module_success(self, module_service, mock_module_repository, mock_course_repository):
        """Test successful module deletion"""
        # Arrange
        user_id = "instructor123"
        module_id = "module123"
        
        mock_module_repository.get_by_id.return_value = {
            "id": module_id,
            "course_id": "course123"
        }
        
        mock_course_repository.get_by_id.return_value = {
            "id": "course123",
            "instructor_id": user_id
        }
        
        # Act
        module_service.delete_module(user_id, module_id)
        
        # Assert
        mock_module_repository.delete.assert_called_once_with(module_id)
    
    def test_get_module_success(self, module_service, mock_module_repository):
        """Test successful module retrieval"""
        # Arrange
        module_id = "module123"
        expected_module = {
            "id": module_id,
            "title": "Test Module",
            "course_id": "course123"
        }
        
        mock_module_repository.get_by_id.return_value = expected_module
        
        # Act
        result = module_service.get_module(module_id)
        
        # Assert
        mock_module_repository.get_by_id.assert_called_once_with(module_id)
        assert result == expected_module
    
    def test_list_course_modules(self, module_service, mock_module_repository):
        """Test listing modules for a course"""
        # Arrange
        course_id = "course123"
        expected_modules = [
            {"id": "module1", "title": "Module 1", "order_index": 1},
            {"id": "module2", "title": "Module 2", "order_index": 2}
        ]
        
        mock_module_repository.list_by_course.return_value = expected_modules
        
        # Act
        result = module_service.list_course_modules(course_id)
        
        # Assert
        mock_module_repository.list_by_course.assert_called_once_with(course_id)
        assert result == expected_modules
    
    def test_reorder_modules(self, module_service, mock_module_repository, mock_course_repository):
        """Test reordering modules"""
        # Arrange
        user_id = "instructor123"
        course_id = "course123"
        module_order = ["module3", "module1", "module2"]
        
        mock_course_repository.get_by_id.return_value = {
            "id": course_id,
            "instructor_id": user_id
        }
        
        modules = [
            {"id": "module1", "course_id": course_id},
            {"id": "module2", "course_id": course_id},
            {"id": "module3", "course_id": course_id}
        ]
        
        for module in modules:
            mock_module_repository.get_by_id.side_effect = lambda mid: next(
                (m for m in modules if m["id"] == mid), None
            )
        
        # Act
        module_service.reorder_modules(user_id, course_id, module_order)
        
        # Assert
        assert mock_module_repository.update.call_count == 3
        # Check that correct order indices were set
        calls = mock_module_repository.update.call_args_list
        assert calls[0][0] == ("module3", {"order_index": 0})
        assert calls[1][0] == ("module1", {"order_index": 1})
        assert calls[2][0] == ("module2", {"order_index": 2})
    
    def test_add_file_to_module(self, module_service, mock_module_repository, mock_file_repository):
        """Test adding file to module"""
        # Arrange
        module_id = "module123"
        file_id = "file123"
        
        mock_module_repository.get_by_id.return_value = {
            "id": module_id,
            "course_id": "course123"
        }
        
        mock_file_repository.get_by_id.return_value = {
            "id": file_id,
            "course_id": "course123"
        }
        
        # Act
        module_service.add_file_to_module(module_id, file_id)
        
        # Assert
        mock_file_repository.update.assert_called_once_with(
            file_id, 
            {"module_id": module_id}
        )
    
    def test_add_file_to_module_different_course(self, module_service, mock_module_repository, mock_file_repository):
        """Test adding file from different course to module"""
        # Arrange
        module_id = "module123"
        file_id = "file123"
        
        mock_module_repository.get_by_id.return_value = {
            "id": module_id,
            "course_id": "course123"
        }
        
        mock_file_repository.get_by_id.return_value = {
            "id": file_id,
            "course_id": "different_course"
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc:
            module_service.add_file_to_module(module_id, file_id)
        assert "different course" in str(exc.value)
    
    def test_remove_file_from_module(self, module_service, mock_file_repository):
        """Test removing file from module"""
        # Arrange
        file_id = "file123"
        
        mock_file_repository.get_by_id.return_value = {
            "id": file_id,
            "module_id": "module123"
        }
        
        # Act
        module_service.remove_file_from_module(file_id)
        
        # Assert
        mock_file_repository.update.assert_called_once_with(
            file_id, 
            {"module_id": None}
        )
    
    def test_get_module_with_files(self, module_service, mock_module_repository, mock_file_repository):
        """Test getting module with associated files"""
        # Arrange
        module_id = "module123"
        
        mock_module_repository.get_by_id.return_value = {
            "id": module_id,
            "title": "Test Module",
            "course_id": "course123"
        }
        
        mock_file_repository.list_by_module.return_value = [
            {"id": "file1", "filename": "lecture.pdf"},
            {"id": "file2", "filename": "notes.pdf"}
        ]
        
        # Act
        result = module_service.get_module_with_files(module_id)
        
        # Assert
        assert result["id"] == module_id
        assert len(result["files"]) == 2
        assert result["files"][0]["filename"] == "lecture.pdf"
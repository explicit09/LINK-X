import pytest
from unittest.mock import Mock, patch, MagicMock
from werkzeug.datastructures import FileStorage
import io
from datetime import datetime

from services.file_service import FileService
from core.exceptions import ValidationError, ResourceNotFoundError, AuthorizationError


@pytest.fixture
def mock_s3_storage():
    """Mock S3 storage service"""
    with patch('services.file_service.S3Storage') as mock:
        storage = Mock()
        mock.return_value = storage
        yield storage


@pytest.fixture
def mock_file_repository():
    """Mock file repository"""
    return Mock()


@pytest.fixture
def mock_course_repository():
    """Mock course repository"""
    return Mock()


@pytest.fixture
def mock_module_repository():
    """Mock module repository"""
    return Mock()


@pytest.fixture
def file_service(mock_s3_storage, mock_file_repository, mock_course_repository, mock_module_repository):
    """Create file service with mocked dependencies"""
    with patch('services.file_service.FileRepository', return_value=mock_file_repository):
        with patch('services.file_service.CourseRepository', return_value=mock_course_repository):
            with patch('services.file_service.ModuleRepository', return_value=mock_module_repository):
                return FileService()


class TestFileService:
    """Test cases for FileService"""
    
    def test_upload_file_success(self, file_service, mock_s3_storage, mock_file_repository, mock_course_repository):
        """Test successful file upload"""
        # Arrange
        user_id = "user123"
        course_id = "course123"
        module_id = "module123"
        
        file_content = b"test file content"
        file = FileStorage(
            stream=io.BytesIO(file_content),
            filename="test.pdf",
            content_type="application/pdf"
        )
        
        mock_course_repository.get_by_id.return_value = {
            "id": course_id,
            "instructor_id": user_id
        }
        
        mock_s3_storage.upload_file.return_value = "s3://bucket/test.pdf"
        mock_file_repository.create.return_value = {
            "id": "file123",
            "filename": "test.pdf",
            "s3_url": "s3://bucket/test.pdf",
            "course_id": course_id,
            "module_id": module_id,
            "user_id": user_id,
            "size": len(file_content),
            "mime_type": "application/pdf"
        }
        
        # Act
        result = file_service.upload_file(user_id, course_id, module_id, file)
        
        # Assert
        mock_course_repository.get_by_id.assert_called_once_with(course_id)
        mock_s3_storage.upload_file.assert_called_once()
        mock_file_repository.create.assert_called_once()
        assert result["filename"] == "test.pdf"
        assert result["s3_url"] == "s3://bucket/test.pdf"
    
    def test_upload_file_invalid_type(self, file_service):
        """Test file upload with invalid file type"""
        # Arrange
        file = FileStorage(
            stream=io.BytesIO(b"test"),
            filename="test.exe",
            content_type="application/x-executable"
        )
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc:
            file_service.upload_file("user123", "course123", None, file)
        assert "Invalid file type" in str(exc.value)
    
    def test_upload_file_too_large(self, file_service):
        """Test file upload exceeding size limit"""
        # Arrange
        large_content = b"x" * (100 * 1024 * 1024 + 1)  # 100MB + 1 byte
        file = FileStorage(
            stream=io.BytesIO(large_content),
            filename="large.pdf",
            content_type="application/pdf"
        )
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc:
            file_service.upload_file("user123", "course123", None, file)
        assert "File too large" in str(exc.value)
    
    def test_upload_file_unauthorized(self, file_service, mock_course_repository):
        """Test file upload by unauthorized user"""
        # Arrange
        user_id = "user123"
        course_id = "course123"
        
        file = FileStorage(
            stream=io.BytesIO(b"test"),
            filename="test.pdf",
            content_type="application/pdf"
        )
        
        mock_course_repository.get_by_id.return_value = {
            "id": course_id,
            "instructor_id": "other_user"
        }
        
        # Act & Assert
        with pytest.raises(AuthorizationError):
            file_service.upload_file(user_id, course_id, None, file)
    
    def test_get_file_success(self, file_service, mock_file_repository):
        """Test successful file retrieval"""
        # Arrange
        file_id = "file123"
        user_id = "user123"
        
        mock_file_repository.get_by_id.return_value = {
            "id": file_id,
            "filename": "test.pdf",
            "user_id": user_id,
            "course_id": "course123"
        }
        
        # Act
        result = file_service.get_file(file_id, user_id)
        
        # Assert
        mock_file_repository.get_by_id.assert_called_once_with(file_id)
        assert result["id"] == file_id
        assert result["filename"] == "test.pdf"
    
    def test_get_file_not_found(self, file_service, mock_file_repository):
        """Test file retrieval when file doesn't exist"""
        # Arrange
        mock_file_repository.get_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ResourceNotFoundError):
            file_service.get_file("nonexistent", "user123")
    
    def test_delete_file_success(self, file_service, mock_file_repository, mock_s3_storage):
        """Test successful file deletion"""
        # Arrange
        file_id = "file123"
        user_id = "user123"
        
        mock_file_repository.get_by_id.return_value = {
            "id": file_id,
            "user_id": user_id,
            "s3_url": "s3://bucket/test.pdf"
        }
        
        # Act
        file_service.delete_file(file_id, user_id)
        
        # Assert
        mock_s3_storage.delete_file.assert_called_once_with("s3://bucket/test.pdf")
        mock_file_repository.delete.assert_called_once_with(file_id)
    
    def test_delete_file_unauthorized(self, file_service, mock_file_repository):
        """Test file deletion by unauthorized user"""
        # Arrange
        file_id = "file123"
        user_id = "user123"
        
        mock_file_repository.get_by_id.return_value = {
            "id": file_id,
            "user_id": "other_user"
        }
        
        # Act & Assert
        with pytest.raises(AuthorizationError):
            file_service.delete_file(file_id, user_id)
    
    def test_list_course_files(self, file_service, mock_file_repository):
        """Test listing files for a course"""
        # Arrange
        course_id = "course123"
        expected_files = [
            {"id": "file1", "filename": "lecture1.pdf"},
            {"id": "file2", "filename": "lecture2.pdf"}
        ]
        
        mock_file_repository.list_by_course.return_value = expected_files
        
        # Act
        result = file_service.list_course_files(course_id)
        
        # Assert
        mock_file_repository.list_by_course.assert_called_once_with(course_id)
        assert result == expected_files
    
    def test_process_file_for_embeddings(self, file_service, mock_file_repository):
        """Test file processing for embeddings"""
        # Arrange
        file_id = "file123"
        
        mock_file_repository.get_by_id.return_value = {
            "id": file_id,
            "filename": "test.pdf",
            "s3_url": "s3://bucket/test.pdf"
        }
        
        with patch('services.file_service.process_file_task') as mock_task:
            # Act
            file_service.process_file_for_embeddings(file_id)
            
            # Assert
            mock_task.delay.assert_called_once_with(file_id)
    
    def test_get_file_download_url(self, file_service, mock_file_repository, mock_s3_storage):
        """Test generating download URL for a file"""
        # Arrange
        file_id = "file123"
        user_id = "user123"
        
        mock_file_repository.get_by_id.return_value = {
            "id": file_id,
            "user_id": user_id,
            "s3_url": "s3://bucket/test.pdf"
        }
        
        mock_s3_storage.generate_presigned_url.return_value = "https://signed-url.com"
        
        # Act
        result = file_service.get_file_download_url(file_id, user_id)
        
        # Assert
        mock_s3_storage.generate_presigned_url.assert_called_once()
        assert result == "https://signed-url.com"
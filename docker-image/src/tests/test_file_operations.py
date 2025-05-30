"""
Comprehensive File Operation Tests
Tests file upload, validation, S3 operations, and retrieval
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
import os
from werkzeug.datastructures import FileStorage

from services.file_service import FileService
from services.s3_storage_resilient import S3Storage
from core.file_validation import FileValidator
from core.exceptions import ValidationError, FileProcessingError
from db.schema import File, Module, Course


@pytest.fixture
def file_service():
    """Create file service instance"""
    service = FileService()
    service.db = Mock()
    service.file_repo = Mock()
    service.s3_storage = Mock(spec=S3Storage)
    service.file_validator = Mock(spec=FileValidator)
    return service


@pytest.fixture
def sample_pdf_file():
    """Create a sample PDF file"""
    content = b'%PDF-1.4 sample content'
    file = FileStorage(
        stream=BytesIO(content),
        filename='test_document.pdf',
        content_type='application/pdf'
    )
    return file


@pytest.fixture
def sample_image_file():
    """Create a sample image file"""
    # Minimal PNG header
    content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
    file = FileStorage(
        stream=BytesIO(content),
        filename='test_image.png',
        content_type='image/png'
    )
    return file


@pytest.fixture
def sample_audio_file():
    """Create a sample audio file"""
    # MP3 header
    content = b'ID3\x04\x00\x00\x00\x00\x00\x00'
    file = FileStorage(
        stream=BytesIO(content),
        filename='test_audio.mp3',
        content_type='audio/mpeg'
    )
    return file


class TestFileUpload:
    """Test file upload functionality"""
    
    def test_upload_pdf_success(self, file_service, sample_pdf_file):
        """Test successful PDF upload"""
        # Mock validation
        file_service.file_validator.validate_file.return_value = (
            True, None, {
                'filename': 'test_document.pdf',
                'size': 23,
                'mime_type': 'application/pdf',
                'hash': 'abc123'
            }
        )
        
        # Mock S3 upload
        file_service.s3_storage.upload_file.return_value = {
            's3_key': 'courses/course-1/modules/module-1/file-1/test_document.pdf',
            's3_bucket': 'learn-x',
            'url': 'https://learn-x.s3.amazonaws.com/...'
        }
        
        # Mock file creation
        mock_file = Mock(spec=File)
        mock_file.id = 'file-1'
        mock_file.filename = 'test_document.pdf'
        file_service.file_repo.create.return_value = mock_file
        
        # Test upload
        result = file_service.upload_file(
            file=sample_pdf_file,
            module_id='module-1',
            course_id='course-1',
            user_id='user-1',
            title='Test Document'
        )
        
        assert result.id == 'file-1'
        assert result.filename == 'test_document.pdf'
        file_service.s3_storage.upload_file.assert_called_once()
    
    def test_upload_invalid_file_type(self, file_service):
        """Test upload with invalid file type"""
        bad_file = FileStorage(
            stream=BytesIO(b'malicious.exe'),
            filename='virus.exe',
            content_type='application/x-msdownload'
        )
        
        file_service.file_validator.validate_file.return_value = (
            False, "File type '.exe' not allowed", None
        )
        
        with pytest.raises(ValidationError, match="File type '.exe' not allowed"):
            file_service.upload_file(
                file=bad_file,
                module_id='module-1',
                course_id='course-1',
                user_id='user-1'
            )
    
    def test_upload_oversized_file(self, file_service):
        """Test upload with oversized file"""
        # Create large file
        large_content = b'x' * (100 * 1024 * 1024)  # 100MB
        large_file = FileStorage(
            stream=BytesIO(large_content),
            filename='huge.pdf',
            content_type='application/pdf'
        )
        
        file_service.file_validator.validate_file.return_value = (
            False, "File too large. Maximum size: 50MB", None
        )
        
        with pytest.raises(ValidationError, match="File too large"):
            file_service.upload_file(
                file=large_file,
                module_id='module-1',
                course_id='course-1',
                user_id='user-1'
            )
    
    def test_upload_malicious_content(self, file_service):
        """Test upload with malicious content"""
        malicious_file = FileStorage(
            stream=BytesIO(b'<script>alert("xss")</script>'),
            filename='malicious.html',
            content_type='text/html'
        )
        
        file_service.file_validator.validate_file.return_value = (
            False, "File contains potentially malicious content", None
        )
        
        with pytest.raises(ValidationError, match="malicious content"):
            file_service.upload_file(
                file=malicious_file,
                module_id='module-1',
                course_id='course-1',
                user_id='user-1'
            )
    
    def test_upload_s3_failure(self, file_service, sample_pdf_file):
        """Test upload when S3 fails"""
        file_service.file_validator.validate_file.return_value = (
            True, None, {'filename': 'test.pdf', 'size': 100}
        )
        
        # Mock S3 failure
        file_service.s3_storage.upload_file.side_effect = Exception("S3 service unavailable")
        
        with pytest.raises(FileProcessingError, match="Failed to upload file"):
            file_service.upload_file(
                file=sample_pdf_file,
                module_id='module-1',
                course_id='course-1',
                user_id='user-1'
            )


class TestFileValidation:
    """Test file validation"""
    
    def test_validate_mime_type_mismatch(self, file_service):
        """Test validation with MIME type mismatch"""
        # PDF extension but JPEG content
        fake_pdf = FileStorage(
            stream=BytesIO(b'\xFF\xD8\xFF'),  # JPEG header
            filename='fake.pdf',
            content_type='application/pdf'
        )
        
        file_service.file_validator.validate_file.return_value = (
            False, "File content doesn't match extension", None
        )
        
        with pytest.raises(ValidationError):
            file_service.upload_file(
                file=fake_pdf,
                module_id='module-1',
                course_id='course-1',
                user_id='user-1'
            )
    
    def test_validate_audio_formats(self, file_service, sample_audio_file):
        """Test validation of audio formats"""
        file_service.file_validator.validate_file.return_value = (
            True, None, {
                'filename': 'test_audio.mp3',
                'size': 1024,
                'mime_type': 'audio/mpeg',
                'hash': 'xyz789'
            }
        )
        
        # Should pass validation
        file_service.s3_storage.upload_file.return_value = {
            's3_key': 'test.mp3',
            's3_bucket': 'learn-x',
            'url': 'https://...'
        }
        file_service.file_repo.create.return_value = Mock(spec=File)
        
        result = file_service.upload_file(
            file=sample_audio_file,
            module_id='module-1',
            course_id='course-1',
            user_id='user-1'
        )
        
        assert result is not None


class TestFileRetrieval:
    """Test file retrieval and access"""
    
    def test_get_file_success(self, file_service):
        """Test successful file retrieval"""
        mock_file = Mock(spec=File)
        mock_file.id = 'file-1'
        mock_file.s3_key = 'courses/c1/m1/f1/doc.pdf'
        
        file_service.file_repo.get_by_id.return_value = mock_file
        
        # Mock presigned URL generation
        file_service.s3_storage.generate_presigned_url.return_value = (
            'https://s3.amazonaws.com/signed-url'
        )
        
        result = file_service.get_file_url('file-1', user_id='user-1')
        
        assert result == 'https://s3.amazonaws.com/signed-url'
        file_service.s3_storage.generate_presigned_url.assert_called_once()
    
    def test_get_file_not_found(self, file_service):
        """Test retrieval of non-existent file"""
        file_service.file_repo.get_by_id.return_value = None
        
        with pytest.raises(FileProcessingError, match="File not found"):
            file_service.get_file_url('non-existent', user_id='user-1')
    
    def test_get_file_access_denied(self, file_service):
        """Test file access control"""
        mock_file = Mock(spec=File)
        mock_file.module_id = 'module-1'
        
        file_service.file_repo.get_by_id.return_value = mock_file
        
        # Mock access check failure
        with patch.object(file_service, 'check_file_access') as mock_check:
            mock_check.return_value = False
            
            with pytest.raises(FileProcessingError, match="Access denied"):
                file_service.get_file_url('file-1', user_id='unauthorized-user')


class TestFileProcessing:
    """Test file processing tasks"""
    
    @patch('services.file_service.process_file_async')
    def test_trigger_file_processing(self, mock_process, file_service, sample_pdf_file):
        """Test triggering async file processing"""
        # Mock successful upload
        file_service.file_validator.validate_file.return_value = (
            True, None, {'filename': 'test.pdf', 'size': 100}
        )
        file_service.s3_storage.upload_file.return_value = {
            's3_key': 'test.pdf', 's3_bucket': 'learn-x', 'url': 'https://...'
        }
        
        mock_file = Mock(spec=File)
        mock_file.id = 'file-1'
        file_service.file_repo.create.return_value = mock_file
        
        # Upload should trigger processing
        result = file_service.upload_file(
            file=sample_pdf_file,
            module_id='module-1',
            course_id='course-1',
            user_id='user-1',
            process_async=True
        )
        
        mock_process.delay.assert_called_once_with('file-1')
    
    def test_reprocess_file(self, file_service):
        """Test reprocessing existing file"""
        mock_file = Mock(spec=File)
        mock_file.id = 'file-1'
        mock_file.s3_key = 'test.pdf'
        
        file_service.file_repo.get_by_id.return_value = mock_file
        
        with patch('services.file_service.process_file_async') as mock_process:
            file_service.reprocess_file('file-1')
            
            mock_process.delay.assert_called_once_with('file-1')
            assert mock_file.processing_status == 'pending'


class TestFileDeletion:
    """Test file deletion"""
    
    def test_delete_file_success(self, file_service):
        """Test successful file deletion"""
        mock_file = Mock(spec=File)
        mock_file.id = 'file-1'
        mock_file.s3_key = 'courses/c1/m1/f1/doc.pdf'
        
        file_service.file_repo.get_by_id.return_value = mock_file
        file_service.s3_storage.delete_file.return_value = True
        
        result = file_service.delete_file('file-1', user_id='owner-1')
        
        assert result is True
        file_service.s3_storage.delete_file.assert_called_once_with(mock_file.s3_key)
        file_service.file_repo.delete.assert_called_once()
    
    def test_delete_file_s3_failure(self, file_service):
        """Test deletion when S3 fails"""
        mock_file = Mock(spec=File)
        file_service.file_repo.get_by_id.return_value = mock_file
        
        # S3 deletion fails
        file_service.s3_storage.delete_file.side_effect = Exception("S3 error")
        
        with pytest.raises(FileProcessingError, match="Failed to delete file from storage"):
            file_service.delete_file('file-1', user_id='owner-1')
        
        # Database record should not be deleted if S3 fails
        file_service.file_repo.delete.assert_not_called()


class TestBulkOperations:
    """Test bulk file operations"""
    
    def test_bulk_download_files(self, file_service):
        """Test bulk file download"""
        file_ids = ['file-1', 'file-2', 'file-3']
        
        mock_files = []
        for fid in file_ids:
            mock_file = Mock(spec=File)
            mock_file.id = fid
            mock_file.s3_key = f'path/{fid}.pdf'
            mock_files.append(mock_file)
        
        file_service.file_repo.get_by_ids.return_value = mock_files
        file_service.s3_storage.generate_presigned_url.return_value = 'https://signed-url'
        
        result = file_service.get_bulk_download_urls(file_ids, user_id='user-1')
        
        assert len(result) == 3
        assert all('url' in item for item in result)
    
    def test_module_file_cleanup(self, file_service):
        """Test cleaning up all files in a module"""
        module_files = []
        for i in range(5):
            mock_file = Mock(spec=File)
            mock_file.id = f'file-{i}'
            mock_file.s3_key = f'path/file-{i}.pdf'
            module_files.append(mock_file)
        
        file_service.file_repo.get_by_module.return_value = module_files
        file_service.s3_storage.delete_file.return_value = True
        
        result = file_service.delete_module_files('module-1')
        
        assert result == 5
        assert file_service.s3_storage.delete_file.call_count == 5


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
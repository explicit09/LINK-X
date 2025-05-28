"""
Unit tests for CourseService
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from src.services.course_service import CourseService
from src.core.exceptions import NotFoundError, ValidationError, AuthorizationError
from src.db.schema import Course, Module, User, Role, Enrollment

class TestCourseService:
    """Test cases for CourseService"""
    
    @pytest.fixture
    def service(self):
        """Create CourseService instance with mocked dependencies"""
        with patch('src.services.course_service.CourseRepository') as mock_course_repo, \
             patch('src.services.course_service.UserRepository') as mock_user_repo, \
             patch('src.services.course_service.EnrollmentRepository') as mock_enrollment_repo:
            
            service = CourseService()
            service.course_repo = mock_course_repo.return_value
            service.user_repo = mock_user_repo.return_value
            service.enrollment_repo = mock_enrollment_repo.return_value
            
            yield service
    
    def test_get_course_with_access_check_not_found(self, service):
        """Test get course when course doesn't exist"""
        # Arrange
        service.course_repo.get_with_modules.return_value = None
        
        # Act & Assert
        with pytest.raises(NotFoundError) as exc_info:
            service.get_course_with_access_check('course-123', 'user-123')
        
        assert str(exc_info.value) == "Course not found"
    
    def test_get_course_admin_access(self, service):
        """Test admin has access to all courses"""
        # Arrange
        mock_course = Mock(spec=Course)
        service.course_repo.get_with_modules.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'admin'
        service.user_repo.get_by_id.return_value = mock_user
        
        # Act
        result = service.get_course_with_access_check('course-123', 'user-123')
        
        # Assert
        assert result == mock_course
    
    def test_get_course_instructor_own_course(self, service):
        """Test instructor can access their own course"""
        # Arrange
        mock_course = Mock(spec=Course)
        mock_course.instructor_id = 'user-123'
        service.course_repo.get_with_modules.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_user
        
        # Act
        result = service.get_course_with_access_check('course-123', 'user-123')
        
        # Assert
        assert result == mock_course
    
    def test_get_course_instructor_other_course(self, service):
        """Test instructor cannot access other instructor's course"""
        # Arrange
        mock_course = Mock(spec=Course)
        mock_course.instructor_id = 'other-instructor'
        service.course_repo.get_with_modules.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_user
        
        # Act & Assert
        with pytest.raises(AuthorizationError) as exc_info:
            service.get_course_with_access_check('course-123', 'user-123')
        
        assert str(exc_info.value) == "Access denied"
    
    def test_get_course_student_enrolled(self, service):
        """Test student can access enrolled course"""
        # Arrange
        mock_course = Mock(spec=Course)
        mock_course.published = True
        service.course_repo.get_with_modules.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'student'
        service.user_repo.get_by_id.return_value = mock_user
        
        mock_enrollment = Mock(spec=Enrollment)
        service.enrollment_repo.get_by_student_course.return_value = mock_enrollment
        
        # Act
        result = service.get_course_with_access_check('course-123', 'user-123')
        
        # Assert
        assert result == mock_course
    
    def test_create_course_validates_title(self, service):
        """Test course creation validates title length"""
        # Arrange
        mock_instructor = Mock(spec=User)
        mock_instructor.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_instructor
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            service.create_course('user-123', 'AB', 'Description')
        
        assert "Title must be at least 3 characters" in str(exc_info.value)
    
    def test_create_course_validates_description(self, service):
        """Test course creation validates description length"""
        # Arrange
        mock_instructor = Mock(spec=User)
        mock_instructor.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_instructor
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            service.create_course('user-123', 'Valid Title', 'Short')
        
        assert "Description must be at least 10 characters" in str(exc_info.value)
    
    @patch('src.services.course_service.invalidate_cache')
    def test_create_course_success(self, mock_invalidate, service):
        """Test successful course creation"""
        # Arrange
        mock_instructor = Mock(spec=User)
        mock_instructor.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_instructor
        
        mock_course = Mock(spec=Course, id='course-123')
        service.course_repo.create.return_value = mock_course
        
        with patch.object(service, '_generate_access_code') as mock_gen_code:
            mock_gen_code.return_value = 'ABC123'
            
            # Act
            result = service.create_course(
                'user-123',
                'Test Course',
                'This is a test course description',
                category='Programming',
                tags=['python', 'testing']
            )
        
        # Assert
        assert result == mock_course
        service.course_repo.create.assert_called_once()
        create_args = service.course_repo.create.call_args[1]
        assert create_args['title'] == 'Test Course'
        assert create_args['published'] == False
        mock_invalidate.assert_called_once_with('courses:instructor:user-123:*')
    
    def test_update_course_not_found(self, service):
        """Test updating non-existent course"""
        # Arrange
        service.course_repo.get_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(NotFoundError) as exc_info:
            service.update_course('course-123', 'user-123', title='New Title')
        
        assert str(exc_info.value) == "Course not found"
    
    def test_update_course_authorization_check(self, service):
        """Test course update authorization"""
        # Arrange
        mock_course = Mock(spec=Course, instructor_id='other-user')
        service.course_repo.get_by_id.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_user
        
        # Act & Assert
        with pytest.raises(AuthorizationError) as exc_info:
            service.update_course('course-123', 'user-123', title='New Title')
        
        assert "Not authorized to update this course" in str(exc_info.value)
    
    def test_delete_course_with_enrollments(self, service):
        """Test cannot delete course with active enrollments"""
        # Arrange
        mock_course = Mock(spec=Course, instructor_id='user-123')
        service.course_repo.get_by_id.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_user
        
        # Has enrollments
        service.enrollment_repo.get_by_course.return_value = [Mock()]
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            service.delete_course('course-123', 'user-123')
        
        assert "Cannot delete course with active enrollments" in str(exc_info.value)
    
    def test_publish_course_validates_modules(self, service):
        """Test course publishing validates modules exist"""
        # Arrange
        mock_course = Mock(spec=Course)
        mock_course.instructor_id = 'user-123'
        mock_course.modules = []  # No modules
        service.course_repo.get_with_modules.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_user
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            service.publish_course('course-123', 'user-123')
        
        assert "Course must have at least one module" in str(exc_info.value)
    
    def test_publish_course_validates_module_files(self, service):
        """Test course publishing validates modules have files"""
        # Arrange
        mock_module = Mock(spec=Module)
        mock_module.title = 'Module 1'
        mock_module.files = []  # No files
        
        mock_course = Mock(spec=Course)
        mock_course.instructor_id = 'user-123'
        mock_course.modules = [mock_module]
        service.course_repo.get_with_modules.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_user
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            service.publish_course('course-123', 'user-123')
        
        assert "Module 'Module 1' must have at least one file" in str(exc_info.value)
    
    def test_enroll_student_invalid_access_code(self, service):
        """Test enrollment with invalid access code"""
        # Arrange
        mock_course = Mock(spec=Course, published=True)
        service.course_repo.get_by_id.return_value = mock_course
        
        mock_access_code = Mock(code='VALID123')
        service.course_repo.get_access_code.return_value = mock_access_code
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            service.enroll_student('course-123', 'user-123', 'INVALID')
        
        assert "Invalid access code" in str(exc_info.value)
    
    def test_enroll_student_already_enrolled(self, service):
        """Test enrollment when already enrolled"""
        # Arrange
        mock_course = Mock(spec=Course, published=True)
        service.course_repo.get_by_id.return_value = mock_course
        
        mock_access_code = Mock(code='ABC123')
        service.course_repo.get_access_code.return_value = mock_access_code
        
        # Already enrolled
        service.enrollment_repo.get_by_student_course.return_value = Mock()
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            service.enroll_student('course-123', 'user-123', 'ABC123')
        
        assert "Already enrolled in this course" in str(exc_info.value)
    
    def test_get_course_statistics(self, service):
        """Test getting course statistics"""
        # Arrange
        mock_course = Mock(spec=Course, instructor_id='user-123')
        service.course_repo.get_by_id.return_value = mock_course
        
        mock_user = Mock(spec=User)
        mock_user.role.value = 'instructor'
        service.user_repo.get_by_id.return_value = mock_user
        
        service.enrollment_repo.count_by_course.return_value = 25
        service.course_repo.get_modules.return_value = [Mock(), Mock(), Mock()]
        service.course_repo.count_files.return_value = 10
        
        with patch.object(service, '_calculate_completion_rate') as mock_comp, \
             patch.object(service, '_calculate_average_progress') as mock_prog:
            mock_comp.return_value = 0.75
            mock_prog.return_value = 0.65
            
            # Act
            stats = service.get_course_statistics('course-123', 'user-123')
        
        # Assert
        assert stats['total_students'] == 25
        assert stats['total_modules'] == 3
        assert stats['total_files'] == 10
        assert stats['completion_rate'] == 0.75
        assert stats['average_progress'] == 0.65
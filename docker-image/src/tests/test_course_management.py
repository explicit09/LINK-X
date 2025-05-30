"""
Comprehensive Course Management Tests
Tests course creation, modules, enrollment, and access control
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from typing import List

from services.course_service import CourseService
from services.module_service import ModuleService
from core.exceptions import ValidationError, NotFoundError, PermissionError
from db.schema import Course, Module, User, Role, Enrollment, RoleType


@pytest.fixture
def course_service():
    """Create course service instance"""
    service = CourseService()
    service.db = Mock()
    service.course_repo = Mock()
    service.enrollment_repo = Mock()
    service.module_repo = Mock()
    return service


@pytest.fixture
def module_service():
    """Create module service instance"""
    service = ModuleService()
    service.db = Mock()
    service.module_repo = Mock()
    service.file_repo = Mock()
    return service


@pytest.fixture
def sample_instructor():
    """Create sample instructor user"""
    user = Mock(spec=User)
    user.id = 'instructor-1'
    user.email = 'instructor@example.com'
    user.role = RoleType.INSTRUCTOR
    user.full_name = 'Dr. Smith'
    return user


@pytest.fixture
def sample_student():
    """Create sample student user"""
    user = Mock(spec=User)
    user.id = 'student-1'
    user.email = 'student@example.com'
    user.role = RoleType.STUDENT
    user.full_name = 'John Doe'
    return user


@pytest.fixture
def sample_course():
    """Create sample course"""
    course = Mock(spec=Course)
    course.id = 'course-1'
    course.title = 'Introduction to Python'
    course.description = 'Learn Python basics'
    course.instructor_id = 'instructor-1'
    course.is_published = True
    course.created_at = datetime.utcnow()
    return course


class TestCourseCreation:
    """Test course creation and management"""
    
    def test_create_course_success(self, course_service, sample_instructor):
        """Test successful course creation"""
        course_data = {
            'title': 'Advanced Machine Learning',
            'description': 'Deep dive into ML algorithms',
            'category': 'Computer Science',
            'difficulty': 'Advanced',
            'duration_weeks': 12
        }
        
        new_course = Mock(spec=Course)
        new_course.id = 'course-123'
        new_course.title = course_data['title']
        
        course_service.course_repo.create.return_value = new_course
        
        result = course_service.create_course(
            instructor=sample_instructor,
            **course_data
        )
        
        assert result.id == 'course-123'
        assert result.title == 'Advanced Machine Learning'
        course_service.course_repo.create.assert_called_once()
    
    def test_create_course_student_forbidden(self, course_service, sample_student):
        """Test student cannot create course"""
        with pytest.raises(PermissionError, match="Only instructors can create courses"):
            course_service.create_course(
                instructor=sample_student,
                title='Unauthorized Course',
                description='Should fail'
            )
    
    def test_create_course_duplicate_title(self, course_service, sample_instructor):
        """Test duplicate course title validation"""
        existing_course = Mock(spec=Course)
        course_service.course_repo.get_by_title.return_value = existing_course
        
        with pytest.raises(ValidationError, match="Course with this title already exists"):
            course_service.create_course(
                instructor=sample_instructor,
                title='Existing Course',
                description='Duplicate'
            )
    
    def test_update_course_success(self, course_service, sample_course, sample_instructor):
        """Test successful course update"""
        course_service.course_repo.get_by_id.return_value = sample_course
        sample_course.instructor_id = sample_instructor.id
        
        updates = {
            'description': 'Updated description',
            'difficulty': 'Intermediate'
        }
        
        updated_course = Mock(spec=Course)
        updated_course.description = updates['description']
        course_service.course_repo.update.return_value = updated_course
        
        result = course_service.update_course(
            course_id='course-1',
            user=sample_instructor,
            **updates
        )
        
        assert result.description == 'Updated description'
        course_service.course_repo.update.assert_called_once()
    
    def test_update_course_wrong_instructor(self, course_service, sample_course):
        """Test instructor cannot update another's course"""
        course_service.course_repo.get_by_id.return_value = sample_course
        
        wrong_instructor = Mock(spec=User)
        wrong_instructor.id = 'wrong-instructor'
        wrong_instructor.role = RoleType.INSTRUCTOR
        
        with pytest.raises(PermissionError, match="You don't have permission"):
            course_service.update_course(
                course_id='course-1',
                user=wrong_instructor,
                description='Should fail'
            )
    
    def test_publish_course(self, course_service, sample_course, sample_instructor):
        """Test publishing a course"""
        sample_course.is_published = False
        sample_course.instructor_id = sample_instructor.id
        course_service.course_repo.get_by_id.return_value = sample_course
        
        # Mock at least one module exists
        course_service.module_repo.get_by_course.return_value = [Mock(spec=Module)]
        
        result = course_service.publish_course('course-1', sample_instructor)
        
        assert sample_course.is_published is True
        course_service.course_repo.update.assert_called_once()
    
    def test_publish_course_no_modules(self, course_service, sample_course, sample_instructor):
        """Test cannot publish course without modules"""
        sample_course.is_published = False
        sample_course.instructor_id = sample_instructor.id
        course_service.course_repo.get_by_id.return_value = sample_course
        
        # No modules
        course_service.module_repo.get_by_course.return_value = []
        
        with pytest.raises(ValidationError, match="Course must have at least one module"):
            course_service.publish_course('course-1', sample_instructor)


class TestModuleManagement:
    """Test module creation and management"""
    
    def test_create_module_success(self, module_service, sample_course):
        """Test successful module creation"""
        module_data = {
            'title': 'Introduction to Variables',
            'description': 'Learn about Python variables',
            'order': 1,
            'duration_minutes': 45
        }
        
        new_module = Mock(spec=Module)
        new_module.id = 'module-123'
        new_module.title = module_data['title']
        
        module_service.module_repo.create.return_value = new_module
        
        result = module_service.create_module(
            course_id='course-1',
            **module_data
        )
        
        assert result.id == 'module-123'
        module_service.module_repo.create.assert_called_once()
    
    def test_create_module_duplicate_order(self, module_service):
        """Test duplicate module order validation"""
        existing_module = Mock(spec=Module)
        module_service.module_repo.get_by_course_and_order.return_value = existing_module
        
        with pytest.raises(ValidationError, match="Module with order 1 already exists"):
            module_service.create_module(
                course_id='course-1',
                title='New Module',
                order=1
            )
    
    def test_reorder_modules(self, module_service):
        """Test reordering modules"""
        modules = []
        for i in range(3):
            m = Mock(spec=Module)
            m.id = f'module-{i}'
            m.order = i
            modules.append(m)
        
        module_service.module_repo.get_by_course.return_value = modules
        
        # Reorder: move module-2 to position 0
        new_order = ['module-2', 'module-0', 'module-1']
        
        module_service.reorder_modules('course-1', new_order)
        
        # Verify order was updated
        assert modules[2].order == 0  # module-2
        assert modules[0].order == 1  # module-0
        assert modules[1].order == 2  # module-1
        
        assert module_service.module_repo.update.call_count == 3
    
    def test_delete_module_with_files(self, module_service):
        """Test deleting module with associated files"""
        module = Mock(spec=Module)
        module.id = 'module-1'
        module_service.module_repo.get_by_id.return_value = module
        
        # Module has files
        files = [Mock(id=f'file-{i}') for i in range(3)]
        module_service.file_repo.get_by_module.return_value = files
        
        result = module_service.delete_module('module-1', cascade=True)
        
        assert result is True
        # Files should be deleted
        assert module_service.file_repo.delete.call_count == 3
        # Module should be deleted
        module_service.module_repo.delete.assert_called_once()


class TestEnrollment:
    """Test course enrollment"""
    
    def test_enroll_student_success(self, course_service, sample_course, sample_student):
        """Test successful student enrollment"""
        course_service.course_repo.get_by_id.return_value = sample_course
        course_service.enrollment_repo.get_by_student_and_course.return_value = None
        
        new_enrollment = Mock(spec=Enrollment)
        new_enrollment.student_id = sample_student.id
        new_enrollment.course_id = sample_course.id
        course_service.enrollment_repo.create.return_value = new_enrollment
        
        result = course_service.enroll_student(
            student=sample_student,
            course_id='course-1'
        )
        
        assert result.student_id == sample_student.id
        course_service.enrollment_repo.create.assert_called_once()
    
    def test_enroll_already_enrolled(self, course_service, sample_course, sample_student):
        """Test enrolling already enrolled student"""
        course_service.course_repo.get_by_id.return_value = sample_course
        
        existing_enrollment = Mock(spec=Enrollment)
        course_service.enrollment_repo.get_by_student_and_course.return_value = existing_enrollment
        
        with pytest.raises(ValidationError, match="Already enrolled"):
            course_service.enroll_student(
                student=sample_student,
                course_id='course-1'
            )
    
    def test_enroll_unpublished_course(self, course_service, sample_course, sample_student):
        """Test cannot enroll in unpublished course"""
        sample_course.is_published = False
        course_service.course_repo.get_by_id.return_value = sample_course
        
        with pytest.raises(ValidationError, match="Course is not published"):
            course_service.enroll_student(
                student=sample_student,
                course_id='course-1'
            )
    
    def test_enroll_with_access_code(self, course_service, sample_course, sample_student):
        """Test enrollment with access code"""
        sample_course.access_code = 'SECRET123'
        course_service.course_repo.get_by_id.return_value = sample_course
        course_service.enrollment_repo.get_by_student_and_course.return_value = None
        
        # Wrong access code
        with pytest.raises(ValidationError, match="Invalid access code"):
            course_service.enroll_student(
                student=sample_student,
                course_id='course-1',
                access_code='WRONG'
            )
        
        # Correct access code
        new_enrollment = Mock(spec=Enrollment)
        course_service.enrollment_repo.create.return_value = new_enrollment
        
        result = course_service.enroll_student(
            student=sample_student,
            course_id='course-1',
            access_code='SECRET123'
        )
        
        assert result is not None


class TestCourseAccess:
    """Test course access control"""
    
    def test_student_access_enrolled_course(self, course_service, sample_course, sample_student):
        """Test student can access enrolled course"""
        course_service.course_repo.get_by_id.return_value = sample_course
        
        enrollment = Mock(spec=Enrollment)
        course_service.enrollment_repo.get_by_student_and_course.return_value = enrollment
        
        has_access = course_service.check_course_access(
            user=sample_student,
            course_id='course-1'
        )
        
        assert has_access is True
    
    def test_student_access_not_enrolled(self, course_service, sample_course, sample_student):
        """Test student cannot access non-enrolled course"""
        course_service.course_repo.get_by_id.return_value = sample_course
        course_service.enrollment_repo.get_by_student_and_course.return_value = None
        
        has_access = course_service.check_course_access(
            user=sample_student,
            course_id='course-1'
        )
        
        assert has_access is False
    
    def test_instructor_access_own_course(self, course_service, sample_course, sample_instructor):
        """Test instructor can access own course"""
        course_service.course_repo.get_by_id.return_value = sample_course
        
        has_access = course_service.check_course_access(
            user=sample_instructor,
            course_id='course-1'
        )
        
        assert has_access is True
    
    def test_admin_access_any_course(self, course_service, sample_course):
        """Test admin can access any course"""
        admin = Mock(spec=User)
        admin.role = RoleType.ADMIN
        
        course_service.course_repo.get_by_id.return_value = sample_course
        
        has_access = course_service.check_course_access(
            user=admin,
            course_id='course-1'
        )
        
        assert has_access is True


class TestCourseStatistics:
    """Test course statistics and reporting"""
    
    def test_get_course_stats(self, course_service, sample_course):
        """Test getting course statistics"""
        course_service.course_repo.get_by_id.return_value = sample_course
        
        # Mock enrollment count
        course_service.enrollment_repo.count_by_course.return_value = 25
        
        # Mock completion rate
        course_service.enrollment_repo.get_completion_rate.return_value = 0.75
        
        # Mock average rating
        course_service.course_repo.get_average_rating.return_value = 4.5
        
        stats = course_service.get_course_statistics('course-1')
        
        assert stats['enrolled_students'] == 25
        assert stats['completion_rate'] == 0.75
        assert stats['average_rating'] == 4.5
    
    def test_get_student_progress(self, course_service, sample_course, sample_student):
        """Test getting student progress in course"""
        course_service.course_repo.get_by_id.return_value = sample_course
        
        enrollment = Mock(spec=Enrollment)
        enrollment.progress = 0.6  # 60% complete
        enrollment.completed_modules = ['module-1', 'module-2']
        course_service.enrollment_repo.get_by_student_and_course.return_value = enrollment
        
        progress = course_service.get_student_progress(
            student_id=sample_student.id,
            course_id='course-1'
        )
        
        assert progress['completion_percentage'] == 60
        assert len(progress['completed_modules']) == 2


class TestBulkOperations:
    """Test bulk course operations"""
    
    def test_bulk_enroll_students(self, course_service, sample_course):
        """Test bulk student enrollment"""
        course_service.course_repo.get_by_id.return_value = sample_course
        
        student_ids = ['student-1', 'student-2', 'student-3']
        
        # Mock no existing enrollments
        course_service.enrollment_repo.get_by_student_and_course.return_value = None
        
        results = course_service.bulk_enroll_students(
            course_id='course-1',
            student_ids=student_ids
        )
        
        assert results['enrolled'] == 3
        assert results['already_enrolled'] == 0
        assert course_service.enrollment_repo.create.call_count == 3
    
    def test_archive_old_courses(self, course_service):
        """Test archiving old courses"""
        # Mock old courses
        old_courses = []
        for i in range(5):
            course = Mock(spec=Course)
            course.id = f'old-course-{i}'
            course.created_at = datetime.utcnow() - timedelta(days=400)
            course.is_archived = False
            old_courses.append(course)
        
        course_service.course_repo.get_courses_older_than.return_value = old_courses
        
        count = course_service.archive_old_courses(days=365)
        
        assert count == 5
        # All courses should be marked as archived
        for course in old_courses:
            assert course.is_archived is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
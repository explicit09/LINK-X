"""
API v2 Course Endpoints
"""
from flask import Blueprint, request, g
from datetime import datetime
import logging

from core.decorators_unified import firebase_auth_required
from core.exceptions import ValidationError, NotFoundError, UnauthorizedError
from services.course_service_optimized import OptimizedCourseService as CourseService
from services.module_service import ModuleService
from repositories.file_repository import FileRepository
from repositories.module_repository import ModuleRepository

from .utils import success_response, error_response, paginated_response, validate_pagination

logger = logging.getLogger(__name__)

# Create courses blueprint
courses_bp = Blueprint('api_v2_courses', __name__)

# Initialize services
course_service = CourseService()
module_service = ModuleService()


@courses_bp.route('', methods=['GET'])
@firebase_auth_required
def list_courses_v2():
    """List courses with pagination and filtering"""
    try:
        user = g.current_user
        
        # Pagination parameters
        page, per_page = validate_pagination()
        
        # Get courses based on user role
        courses = []
        total = 0
        
        if user.role and user.role.role_type == 'student':
            courses = course_service.get_student_courses(user.id, page, per_page)
            total = len(courses)  # For now, use actual count
        elif user.role and user.role.role_type == 'instructor':
            courses = course_service.get_instructor_courses(user.id, page, per_page)
            total = len(courses)  # For now, use actual count
        elif user.role and user.role.role_type == 'admin':
            courses = course_service.get_all_courses(page, per_page)
            total = len(courses)  # For now, use actual count
        else:
            # No role or unknown role, return empty list
            courses = []
            total = 0
        
        # Format courses for response - simplified to avoid attribute errors
        formatted_courses = []
        for course in courses:
            # Handle both dict and object formats that might be returned
            if isinstance(course, dict):
                course_data = course
            else:
                course_data = {
                    'id': str(course.id),
                    'title': course.title,
                    'description': getattr(course, 'description', ''),
                    'code': getattr(course, 'code', ''),
                    'term': getattr(course, 'term', ''),
                    'category': getattr(course, 'category', ''),
                    'tags': getattr(course, 'tags', []) or [],
                    'instructor_id': str(getattr(course, 'instructor_id', '')),
                    'published': getattr(course, 'published', True),
                    'created_at': getattr(course, 'created_at', None),
                    'last_updated': getattr(course, 'last_updated', None)
                }
            
            formatted_courses.append({
                'id': str(course_data.get('id', '')),
                'title': course_data.get('title', 'Untitled Course'),
                'description': course_data.get('description', ''),
                'code': course_data.get('code', ''),  # Add course code
                'term': course_data.get('term', ''),   # Add term
                'category': course_data.get('category', ''),
                'tags': course_data.get('tags', []) or [],
                'instructor': {
                    'id': str(course_data.get('instructor_id', '')),
                    'name': 'Instructor'  # Simplified for now
                },
                'stats': {
                    'students': 0,  # Simplified for now
                    'modules': 0,   # Simplified for now
                    'materials': 0  # Simplified for now
                },
                'created_at': course_data.get('created_at'),
                'updated_at': course_data.get('last_updated') or course_data.get('updated_at')
            })
        
        return paginated_response(
            items=formatted_courses,
            page=page,
            per_page=per_page,
            total=total,
            endpoint='api_v2_courses.list_courses_v2'
        )
        
    except Exception as e:
        logger.error(f"List courses error: {str(e)}")
        return error_response("An error occurred fetching courses", status_code=500)


@courses_bp.route('', methods=['POST'])
@firebase_auth_required
def create_course_v2():
    """Create a new course with enhanced validation"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        # Validate required fields
        required_fields = ['title', 'description']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return error_response(
                f"Missing required fields: {', '.join(missing_fields)}", 
                errors={'missing_fields': missing_fields}
            )
        
        # Create course
        course = course_service.create_course(
            instructor_id=user.id,
            title=data['title'],
            description=data['description'],
            category=data.get('category'),
            tags=data.get('tags', [])
        )
        
        # Format response
        formatted_course = {
            'id': str(course.id),
            'title': course.title,
            'description': course.description,
            'category': course.category if hasattr(course, 'category') else '',
            'tags': course.tags if hasattr(course, 'tags') else [],
            'access_code': course_service.get_access_code(course.id),
            'published': False,
            'created_at': course.created_at.isoformat() if hasattr(course, 'created_at') else datetime.utcnow().isoformat()
        }
        
        return success_response(
            formatted_course, 
            message="Course created successfully", 
            status_code=201
        )
        
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"Create course error: {str(e)}")
        return error_response("An error occurred creating the course", status_code=500)


@courses_bp.route('/<course_id>', methods=['GET'])
@firebase_auth_required
def get_course_v2(course_id):
    """Get detailed course information"""
    try:
        user = g.current_user
        
        # Get course with access check
        course = course_service.get_course_with_access_check(course_id, user.id)
        
        # Format detailed response
        formatted_course = {
            'id': str(course.id),
            'title': course.title,
            'description': course.description,
            'code': getattr(course, 'code', ''),
            'term': getattr(course, 'term', ''),
            'category': getattr(course, 'category', ''),
            'tags': getattr(course, 'tags', []) or [],
            'instructor': {
                'id': str(course.instructor_id) if course.instructor_id else '',
                'name': course.instructor_profile.name if hasattr(course, 'instructor_profile') and course.instructor_profile else 'Instructor'
            },
            'published': course.published,
            'access_code': course_service.get_access_code(course.id) if user.id == course.instructor_id else None,
            'stats': {
                'students': course_service.get_student_count(course.id),
                'modules': len(course.modules) if hasattr(course, 'modules') else 0,
                'materials': sum(len(m.files) for m in course.modules) if hasattr(course, 'modules') else 0
            },
            'created_at': course.created_at.isoformat() if hasattr(course, 'created_at') else None,
            'updated_at': course.last_updated.isoformat() if hasattr(course, 'last_updated') else None
        }
        
        return success_response(formatted_course)
        
    except NotFoundError:
        return error_response("Course not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except Exception as e:
        logger.error(f"Get course error: {str(e)}")
        return error_response("An error occurred fetching the course", status_code=500)


@courses_bp.route('/<course_id>', methods=['PATCH'])
@firebase_auth_required
def update_course_v2(course_id):
    """Update course information"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("No data provided")
        
        # Update course
        updated_course = course_service.update_course(
            course_id=course_id,
            user_id=user.id,
            **data
        )
        
        # Return updated course
        return get_course_v2(course_id)
        
    except NotFoundError:
        return error_response("Course not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"Update course error: {str(e)}")
        return error_response("An error occurred updating the course", status_code=500)


@courses_bp.route('/<course_id>', methods=['DELETE'])
@firebase_auth_required
def delete_course_v2(course_id):
    """Delete a course"""
    try:
        user = g.current_user
        
        # Delete course
        success = course_service.delete_course(course_id, user.id)
        
        if success:
            return success_response(message="Course deleted successfully")
        else:
            return error_response("Failed to delete course", status_code=500)
            
    except NotFoundError:
        return error_response("Course not found", status_code=404)
    except UnauthorizedError:
        return error_response("Access denied", status_code=403)
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"Delete course error: {str(e)}")
        return error_response("An error occurred deleting the course", status_code=500)


@courses_bp.route('/<course_id>/modules', methods=['GET'])
@firebase_auth_required
def list_modules_v2(course_id):
    """List course modules with files"""
    try:
        user = g.current_user
        
        # Check access
        if not course_service.check_course_access(course_id, user.id):
            return error_response("Access denied", status_code=403)
        
        # Get modules
        modules = course_service.get_course_modules(course_id, user.id)
        
        # Load files for each module
        file_repo = FileRepository()
        
        # Format response
        formatted_modules = []
        for module in modules:
            # Get files for this module
            module_files = file_repo.get_by_module(module.id)
            
            formatted_modules.append({
                'id': str(module.id),
                'title': module.title,
                'description': module.description or '',
                'ordering': module.ordering,
                'materials': [{
                    'id': str(file.id),
                    'title': file.title,
                    'filename': file.filename,
                    'file_type': file.file_type,
                    'file_size': file.file_size,
                    'created_at': file.created_at.isoformat() if hasattr(file, 'created_at') and file.created_at else None,
                    's3_key': file.s3_key if hasattr(file, 's3_key') else None
                } for file in module_files],
                'created_at': module.created_at.isoformat() if hasattr(module, 'created_at') and module.created_at else None,
                'updated_at': module.last_updated.isoformat() if hasattr(module, 'last_updated') and module.last_updated else None
            })
        
        return success_response(formatted_modules)
        
    except Exception as e:
        logger.error(f"List modules error: {str(e)}")
        return error_response("An error occurred fetching modules", status_code=500)


@courses_bp.route('/<course_id>/modules', methods=['POST'])
@firebase_auth_required
def create_module_v2(course_id):
    """Create a new module in a course"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data or 'title' not in data:
            return error_response("Title is required")
        
        # Check access
        if not course_service.check_course_access(course_id, user.id):
            return error_response("Access denied", status_code=403)
        
        # Create module
        module = module_service.create_module(
            course_id=course_id,
            title=data['title'],
            description=data.get('description'),
            ordering=data.get('ordering')
        )
        
        # Format response
        formatted_module = {
            'id': str(module.id),
            'course_id': str(module.course_id),
            'title': module.title,
            'description': module.description or '',
            'ordering': module.ordering,
            'created_at': module.created_at.isoformat() if hasattr(module, 'created_at') else datetime.utcnow().isoformat()
        }
        
        return success_response(
            formatted_module,
            message="Module created successfully",
            status_code=201
        )
        
    except ValidationError as e:
        return error_response(str(e))
    except Exception as e:
        logger.error(f"Create module error: {str(e)}")
        return error_response("An error occurred creating the module", status_code=500)
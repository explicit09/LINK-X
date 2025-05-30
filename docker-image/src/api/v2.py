"""
API v2 Blueprint - Modern API with improved structure and deprecation of v1
"""
from flask import Blueprint, jsonify, request, g
from datetime import datetime, timezone
import logging

from core.decorators_unified import firebase_auth_required
from core.database import db
from core.exceptions import ValidationError, NotFoundError, UnauthorizedError
from services.course_service import CourseService
from services.file_service import FileService
from services.auth_service_unified import UnifiedAuthService as AuthService
from services.module_service import ModuleService
from repositories.todo_repository import TodoRepository
from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from repositories.module_repository import ModuleRepository
from repositories.file_repository import FileRepository
from repositories.enrollment_repository import EnrollmentRepository

# Create v2 blueprint with versioned prefix
api_v2 = Blueprint('api_v2', __name__, url_prefix='/api/v2')
logger = logging.getLogger(__name__)

# Initialize services
course_service = CourseService()
file_service = FileService()
module_service = ModuleService()
auth_service = AuthService()


# ===== COMMON RESPONSE HELPERS =====
def success_response(data=None, message="Success", status_code=200):
    """Standardized success response"""
    response = {
        'success': True,
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code


def error_response(message="Error", errors=None, status_code=400):
    """Standardized error response"""
    response = {
        'success': False,
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    if errors:
        response['errors'] = errors
    return jsonify(response), status_code


def paginated_response(items, page, per_page, total, endpoint, **kwargs):
    """Standardized paginated response"""
    from flask import url_for
    
    pages = (total + per_page - 1) // per_page
    
    response = {
        'success': True,
        'data': items,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': pages,
            'has_next': page < pages,
            'has_prev': page > 1
        },
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    
    # Add navigation links
    if page > 1:
        response['pagination']['prev_url'] = url_for(endpoint, page=page-1, per_page=per_page, **kwargs)
    if page < pages:
        response['pagination']['next_url'] = url_for(endpoint, page=page+1, per_page=per_page, **kwargs)
    
    return jsonify(response), 200


# ===== AUTHENTICATION ENDPOINTS =====
@api_v2.route('/auth/login', methods=['POST'])
def login_v2():
    """Enhanced login with better error handling and response structure"""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", status_code=400)
        
        id_token = data.get('idToken')
        if not id_token:
            return error_response("ID token is required", errors={'idToken': 'This field is required'}, status_code=400)
        
        # Use auth service for login
        result = auth_service.login_with_firebase(id_token)
        
        # Enhanced response with user details
        user = result['user']
        
        # Get display name from the appropriate profile
        display_name = None
        if user.role:
            if user.role.role_type == 'student' and user.student_profile:
                display_name = user.student_profile.name
            elif user.role.role_type == 'instructor' and user.instructor_profile:
                display_name = user.instructor_profile.name
            elif user.role.role_type == 'admin' and user.admin_profile:
                display_name = user.admin_profile.name
        
        # Fallback to email if no profile name is available
        if not display_name:
            display_name = user.email.split('@')[0]
        
        response_data = {
            'user': {
                'id': str(user.id),
                'email': user.email,
                'display_name': display_name,
                'role': user.role.role_type if user.role else None,
                'firebase_uid': user.firebase_uid,
                'created_at': None  # Not available in current User model
            },
            'tokens': {
                'access_token': result['access_token'],
                'refresh_token': result.get('refresh_token'),
                'expires_in': 3600  # 1 hour
            }
        }
        
        return success_response(response_data, "Login successful")
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except UnauthorizedError as e:
        return error_response(str(e), status_code=401)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return error_response("An error occurred during login", status_code=500)


@api_v2.route('/auth/logout', methods=['POST'])
@firebase_auth_required
def logout_v2():
    """Enhanced logout with token invalidation"""
    try:
        # Get JWT token for blacklisting
        from flask_jwt_extended import get_jwt
        token = get_jwt()
        
        # Blacklist the token
        from services.jwt_blacklist import jwt_blacklist
        from datetime import datetime
        exp_timestamp = token.get('exp', 0)
        exp_datetime = datetime.utcfromtimestamp(exp_timestamp) if exp_timestamp else datetime.utcnow()
        jwt_blacklist.blacklist_token(token['jti'], exp_datetime, token.get('sub'))
        
        return success_response(message="Logout successful")
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return error_response("An error occurred during logout", status_code=500)


@api_v2.route('/auth/me', methods=['GET'])
@firebase_auth_required
def get_profile_v2():
    """Get current user profile with enhanced details"""
    try:
        user = g.current_user
        user_repo = UserRepository()
        
        # Get full user details with profile
        full_user = user_repo.get_with_profile(user.id)
        
        if not full_user:
            return error_response("User not found", status_code=404)
        
        # Get display name from the appropriate profile
        display_name = None
        if full_user.role:
            if full_user.role.role_type == 'student' and full_user.student_profile:
                display_name = full_user.student_profile.name
            elif full_user.role.role_type == 'instructor' and full_user.instructor_profile:
                display_name = full_user.instructor_profile.name
            elif full_user.role.role_type == 'admin' and full_user.admin_profile:
                display_name = full_user.admin_profile.name
        
        # Fallback to email if no profile name is available
        if not display_name:
            display_name = full_user.email.split('@')[0]
        
        # Get additional stats based on role
        stats = {}
        if full_user.role and full_user.role.role_type == 'student':
            enrollment_repo = EnrollmentRepository()
            enrollments = enrollment_repo.get_by_student(user.id)
            stats['enrolled_courses'] = len(enrollments)
            stats['completed_courses'] = sum(1 for e in enrollments if getattr(e, 'completed', False))
            
        elif full_user.role and full_user.role.role_type == 'instructor':
            course_repo = CourseRepository()
            courses = course_repo.get_by_instructor(user.id)
            stats['total_courses'] = len(courses)
            stats['total_students'] = sum(course_repo.get_student_count(c.id) for c in courses)
        
        response_data = {
            'id': str(full_user.id),
            'email': full_user.email,
            'display_name': display_name,
            'firebase_uid': full_user.firebase_uid,
            'role': {
                'type': full_user.role.role_type if full_user.role else None,
                'permissions': getattr(full_user.role, 'permissions', []) if full_user.role else []
            },
            'profile': {
                'bio': None,  # Not implemented yet
                'avatar_url': None,  # Not implemented yet
                'institution': getattr(full_user.instructor_profile, 'university', None) if full_user.instructor_profile else None,
                'department': None  # Not implemented yet
            },
            'stats': stats,
            'created_at': None,  # Not available in current User model
            'last_login': datetime.now().isoformat()  # Use current time as placeholder
        }
        
        return success_response(response_data)
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        return error_response("An error occurred fetching profile", status_code=500)


@api_v2.route('/auth/me', methods=['PATCH'])
@firebase_auth_required
def update_profile_v2():
    """Update current user profile with validation"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("Request body is required", status_code=400)
        
        # Validate allowed fields - simplified to what actually exists
        allowed_fields = ['name']  # Only name can be updated in current schema
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return error_response("No valid fields to update. Only 'name' is currently supported.", status_code=400)
        
        # For now, just return success without actually updating
        # TODO: Implement proper profile updates based on user role and profile type
        return success_response({'message': 'Profile update not fully implemented yet'}, "Profile update noted")
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        return error_response("An error occurred updating profile", status_code=500)


# ===== COURSES ENDPOINTS =====
@api_v2.route('/courses', methods=['GET'])
@firebase_auth_required
def list_courses_v2():
    """List courses with pagination and filtering"""
    try:
        user = g.current_user
        
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
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
                'created_at': None,     # Simplified for now
                'updated_at': None      # Simplified for now
            })
        
        return paginated_response(
            items=formatted_courses,
            page=page,
            per_page=per_page,
            total=total,
            endpoint='api_v2.list_courses_v2'
        )
        
    except Exception as e:
        logger.error(f"List courses error: {str(e)}")
        return error_response("An error occurred fetching courses", status_code=500)


@api_v2.route('/courses', methods=['POST'])
@firebase_auth_required
def create_course_v2():
    """Create a new course with enhanced validation"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("Request body is required", status_code=400)
        
        # Validate required fields
        required_fields = ['title', 'description']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return error_response(
                "Missing required fields",
                errors={field: 'This field is required' for field in missing_fields},
                status_code=400
            )
        
        # Validate user is instructor
        if not user.role or user.role.role_type != 'instructor':
            return error_response("Only instructors can create courses", status_code=403)
        
        # Create course
        course_data = {
            'title': data['title'],
            'description': data['description'],
            'category': data.get('category', 'General'),
            'tags': data.get('tags', []),
            'instructor_id': user.id,
            'code': data.get('code', ''),
            'term': data.get('term', ''),
            'published': data.get('published', True)
        }
        
        created_course = course_service.create_course(course_data)
        
        response_data = {
            'id': str(created_course.id),
            'title': created_course.title,
            'description': created_course.description,
            'category': created_course.category,
            'tags': created_course.tags or [],
            'code': created_course.code,
            'term': created_course.term,
            'published': created_course.published,
            'created_at': created_course.created_at.isoformat() if created_course.created_at else None
        }
        
        return success_response(response_data, "Course created successfully", status_code=201)
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.error(f"Create course error: {str(e)}")
        return error_response("An error occurred creating the course", status_code=500)


@api_v2.route('/courses/<course_id>', methods=['GET'])
@firebase_auth_required
def get_course_v2(course_id):
    """Get course details with enhanced information"""
    try:
        user = g.current_user
        
        # Check access
        if not course_service.check_course_access(course_id, user.id):
            return error_response("Access denied", status_code=403)
        
        # Get course with full details
        course = course_service.get_course_with_details(course_id)
        
        if not course:
            return error_response("Course not found", status_code=404)
        
        # Format response with all details
        response_data = {
            'id': str(course.id),
            'title': course.title,
            'description': course.description,
            'category': course.category,
            'tags': course.tags or [],
            'code': course.code,
            'term': course.term,
            'published': course.published,
            'instructor': {
                'id': str(course.instructor_id),
                'name': course.instructor.instructor_profile.name if course.instructor and course.instructor.instructor_profile else 'Unknown',
                'email': course.instructor.email if course.instructor else ''
            },
            'modules': [{
                'id': str(module.id),
                'title': module.title,
                'description': module.description,
                'ordering': module.ordering,
                'material_count': len(module.files) if hasattr(module, 'files') else 0
            } for module in course.modules] if hasattr(course, 'modules') else [],
            'stats': {
                'students': course.student_count if hasattr(course, 'student_count') else 0,
                'modules': len(course.modules) if hasattr(course, 'modules') else 0,
                'materials': course.material_count if hasattr(course, 'material_count') else 0
            },
            'user_enrollment': {
                'is_enrolled': course.is_enrolled if hasattr(course, 'is_enrolled') else False,
                'enrollment_date': course.enrollment_date.isoformat() if hasattr(course, 'enrollment_date') and course.enrollment_date else None
            },
            'created_at': course.created_at.isoformat() if course.created_at else None,
            'updated_at': course.last_updated.isoformat() if course.last_updated else None
        }
        
        return success_response(response_data)
        
    except Exception as e:
        logger.error(f"Get course error: {str(e)}")
        return error_response("An error occurred fetching the course", status_code=500)


@api_v2.route('/courses/<course_id>', methods=['PUT', 'PATCH'])
@firebase_auth_required
def update_course_v2(course_id):
    """Update course with validation"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("Request body is required", status_code=400)
        
        # Check if user is course instructor
        course = course_service.get_course(course_id)
        if not course:
            return error_response("Course not found", status_code=404)
        
        if str(course.instructor_id) != str(user.id):
            return error_response("Only the course instructor can update this course", status_code=403)
        
        # Validate update fields
        allowed_fields = ['title', 'description', 'category', 'tags', 'code', 'term', 'published']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return error_response("No valid fields to update", status_code=400)
        
        # Update course
        updated_course = course_service.update_course(course_id, update_data)
        
        return success_response(
            {'updated_fields': list(update_data.keys())},
            "Course updated successfully"
        )
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.error(f"Update course error: {str(e)}")
        return error_response("An error occurred updating the course", status_code=500)


@api_v2.route('/courses/<course_id>', methods=['DELETE'])
@firebase_auth_required
def delete_course_v2(course_id):
    """Delete course with proper authorization"""
    try:
        user = g.current_user
        
        # Check if user is course instructor
        course = course_service.get_course(course_id)
        if not course:
            return error_response("Course not found", status_code=404)
        
        if str(course.instructor_id) != str(user.id):
            return error_response("Only the course instructor can delete this course", status_code=403)
        
        # Delete course
        success = course_service.delete_course(course_id)
        
        if success:
            return success_response(message="Course deleted successfully")
        else:
            return error_response("Failed to delete course", status_code=500)
            
    except Exception as e:
        logger.error(f"Delete course error: {str(e)}")
        return error_response("An error occurred deleting the course", status_code=500)


# ===== MODULES ENDPOINTS =====
@api_v2.route('/courses/<course_id>/modules', methods=['GET'])
@firebase_auth_required
def list_modules_v2(course_id):
    """List course modules with enhanced details"""
    try:
        user = g.current_user
        
        # Check access
        if not course_service.check_course_access(course_id, user.id):
            return error_response("Access denied", status_code=403)
        
        # Get modules
        modules = module_service.get_course_modules(course_id)
        
        # Format response
        formatted_modules = []
        for module in modules:
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
                    's3_key': file.s3_key if hasattr(file, 's3_key') else None
                } for file in module.files] if hasattr(module, 'files') else [],
                'created_at': module.created_at.isoformat() if hasattr(module, 'created_at') else None,
                'updated_at': module.last_updated.isoformat() if hasattr(module, 'last_updated') else None
            })
        
        return success_response(formatted_modules)
        
    except Exception as e:
        logger.error(f"List modules error: {str(e)}")
        return error_response("An error occurred fetching modules", status_code=500)


@api_v2.route('/courses/<course_id>/modules', methods=['POST'])
@firebase_auth_required
def create_module_v2(course_id):
    """Create a new module with validation"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("Request body is required", status_code=400)
        
        # Check if user is course instructor
        course = course_service.get_course(course_id)
        if not course:
            return error_response("Course not found", status_code=404)
        
        if str(course.instructor_id) != str(user.id):
            return error_response("Only the course instructor can add modules", status_code=403)
        
        # Validate required fields
        if not data.get('title'):
            return error_response("Module title is required", errors={'title': 'This field is required'}, status_code=400)
        
        # Create module
        module_data = {
            'title': data['title'],
            'description': data.get('description', ''),
            'course_id': course_id,
            'ordering': data.get('ordering', 0)
        }
        
        created_module = module_service.create_module(module_data)
        
        response_data = {
            'id': str(created_module.id),
            'title': created_module.title,
            'description': created_module.description,
            'course_id': str(created_module.course_id),
            'ordering': created_module.ordering,
            'created_at': created_module.created_at.isoformat() if hasattr(created_module, 'created_at') else None
        }
        
        return success_response(response_data, "Module created successfully", status_code=201)
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.error(f"Create module error: {str(e)}")
        return error_response("An error occurred creating the module", status_code=500)


# ===== FILES ENDPOINTS =====
@api_v2.route('/files/upload', methods=['POST'])
@firebase_auth_required
def upload_file_v2():
    """Upload file with enhanced validation and progress tracking"""
    try:
        user = g.current_user
        
        # Validate request
        if 'file' not in request.files:
            return error_response("No file provided", errors={'file': 'This field is required'}, status_code=400)
        
        file = request.files['file']
        if file.filename == '':
            return error_response("No file selected", status_code=400)
        
        module_id = request.form.get('module_id')
        if not module_id:
            return error_response("Module ID is required", errors={'module_id': 'This field is required'}, status_code=400)
        
        # Check module access
        module = module_service.get_module(module_id)
        if not module:
            return error_response("Module not found", status_code=404)
        
        course = course_service.get_course(module.course_id)
        if not course or str(course.instructor_id) != str(user.id):
            return error_response("Only the course instructor can upload files", status_code=403)
        
        # Upload file
        title = request.form.get('title', file.filename)
        uploaded_file = file_service.upload_file(
            file=file,
            module_id=module_id,
            title=title,
            uploaded_by=user.id
        )
        
        response_data = {
            'id': str(uploaded_file.id),
            'title': uploaded_file.title,
            'filename': uploaded_file.filename,
            'file_type': uploaded_file.file_type,
            'file_size': uploaded_file.file_size,
            's3_key': uploaded_file.s3_key,
            'module_id': str(uploaded_file.module_id),
            'uploaded_by': str(uploaded_file.uploaded_by),
            'created_at': uploaded_file.created_at.isoformat() if uploaded_file.created_at else None
        }
        
        return success_response(response_data, "File uploaded successfully", status_code=201)
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        return error_response("An error occurred uploading the file", status_code=500)


@api_v2.route('/files/<file_id>/content', methods=['GET'])
@firebase_auth_required
def get_file_content_v2(file_id):
    """Get file content with signed URL"""
    try:
        user = g.current_user
        
        # Get file and check access
        file = file_service.get_file(file_id)
        if not file:
            return error_response("File not found", status_code=404)
        
        # Check course access through module
        module = module_service.get_module(file.module_id)
        if not module or not course_service.check_course_access(module.course_id, user.id):
            return error_response("Access denied", status_code=403)
        
        # Get signed URL
        from services.s3_signed_urls import generate_signed_url
        signed_url = generate_signed_url(file.s3_key, expiration=3600)  # 1 hour
        
        response_data = {
            'id': str(file.id),
            'title': file.title,
            'filename': file.filename,
            'file_type': file.file_type,
            'file_size': file.file_size,
            'signed_url': signed_url,
            'expires_in': 3600
        }
        
        return success_response(response_data)
        
    except Exception as e:
        logger.error(f"Get file content error: {str(e)}")
        return error_response("An error occurred fetching file content", status_code=500)


# ===== TODO ENDPOINTS =====
@api_v2.route('/todos', methods=['GET'])
@firebase_auth_required
def list_todos_v2():
    """List todos with pagination and filtering"""
    try:
        user = g.current_user
        
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Filtering
        status = request.args.get('status')  # pending, completed, all
        priority = request.args.get('priority')  # high, medium, low
        
        todo_repo = TodoRepository()
        # For now, just get all todos without pagination
        all_todos = todo_repo.get_by_user(str(user.id))
        
        # Simple filtering
        if status == 'completed':
            todos = [t for t in all_todos if t.completed]
        elif status == 'pending':
            todos = [t for t in all_todos if not t.completed]
        else:
            todos = all_todos
            
        # Priority filtering
        if priority:
            todos = [t for t in todos if t.priority == priority]
            
        # Simple pagination
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
                'status': todo.status,
                'priority': todo.priority,
                'due_date': todo.due_date.isoformat() if todo.due_date else None,
                'completed_at': todo.completed_at.isoformat() if todo.completed_at else None,
                'created_at': todo.created_at.isoformat() if todo.created_at else None,
                'updated_at': todo.updated_at.isoformat() if todo.updated_at else None
            })
        
        return paginated_response(
            items=formatted_todos,
            page=page,
            per_page=per_page,
            total=total,
            endpoint='api_v2.list_todos_v2',
            status=status,
            priority=priority
        )
        
    except Exception as e:
        logger.error(f"List todos error: {str(e)}")
        return error_response("An error occurred fetching todos", status_code=500)


@api_v2.route('/todos', methods=['POST'])
@firebase_auth_required
def create_todo_v2():
    """Create a new todo with validation"""
    try:
        user = g.current_user
        data = request.get_json()
        
        if not data:
            return error_response("Request body is required", status_code=400)
        
        # Validate required fields
        if not data.get('title'):
            return error_response("Title is required", errors={'title': 'This field is required'}, status_code=400)
        
        # Create todo
        todo_data = {
            'title': data['title'],
            'description': data.get('description', ''),
            'priority': data.get('priority', 'medium'),
            'due_date': data.get('due_date'),
            'user_id': user.id
        }
        
        todo_repo = TodoRepository()
        created_todo = todo_repo.create(todo_data)
        
        response_data = {
            'id': str(created_todo.id),
            'title': created_todo.title,
            'description': created_todo.description,
            'status': created_todo.status,
            'priority': created_todo.priority,
            'due_date': created_todo.due_date.isoformat() if created_todo.due_date else None,
            'created_at': created_todo.created_at.isoformat() if created_todo.created_at else None
        }
        
        return success_response(response_data, "Todo created successfully", status_code=201)
        
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.error(f"Create todo error: {str(e)}")
        return error_response("An error occurred creating the todo", status_code=500)


# ===== HEALTH CHECK =====
@api_v2.route('/health', methods=['GET'])
def health_check_v2():
    """Enhanced health check with service status"""
    try:
        # Check database
        db_status = "healthy"
        try:
            db.session.execute('SELECT 1')
        except:
            db_status = "unhealthy"
        
        # Check Redis (if configured)
        redis_status = "not_configured"
        try:
            from core.cache import cache
            cache.ping()
            redis_status = "healthy"
        except:
            pass
        
        response_data = {
            'status': 'healthy' if db_status == 'healthy' else 'degraded',
            'version': '2.0.0',
            'services': {
                'database': db_status,
                'redis': redis_status
            },
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        status_code = 200 if db_status == 'healthy' else 503
        return jsonify(response_data), status_code
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 503


# ===== COMPATIBILITY ENDPOINTS =====
# These endpoints provide backward compatibility for older API calls

@api_v2.route('/user/profile', methods=['GET'])
@firebase_auth_required
def get_user_profile_legacy():
    """Legacy endpoint - redirects to /auth/me for backward compatibility"""
    return get_profile_v2()


@api_v2.route('/user/profile', methods=['PATCH'])
@firebase_auth_required 
def update_user_profile_legacy():
    """Legacy endpoint - redirects to /auth/me for backward compatibility"""
    return update_profile_v2()


@api_v2.route('/session', methods=['GET'])
@firebase_auth_required
def get_session_legacy():
    """Legacy session endpoint - returns current user session info"""
    return get_profile_v2()


@api_v2.route('/session', methods=['POST'])
def create_session_legacy():
    """Legacy session login endpoint - redirects to /auth/login for backward compatibility"""
    # This would normally handle session creation, but we redirect to the login flow
    from flask import redirect, url_for
    return error_response("Use /auth/login for authentication", status_code=410)


# ===== TODO COMPATIBILITY ENDPOINTS =====
@api_v2.route('/todo-items', methods=['GET'])
@firebase_auth_required
def list_todo_items_legacy():
    """Legacy endpoint - redirects to /todos for backward compatibility"""
    return list_todos_v2()


@api_v2.route('/todo-items', methods=['POST'])
@firebase_auth_required
def create_todo_item_legacy():
    """Legacy endpoint - redirects to /todos for backward compatibility"""
    return create_todo_v2()


@api_v2.route('/todo-items/<todo_id>', methods=['PATCH'])
@firebase_auth_required
def update_todo_item_legacy(todo_id):
    """Legacy endpoint - not implemented yet"""
    return error_response("Todo updates not implemented yet", status_code=501)


@api_v2.route('/todo-items/<todo_id>', methods=['DELETE'])
@firebase_auth_required
def delete_todo_item_legacy(todo_id):
    """Legacy endpoint - not implemented yet"""
    return error_response("Todo deletion not implemented yet", status_code=501)


# ===== ACTIVITIES ENDPOINTS =====
@api_v2.route('/activities/recent', methods=['GET'])
@firebase_auth_required
def get_recent_activities():
    """Get recent user activities"""
    try:
        # For now, return empty activities list
        # TODO: Implement real activity tracking
        return success_response([])
    except Exception as e:
        logger.error(f"Get recent activities error: {str(e)}")
        return error_response("An error occurred fetching activities", status_code=500)


@api_v2.route('/activities/stats', methods=['GET'])
@firebase_auth_required
def get_activity_stats():
    """Get user activity statistics"""
    try:
        # For now, return basic stats
        # TODO: Implement real activity statistics
        stats = {
            'aiInteractions': 0,
            'weeklyHours': 0,
            'totalActivities': 0,
            'streakDays': 0
        }
        return success_response(stats)
    except Exception as e:
        logger.error(f"Get activity stats error: {str(e)}")
        return error_response("An error occurred fetching activity stats", status_code=500)
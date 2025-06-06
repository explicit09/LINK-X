"""
API v1 Blueprint - Consolidates all v1 endpoints
DEPRECATED: This API version will be sunset on December 31, 2025
"""
from flask import Blueprint, jsonify, request, g, make_response
from datetime import datetime, timedelta
import uuid
import logging
from functools import wraps

from core.auth.decorators import require_auth
from core.database_supabase import db
from core.api_versioning import version_aware_route
from db.schema import Enrollment, Course, PersonalizedFile, File, Module
from services.course_service import CourseService
from services.file_service import FileService
from services.auth_service_unified import UnifiedAuthService as AuthService
from repositories.todo_repository import TodoRepository
from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from repositories.module_repository import ModuleRepository
from repositories.file_repository import FileRepository
from services.s3_storage import s3_storage

api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')
logger = logging.getLogger(__name__)


def add_deprecation_warning(f):
    """Add deprecation warning to v1 endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Execute the original function
        response = f(*args, **kwargs)
        
        # Convert to Response object if needed
        if isinstance(response, tuple):
            response_data, status_code = response
            response = make_response(response_data, status_code)
        else:
            response = make_response(response)
        
        # Add deprecation headers
        response.headers['X-API-Deprecated'] = 'true'
        response.headers['X-API-Sunset'] = '2025-12-31'
        response.headers['X-API-Deprecation-Message'] = 'API v1 is deprecated and will be sunset on December 31, 2025. Please migrate to API v2.'
        response.headers['X-API-Migration-Guide'] = 'https://api.learn-x.com/docs/v2/migration'
        
        # Add warning to JSON response if applicable
        if response.is_json:
            try:
                data = response.get_json()
                if isinstance(data, dict):
                    data['_deprecation_warning'] = {
                        'message': 'API v1 is deprecated and will be sunset on December 31, 2025',
                        'sunset_date': '2025-12-31',
                        'migration_guide': 'https://api.learn-x.com/docs/v2/migration'
                    }
                    response.data = jsonify(data).data
            except:
                pass
        
        return response
    
    return decorated_function

# Apply deprecation warning to all routes
@api_v1.before_request
def before_request():
    """Log v1 API usage"""
    # Log the request for monitoring
    try:
        from monitoring.api_version_monitor import api_monitor
        user_id = getattr(g, 'current_user', None)
        user_id = user_id.id if user_id else None
        api_monitor.log_request('v1', request.endpoint, request.method, user_id)
    except:
        pass

@api_v1.after_request
def after_request(response):
    """Add deprecation headers to all v1 responses"""
    response.headers['X-API-Deprecated'] = 'true'
    response.headers['X-API-Sunset'] = '2025-12-31'
    response.headers['X-API-Deprecation-Message'] = 'API v1 is deprecated and will be sunset on December 31, 2025. Please migrate to API v2.'
    response.headers['X-API-Migration-Guide'] = 'https://api.learn-x.com/docs/v2/migration'
    
    # Add warning to JSON response if applicable
    if response.is_json:
        try:
            data = response.get_json()
            if isinstance(data, dict):
                data['_deprecation_warning'] = {
                    'message': 'API v1 is deprecated and will be sunset on December 31, 2025',
                    'sunset_date': '2025-12-31',
                    'migration_guide': 'https://api.learn-x.com/docs/v2/migration'
                }
                response.data = jsonify(data).data
                response.content_type = 'application/json'
        except:
            pass
    
    return response

# ===== AUTHENTICATION ENDPOINTS =====
@api_v1.route('/auth/sessionLogin', methods=['POST'])
def session_login():
    """Login with Firebase ID token"""
    from api.auth_unified import login
    return login()

@api_v1.route('/auth/sessionLogout', methods=['POST'])
def session_logout():
    """Logout and clear session"""
    from api.auth_unified import logout
    return logout()

@api_v1.route('/auth/me', methods=['GET', 'PATCH', 'DELETE'])
@require_auth
def user_profile():
    """Get, update, or delete user profile"""
    logger.info(f"v1.user_profile called, method: {request.method}")
    logger.info(f"g.current_user in v1: {getattr(g, 'current_user', 'NOT SET')}")
    
    from api.auth_unified import get_current_user as get_me, update_me, delete_me
    
    if request.method == 'GET':
        return get_me()
    elif request.method == 'PATCH':
        return update_me()
    elif request.method == 'DELETE':
        return delete_me()

@api_v1.route('/auth/register/instructor', methods=['POST'])
def register_instructor():
    """Register as instructor"""
    from api.auth_unified import register_instructor
    return register_instructor()

@api_v1.route('/auth/register/student', methods=['POST'])
def register_student():
    """Register as student"""
    from api.auth_unified import register_student
    return register_student()

# ===== COURSES ENDPOINTS =====
@api_v1.route('/courses', methods=['GET', 'POST'])
@require_auth
def handle_courses():
    """List courses or create new course"""
    user_id = g.current_user.id
    
    if request.method == 'GET':
        # Get user role
        user_repo = UserRepository()
        user = user_repo.get_with_profile(user_id)
        
        if not user or not user.role:
            return jsonify({'error': 'User not found'}), 404
        
        role = user.role
        
        course_repo = CourseRepository()
        
        # Get courses based on role
        if role.role_type == 'student':
            courses = course_repo.get_student_courses(user_id)
        elif role.role_type == 'instructor':
            courses = course_repo.get_by_instructor(user_id)
        else:
            return jsonify({'error': 'Invalid role'}), 403
        
        # Format response with all expected fields
        response_data = []
        for c in courses:
            # Get instructor info
            instructor = user_repo.get_by_id(c.instructor_id) if c.instructor_id else None
            
            # Get module count
            module_repo = ModuleRepository()
            modules = module_repo.get_by_course(c.id)
            
            # Get student count (for instructors)
            student_count = 0
            if role.role_type == 'instructor':
                enrollments = db.session.query(Enrollment).filter(Enrollment.course_id == c.id).count()
                student_count = enrollments
            
            course_data = {
                'id': str(c.id),
                'title': c.title,
                'description': c.description or '',
                'instructor_id': str(c.instructor_id) if c.instructor_id else None,
                'category': getattr(c, 'category', 'General'),
                'tags': getattr(c, 'tags', []),
                'published': True,
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'updated_at': c.last_updated.isoformat() if c.last_updated else c.created_at.isoformat() if c.created_at else None,
                'last_updated': c.last_updated.isoformat() if c.last_updated else c.created_at.isoformat() if c.created_at else None,
                'code': getattr(c, 'code', ''),
                'term': getattr(c, 'term', ''),
                'students': student_count,
                'materialsCount': len(modules),
                'instructor': {
                    'name': instructor.display_name if instructor and hasattr(instructor, 'display_name') else 'Unknown',
                    'email': instructor.email if instructor and hasattr(instructor, 'email') else ''
                }
            }
            response_data.append(course_data)
        
        return jsonify({'courses': response_data}), 200
        
    elif request.method == 'POST':
        # Use course service for creation
        from api.courses import create_course
        return create_course()

@api_v1.route('/courses/<course_id>', methods=['GET'])
@require_auth
def course_details(course_id):
    """Get course details"""
    from api.courses import get_course
    return get_course(course_id)

@api_v1.route('/courses/<course_id>/modules', methods=['GET', 'POST'])
@require_auth
def course_modules(course_id):
    """Get or create course modules"""
    if request.method == 'GET':
        from api.courses import get_course_modules
        return get_course_modules(course_id)
    else:  # POST
        from api.courses import create_module
        return create_module(course_id)

@api_v1.route('/courses/<course_id>/moduleswithfiles', methods=['GET'])
@require_auth
def course_modules_with_files(course_id):
    """Get course modules with files included"""
    user_id = g.current_user.id
    
    # Check access
    course_service = CourseService()
    if not course_service.check_course_access(course_id, user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    module_repo = ModuleRepository()
    file_repo = FileRepository()
    modules = module_repo.get_by_course(course_id)
    
    modules_with_files = []
    for module in modules:
        files = file_repo.get_by_module(module.id)
        file_list = []
        
        for file in files:
            # Check if user has personalized version
            personalized = db.session.query(PersonalizedFile).filter(
                PersonalizedFile.user_id == user_id,
                PersonalizedFile.original_file_id == file.id
            ).first()
            
            file_data = {
                'id': str(file.id),
                'title': file.title,
                'filename': file.filename,
                'file_type': file.file_type,
                'file_size': file.file_size,
                'created_at': file.created_at.isoformat() if file.created_at else None,
                's3_key': file.s3_key if hasattr(file, 's3_key') else None,
                'has_personalized': personalized is not None,
                'personalized_id': str(personalized.id) if personalized else None
            }
            file_list.append(file_data)
        
        modules_with_files.append({
            'id': str(module.id),
            'title': module.title,
            'description': getattr(module, 'description', ''),
            'course_id': str(module.course_id),
            'ordering': module.ordering,
            'files': file_list
        })
    
    return jsonify(modules_with_files), 200

@api_v1.route('/courses/<course_id>/files', methods=['GET'])
@require_auth
def course_files(course_id):
    """Get all files in a course"""
    from api.files import list_course_files
    return list_course_files(course_id)

@api_v1.route('/courses/<course_id>/stats', methods=['GET'])
@require_auth
def course_stats(course_id):
    """Get course statistics"""
    user_id = g.current_user.id
    
    # Check access
    course_service = CourseService()
    if not course_service.check_course_access(course_id, user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    user_repo = UserRepository()
    user = user_repo.get_with_profile(user_id)
    if not user or not user.role:
        return jsonify({'error': 'User not found'}), 404
    role = user.role
    
    module_repo = ModuleRepository()
    file_repo = FileRepository()
    
    modules = module_repo.get_by_course(course_id)
    total_files = sum(len(file_repo.get_by_module(m.id)) for m in modules)
    
    if role.role_type == 'student':
        # Student-specific stats
        viewed_files = 0
        for module in modules:
            files = file_repo.get_by_module(module.id)
            for file in files:
                if hasattr(file, 'view_count_raw') and file.view_count_raw > 0:
                    viewed_files += 1
        
        progress_percentage = round((viewed_files / total_files) * 100) if total_files > 0 else 0
        
        enrollment = db.session.query(Enrollment).filter(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id
        ).first()
        
        return jsonify({
            'total_modules': len(modules),
            'total_files': total_files,
            'viewed_files': viewed_files,
            'progress_percentage': progress_percentage,
            'enrollment_date': enrollment.created_at.isoformat() if enrollment and enrollment.created_at else None
        }), 200
        
    else:
        # Instructor stats
        enrollments = db.session.query(Enrollment).filter(Enrollment.course_id == course_id).all()
        course_repo = CourseRepository()
        course = course_repo.get_by_id(course_id)
        
        return jsonify({
            'total_students': len(enrollments),
            'total_modules': len(modules),
            'total_files': total_files,
            'created_at': course.created_at.isoformat() if course.created_at else None,
            'last_updated': course.last_updated.isoformat() if course.last_updated else None
        }), 200

@api_v1.route('/courses/<course_id>/progress', methods=['GET'])
@require_auth
def course_progress(course_id):
    """Get student's course progress"""
    user_id = g.current_user.id
    
    # Check access
    course_service = CourseService()
    if not course_service.check_course_access(course_id, user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    module_repo = ModuleRepository()
    file_repo = FileRepository()
    
    modules = module_repo.get_by_course(course_id)
    total_files = 0
    viewed_files = 0
    
    for module in modules:
        files = file_repo.get_by_module(module.id)
        total_files += len(files)
        
        for file in files:
            pf = db.session.query(PersonalizedFile).filter(
                PersonalizedFile.user_id == user_id,
                PersonalizedFile.original_file_id == file.id
            ).first()
            if pf:
                viewed_files += 1
    
    progress_percentage = round((viewed_files / total_files) * 100) if total_files > 0 else 0
    
    # Get personalized files count
    personalized_files = db.session.query(PersonalizedFile).join(File).join(Module).filter(
        Module.course_id == course_id,
        PersonalizedFile.user_id == user_id
    ).count()
    
    # Estimate study time
    study_time_minutes = personalized_files * 30
    
    # Get today's activity
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_files = db.session.query(PersonalizedFile).join(File).join(Module).filter(
        Module.course_id == course_id,
        PersonalizedFile.user_id == user_id,
        PersonalizedFile.created_at >= today_start
    ).count()
    
    today_time_minutes = today_files * 30
    
    return jsonify({
        'totalMaterials': total_files,
        'viewedMaterials': viewed_files,
        'personalizedMaterials': personalized_files,
        'progressPercentage': progress_percentage,
        'todayTimeMinutes': min(today_time_minutes, 120),
        'weeklyTimeMinutes': min(study_time_minutes, 600),
        'aiInteractions': personalized_files
    }), 200

@api_v1.route('/courses/<course_id>/discussions', methods=['GET', 'POST'])
@require_auth
def course_discussions(course_id):
    """Get or create course discussions"""
    user_id = g.current_user.id
    
    # Check access
    course_service = CourseService()
    if not course_service.check_course_access(course_id, user_id):
        return jsonify({'error': 'Access denied'}), 403
    
    if request.method == 'GET':
        # Mock discussions for now
        discussions = [{
            'id': '1',
            'title': 'Welcome to the course!',
            'content': 'Feel free to introduce yourself and ask any questions.',
            'author': {
                'id': 'system',
                'name': 'Instructor',
                'role': 'instructor'
            },
            'created_at': datetime.now().isoformat(),
            'replies_count': 0,
            'last_activity': datetime.now().isoformat()
        }]
        return jsonify(discussions), 200
        
    elif request.method == 'POST':
        data = request.get_json() or {}
        title = data.get('title')
        content = data.get('content')
        
        if not title or not content:
            return jsonify({'error': 'Title and content are required'}), 400
        
        user_repo = UserRepository()
        user = user_repo.get_with_profile(user_id)
        if not user or not user.role:
            return jsonify({'error': 'User not found'}), 404
        role = user.role
        
        new_discussion = {
            'id': str(uuid.uuid4()),
            'title': title,
            'content': content,
            'author': {
                'id': str(user_id),
                'name': user.display_name if hasattr(user, 'display_name') else user.email,
                'role': role.role_type
            },
            'created_at': datetime.now().isoformat(),
            'replies_count': 0,
            'last_activity': datetime.now().isoformat()
        }
        
        return jsonify(new_discussion), 201

# ===== TODO ENDPOINTS =====
@api_v1.route('/todo-items', methods=['GET', 'POST'])
@require_auth
def todo_items():
    """List or create todo items"""
    from api.todos import list_todos, create_todo
    
    if request.method == 'GET':
        return list_todos()
    elif request.method == 'POST':
        return create_todo()

@api_v1.route('/todo-items/<todo_id>', methods=['GET', 'PATCH', 'DELETE'])
@require_auth
def todo_item(todo_id):
    """Get, update, or delete a todo item"""
    from api.todos import get_todo, update_todo, delete_todo
    
    if request.method == 'GET':
        return get_todo(todo_id)
    elif request.method == 'PATCH':
        return update_todo(todo_id)
    elif request.method == 'DELETE':
        return delete_todo(todo_id)

# ===== ACTIVITIES ENDPOINTS =====
@api_v1.route('/activities/recent', methods=['GET'])
@require_auth
def activities_recent():
    """Get recent activities"""
    from api.activities import get_recent_activities
    return get_recent_activities()

@api_v1.route('/activities/stats', methods=['GET'])
@require_auth
def activities_stats():
    """Get activity statistics"""
    from api.activities import get_activity_stats
    return get_activity_stats()

@api_v1.route('/activities/log', methods=['POST'])
@require_auth
def activities_log():
    """Log an activity"""
    from api.activities import log_activity
    return log_activity()

# ===== FILE ENDPOINTS =====
@api_v1.route('/files/upload', methods=['POST'])
@require_auth
def upload_file():
    """Upload a file to a module"""
    from api.files import upload_file
    return upload_file()

@api_v1.route('/files/<file_id>', methods=['GET', 'PATCH', 'DELETE'])
@require_auth
def file_details(file_id):
    """Get, update, or delete file"""
    if request.method == 'GET':
        from api.files import get_file
        return get_file(file_id)
    elif request.method == 'PATCH':
        from api.files import update_file_endpoint
        return update_file_endpoint(file_id)
    else:  # DELETE
        from api.files import delete_file_endpoint
        return delete_file_endpoint(file_id)

@api_v1.route('/files/<file_id>/content', methods=['GET'])
@require_auth
def file_content(file_id):
    """Get file content or presigned URL"""
    from api.files import get_file_content
    return get_file_content(file_id)

@api_v1.route('/files/module/<module_id>', methods=['GET'])
@require_auth
def module_files(module_id):
    """Get all files in a module"""
    from api.files import get_module_files
    return get_module_files(module_id)

# ===== MODULE ENDPOINTS =====
@api_v1.route('/modules/<module_id>', methods=['GET', 'PATCH', 'DELETE'])
@require_auth
def module_details(module_id):
    """Get, update, or delete module"""
    if request.method == 'GET':
        from api.modules import get_module
        return get_module(module_id)
    elif request.method == 'PATCH':
        from api.modules import update_module_endpoint
        return update_module_endpoint(module_id)
    else:  # DELETE
        from api.modules import delete_module_endpoint
        return delete_module_endpoint(module_id)

@api_v1.route('/modules/<module_id>/files', methods=['GET'])
@require_auth
def module_files_list(module_id):
    """Get all files in a module"""
    from api.modules import get_module_files
    return get_module_files(module_id)

# ===== ENROLLMENT ENDPOINTS =====
@api_v1.route('/enrollments', methods=['GET'])
@require_auth
def enrollments():
    """Get user enrollments"""
    user_id = g.current_user.id
    
    user_repo = UserRepository()
    user = user_repo.get_with_profile(user_id)
    if not user or not user.role:
        return jsonify({'error': 'User not found'}), 404
    role = user.role
    
    if role.role_type != 'student':
        return jsonify({'error': 'Only students have enrollments'}), 403
    
    enrollments = db.session.query(Enrollment).filter(Enrollment.user_id == user_id).all()
    
    return jsonify([{
        'id': str(e.id),
        'course_id': str(e.course_id),
        'user_id': str(e.user_id),
        'created_at': e.created_at.isoformat() if e.created_at else None
    } for e in enrollments]), 200

# ===== PERSONALIZATION ENDPOINTS =====
@api_v1.route('/personalize/check/<file_id>', methods=['GET'])
@require_auth
def check_personalized(file_id):
    """Check if personalized version exists"""
    # Deprecated - redirect to v2
    return jsonify({
        'error': 'This endpoint is deprecated. Please use /api/v2/personalization/status/{file_id}',
        '_deprecation_warning': {
            'message': 'Personalization v1 endpoints are deprecated',
            'use_instead': '/api/v2/personalization/status/{file_id}'
        }
    }), 410

@api_v1.route('/personalize/outline/<file_id>', methods=['GET'])
@require_auth
def personalize_outline(file_id):
    """Get personalized outline"""
    # Deprecated - redirect to v2
    return jsonify({
        'error': 'This endpoint is deprecated. Please use POST /api/v2/personalization/outline',
        '_deprecation_warning': {
            'message': 'Personalization v1 endpoints are deprecated',
            'use_instead': 'POST /api/v2/personalization/outline'
        }
    }), 410

@api_v1.route('/personalize/save/<file_id>', methods=['POST'])
@require_auth
def personalize_save(file_id):
    """Save personalized content"""
    # Deprecated - redirect to v2
    return jsonify({
        'error': 'This endpoint is deprecated. Please use POST /api/v2/personalization/save',
        '_deprecation_warning': {
            'message': 'Personalization v1 endpoints are deprecated',
            'use_instead': 'POST /api/v2/personalization/save'
        }
    }), 410

@api_v1.route('/personalize/stream/<file_id>', methods=['GET'])
@require_auth
def personalize_stream(file_id):
    """Stream personalized content"""
    # Deprecated - redirect to v2
    return jsonify({
        'error': 'This endpoint is deprecated. Please use GET /api/v2/personalization/stream',
        '_deprecation_warning': {
            'message': 'Personalization v1 endpoints are deprecated',
            'use_instead': 'GET /api/v2/personalization/stream?file_id=' + file_id
        }
    }), 410
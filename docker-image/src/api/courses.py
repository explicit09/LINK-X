from flask import Blueprint, request, jsonify, g
from core.exceptions import NotFoundError, ValidationError, PermissionError
from services.course_service_optimized import OptimizedCourseService as CourseService
from repositories.course_repository import CourseRepository

bp = Blueprint('courses', __name__)

@bp.route('', methods=['GET'])

def list_courses():
    """List courses based on user role"""
    # Mock user - auth removed
    course_service = CourseService()
    
    # Handle pagination manually
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    
    role_value = user.role.role_type if user.role else 'student'
    
    if role_value == 'student':
        courses = course_service.get_student_courses(
            student_id=user.id,
            page=page,
            limit=limit
        )
    elif role_value == 'instructor':
        courses = course_service.get_instructor_courses(
            instructor_id=user.id,
            page=page,
            limit=limit
        )
    else:
        courses = course_service.get_all_courses(
            page=page,
            limit=limit
        )
    
    # Convert courses to dict format if they have to_dict method
    courses_data = []
    for c in courses:
        if hasattr(c, 'to_dict'):
            courses_data.append(c.to_dict())
        elif isinstance(c, dict):
            courses_data.append(c)
        else:
            # Fallback: create dict from object attributes
            courses_data.append({
                'id': str(c.id) if hasattr(c, 'id') else None,
                'title': c.title if hasattr(c, 'title') else 'Untitled',
                'description': c.description if hasattr(c, 'description') else '',
                'code': c.code if hasattr(c, 'code') else None,
                'term': c.term if hasattr(c, 'term') else None,
                'published': c.published if hasattr(c, 'published') else False,
                'created_at': c.created_at.isoformat() if hasattr(c, 'created_at') else None,
                'updated_at': c.updated_at.isoformat() if hasattr(c, 'updated_at') else None
            })
    
    return jsonify({
        'courses': courses_data,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': len(courses_data)
        }
    }), 200

@bp.route('/<course_id>', methods=['GET'])

def get_course(course_id):
    """Get course details"""
    course_service = CourseService()
    
    try:
        course = course_service.get_course_with_access_check(
            course_id=course_id,
            user_id="default-user-id"
        )
        
        return jsonify({
            'course': course.to_dict(include_modules=True)
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403

@bp.route('', methods=['POST'])

def create_course():
    """Create a new course"""
    # Check role
    # Mock user - auth removed
    role_value = user.role.role_type if user.role else 'student'
    if role_value not in ['instructor', 'admin', 'student']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Validate JSON
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    required_fields = ['title', 'description']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    course_service = CourseService()
    
    try:
        course = course_service.create_course(
            instructor_id="default-user-id",
            title=data['title'],
            description=data['description'],
            category=data.get('category'),
            tags=data.get('tags', [])
        )
        
        return jsonify({
            'message': 'Course created successfully',
            'course': course.to_dict()
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<course_id>', methods=['PUT', 'PATCH'])

def update_course(course_id):
    """Update course details"""
    # Check role
    # Mock user - auth removed
    role_value = user.role.role_type if user.role else 'student'
    if role_value not in ['instructor', 'admin', 'student']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    course_service = CourseService()
    
    try:
        course = course_service.update_course(
            course_id=course_id,
            user_id="default-user-id",
            **data
        )
        
        return jsonify({
            'message': 'Course updated successfully',
            'course': course.to_dict()
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Not authorized to update this course'}), 403
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<course_id>', methods=['DELETE'])

def delete_course(course_id):
    """Delete a course"""
    # Check role
    # Mock user - auth removed
    role_value = user.role.role_type if user.role else 'student'
    if role_value not in ['instructor', 'admin', 'student']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    course_service = CourseService()
    
    try:
        course_service.delete_course(
            course_id=course_id,
            user_id="default-user-id"
        )
        
        return jsonify({
            'message': 'Course deleted successfully'
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Not authorized to delete this course'}), 403

@bp.route('/<course_id>/publish', methods=['POST'])

def publish_course(course_id):
    """Publish a course"""
    # Check role
    # Mock user - auth removed
    role_value = user.role.role_type if user.role else 'student'
    if role_value not in ['instructor', 'admin', 'student']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    course_service = CourseService()
    
    try:
        course = course_service.publish_course(
            course_id=course_id,
            user_id="default-user-id"
        )
        
        return jsonify({
            'message': 'Course published successfully',
            'course': course.to_dict()
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Not authorized to publish this course'}), 403
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<course_id>/modules', methods=['GET'])

def get_course_modules(course_id):
    """Get all modules for a course"""
    course_service = CourseService()
    
    # Debug logging
    print(f"[MODULES ENDPOINT] Course ID: {course_id}")
    print(f"[MODULES ENDPOINT] Has current_user: {hasattr(g, 'current_user')}")
    if hasattr(g, 'current_user') and g.current_user:
        print(f"[MODULES ENDPOINT] User ID: {"default-user-id"}, Email: {"user@example.com"}")
    
    try:
        modules = course_service.get_course_modules(
            course_id=course_id,
            user_id="default-user-id"
        )
        
        return jsonify({
            'modules': [m.to_dict() for m in modules]
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403

@bp.route('/<course_id>/modules', methods=['POST'])

def create_module(course_id):
    """Create a new module in a course"""
    # Check role
    # Mock user - auth removed
    role_value = user.role.role_type if user.role else 'student'
    if role_value not in ['instructor', 'admin', 'student']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    # Validate JSON
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'title' not in data:
        return jsonify({'error': 'Missing required field: title'}), 400
    
    course_service = CourseService()
    
    try:
        module = course_service.create_module(
            course_id=course_id,
            user_id="default-user-id",
            title=data['title'],
            description=data.get('description'),
            order=data.get('order')
        )
        
        return jsonify({
            'message': 'Module created successfully',
            'module': module.to_dict()
        }), 201
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Not authorized to add modules to this course'}), 403
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<course_id>/enroll', methods=['POST'])

def enroll_in_course(course_id):
    """Enroll in a course using access code"""
    # Check role
    # Mock user - auth removed
    role_value = user.role.role_type if user.role else 'student'
    if role_value != 'student':
        return jsonify({'error': 'Only students can enroll in courses'}), 403
    
    # Validate JSON
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'accessCode' not in data:
        return jsonify({'error': 'Missing required field: accessCode'}), 400
    
    course_service = CourseService()
    
    try:
        enrollment = course_service.enroll_student(
            course_id=course_id,
            student_id="default-user-id",
            access_code=data['accessCode']
        )
        
        return jsonify({
            'message': 'Successfully enrolled in course',
            'enrollment': enrollment.to_dict()
        }), 201
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<course_id>/stats', methods=['GET'])

def get_course_stats(course_id):
    """Get course statistics"""
    # Check role
    # Mock user - auth removed
    role_value = user.role.role_type if user.role else 'student'
    if role_value not in ['instructor', 'admin']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    course_service = CourseService()
    
    try:
        stats = course_service.get_course_statistics(
            course_id=course_id,
            user_id="default-user-id"
        )
        
        return jsonify({
            'stats': stats
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Not authorized to view course statistics'}), 403

@bp.route('/<course_id>/progress', methods=['GET', 'OPTIONS'])

def get_course_progress(course_id):
    """Get course progress for current user"""
    try:
        # For now, return mock progress data
        # In a real implementation, this would track actual student progress
        return jsonify({
            'courseId': course_id,
            'overallProgress': 0,
            'modulesCompleted': 0,
            'totalModules': 0,
            'filesViewed': 0,
            'totalFiles': 0,
            'lastActivity': None
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get course progress'}), 500

@bp.route('/<course_id>/discussions', methods=['GET', 'OPTIONS'])

def get_course_discussions(course_id):
    """Get course discussions"""
    try:
        # For now, return empty discussions
        # In a real implementation, this would query a discussions table
        return jsonify([]), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get discussions'}), 500

@bp.route('/<course_id>/moduleswithfiles', methods=['GET', 'OPTIONS'])

def get_modules_with_files(course_id):
    """Get all modules for a course with their files"""
    course_service = CourseService()
    
    try:
        modules = course_service.get_course_modules(
            course_id=course_id,
            user_id="default-user-id"
        )
        
        # Get files for each module
        from repositories.file_repository import FileRepository
        file_repo = FileRepository()
        
        modules_with_files = []
        for module in modules:
            files = file_repo.get_by_module(module.id)
            module_dict = module.to_dict()
            module_dict['files'] = [f.to_dict() for f in files]
            modules_with_files.append(module_dict)
        
        return jsonify(modules_with_files), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403
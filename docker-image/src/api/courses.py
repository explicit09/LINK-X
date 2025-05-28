from flask import Blueprint, request, jsonify, g
from ..core.decorators import firebase_auth_required, require_role, validate_json, paginate
from ..core.exceptions import NotFoundError, ValidationError, AuthorizationError
from ..services.course_service import CourseService
from ..repositories.course_repository import CourseRepository

bp = Blueprint('courses', __name__)

@bp.route('', methods=['GET'])
@firebase_auth_required
@paginate()
def list_courses():
    """List courses based on user role"""
    user = g.current_user
    course_service = CourseService()
    
    role_value = user.role.role_type if user.role else 'student'
    
    if role_value == 'student':
        courses = course_service.get_student_courses(
            student_id=user.id,
            page=g.pagination['page'],
            limit=g.pagination['limit']
        )
    elif role_value == 'instructor':
        courses = course_service.get_instructor_courses(
            instructor_id=user.id,
            page=g.pagination['page'],
            limit=g.pagination['limit']
        )
    else:
        courses = course_service.get_all_courses(
            page=g.pagination['page'],
            limit=g.pagination['limit']
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
        'pagination': g.pagination
    }), 200

@bp.route('/<course_id>', methods=['GET'])
@firebase_auth_required
def get_course(course_id):
    """Get course details"""
    course_service = CourseService()
    
    try:
        course = course_service.get_course_with_access_check(
            course_id=course_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'course': course.to_dict(include_modules=True)
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Access denied'}), 403

@bp.route('', methods=['POST'])
@require_role(['instructor', 'admin'])
@validate_json(['title', 'description'])
def create_course():
    """Create a new course"""
    data = request.get_json()
    course_service = CourseService()
    
    try:
        course = course_service.create_course(
            instructor_id=g.current_user.id,
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
@require_role(['instructor', 'admin'])
@validate_json([])
def update_course(course_id):
    """Update course details"""
    data = request.get_json()
    course_service = CourseService()
    
    try:
        course = course_service.update_course(
            course_id=course_id,
            user_id=g.current_user.id,
            **data
        )
        
        return jsonify({
            'message': 'Course updated successfully',
            'course': course.to_dict()
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Not authorized to update this course'}), 403
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<course_id>', methods=['DELETE'])
@require_role(['instructor', 'admin'])
def delete_course(course_id):
    """Delete a course"""
    course_service = CourseService()
    
    try:
        course_service.delete_course(
            course_id=course_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'message': 'Course deleted successfully'
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Not authorized to delete this course'}), 403

@bp.route('/<course_id>/publish', methods=['POST'])
@require_role(['instructor', 'admin'])
def publish_course(course_id):
    """Publish a course"""
    course_service = CourseService()
    
    try:
        course = course_service.publish_course(
            course_id=course_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'message': 'Course published successfully',
            'course': course.to_dict()
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Not authorized to publish this course'}), 403
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<course_id>/modules', methods=['GET'])
@firebase_auth_required
def get_course_modules(course_id):
    """Get all modules for a course"""
    course_service = CourseService()
    
    # Debug logging
    print(f"[MODULES ENDPOINT] Course ID: {course_id}")
    print(f"[MODULES ENDPOINT] Has current_user: {hasattr(g, 'current_user')}")
    if hasattr(g, 'current_user') and g.current_user:
        print(f"[MODULES ENDPOINT] User ID: {g.current_user.id}, Email: {g.current_user.email}")
    
    try:
        modules = course_service.get_course_modules(
            course_id=course_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'modules': [m.to_dict() for m in modules]
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Access denied'}), 403

@bp.route('/<course_id>/modules', methods=['POST'])
@require_role(['instructor', 'admin'])
@validate_json(['title'])
def create_module(course_id):
    """Create a new module in a course"""
    data = request.get_json()
    course_service = CourseService()
    
    try:
        module = course_service.create_module(
            course_id=course_id,
            user_id=g.current_user.id,
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
    except AuthorizationError:
        return jsonify({'error': 'Not authorized to add modules to this course'}), 403
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<course_id>/enroll', methods=['POST'])
@require_role('student')
@validate_json(['accessCode'])
def enroll_in_course(course_id):
    """Enroll in a course using access code"""
    data = request.get_json()
    course_service = CourseService()
    
    try:
        enrollment = course_service.enroll_student(
            course_id=course_id,
            student_id=g.current_user.id,
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
@require_role(['instructor', 'admin'])
def get_course_stats(course_id):
    """Get course statistics"""
    course_service = CourseService()
    
    try:
        stats = course_service.get_course_statistics(
            course_id=course_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'stats': stats
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404
    except AuthorizationError:
        return jsonify({'error': 'Not authorized to view course statistics'}), 403

@bp.route('/<course_id>/progress', methods=['GET', 'OPTIONS'])
@firebase_auth_required
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
@firebase_auth_required
def get_course_discussions(course_id):
    """Get course discussions"""
    try:
        # For now, return empty discussions
        # In a real implementation, this would query a discussions table
        return jsonify([]), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get discussions'}), 500

@bp.route('/<course_id>/moduleswithfiles', methods=['GET', 'OPTIONS'])
@firebase_auth_required
def get_modules_with_files(course_id):
    """Get all modules for a course with their files"""
    course_service = CourseService()
    
    try:
        modules = course_service.get_course_modules(
            course_id=course_id,
            user_id=g.current_user.id
        )
        
        # Get files for each module
        from ..repositories.file_repository import FileRepository
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
    except AuthorizationError:
        return jsonify({'error': 'Access denied'}), 403
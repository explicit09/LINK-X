from flask import Blueprint, request, jsonify
from core.decorators import firebase_auth_required
from core.exceptions import NotFoundError, ValidationError
from services.admin_service import AdminService

bp = Blueprint('admin', __name__)

@bp.route('/users', methods=['GET'])
@firebase_auth_required
def list_users():
    """List all users"""
    admin_service = AdminService()
    
    # Get pagination from query params
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    
    users = admin_service.get_users(
        page=page,
        limit=limit,
        role_filter=request.args.get('role'),
        search=request.args.get('search')
    )
    
    return jsonify({
        'users': [u.to_dict() for u in users],
        'pagination': {'page': page, 'limit': limit}
    }), 200

@bp.route('/users/<user_id>', methods=['GET'])
@firebase_auth_required
def get_user(user_id):
    """Get user details"""
    admin_service = AdminService()
    
    try:
        user = admin_service.get_user_details(user_id)
        return jsonify({
            'user': user.to_dict(include_profile=True)
        }), 200
    except NotFoundError:
        return jsonify({'error': 'User not found'}), 404

@bp.route('/users/<user_id>', methods=['PUT'])
@firebase_auth_required
def update_user(user_id):
    """Update user details"""
    data = request.get_json()
    admin_service = AdminService()
    
    try:
        user = admin_service.update_user(user_id, **data)
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
    except NotFoundError:
        return jsonify({'error': 'User not found'}), 404
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/users/<user_id>/suspend', methods=['POST'])
@firebase_auth_required
def suspend_user(user_id):
    """Suspend a user account"""
    admin_service = AdminService()
    
    try:
        admin_service.suspend_user(user_id)
        return jsonify({
            'message': 'User suspended successfully'
        }), 200
    except NotFoundError:
        return jsonify({'error': 'User not found'}), 404

@bp.route('/users/<user_id>/activate', methods=['POST'])
@firebase_auth_required
def activate_user(user_id):
    """Activate a suspended user account"""
    admin_service = AdminService()
    
    try:
        admin_service.activate_user(user_id)
        return jsonify({
            'message': 'User activated successfully'
        }), 200
    except NotFoundError:
        return jsonify({'error': 'User not found'}), 404

@bp.route('/courses', methods=['GET'])
@firebase_auth_required
def list_all_courses():
    """List all courses in the system"""
    admin_service = AdminService()
    
    # Get pagination from query params
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    
    courses = admin_service.get_all_courses(
        page=page,
        limit=limit,
        status=request.args.get('status'),
        instructor_id=request.args.get('instructorId')
    )
    
    return jsonify({
        'courses': [c.to_dict() for c in courses],
        'pagination': {'page': page, 'limit': limit}
    }), 200

@bp.route('/courses/<course_id>/approve', methods=['POST'])
@firebase_auth_required
def approve_course(course_id):
    """Approve a course for publishing"""
    admin_service = AdminService()
    
    try:
        course = admin_service.approve_course(course_id)
        return jsonify({
            'message': 'Course approved successfully',
            'course': course.to_dict()
        }), 200
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404

@bp.route('/courses/<course_id>/reject', methods=['POST'])
@firebase_auth_required
def reject_course(course_id):
    """Reject a course"""
    data = request.get_json()
    admin_service = AdminService()
    
    try:
        admin_service.reject_course(course_id, data['reason'])
        return jsonify({
            'message': 'Course rejected'
        }), 200
    except NotFoundError:
        return jsonify({'error': 'Course not found'}), 404

@bp.route('/stats', methods=['GET'])
@firebase_auth_required
def get_platform_stats():
    """Get platform-wide statistics"""
    admin_service = AdminService()
    
    stats = admin_service.get_platform_statistics()
    return jsonify({
        'stats': stats
    }), 200

@bp.route('/reports', methods=['GET'])
@firebase_auth_required
def get_reports():
    """Get system reports"""
    report_type = request.args.get('type', 'usage')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    admin_service = AdminService()
    
    try:
        report = admin_service.generate_report(
            report_type=report_type,
            start_date=start_date,
            end_date=end_date
        )
        return jsonify({
            'report': report
        }), 200
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/settings', methods=['GET'])
@firebase_auth_required
def get_system_settings():
    """Get system settings"""
    admin_service = AdminService()
    
    settings = admin_service.get_system_settings()
    return jsonify({
        'settings': settings
    }), 200

@bp.route('/settings', methods=['PUT'])
@firebase_auth_required
def update_system_settings():
    """Update system settings"""
    data = request.get_json()
    admin_service = AdminService()
    
    try:
        settings = admin_service.update_system_settings(data)
        return jsonify({
            'message': 'Settings updated successfully',
            'settings': settings
        }), 200
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/maintenance/cleanup', methods=['POST'])
@firebase_auth_required
def run_cleanup():
    """Run system cleanup tasks"""
    admin_service = AdminService()
    
    result = admin_service.run_cleanup_tasks()
    return jsonify({
        'message': 'Cleanup completed',
        'result': result
    }), 200

@bp.route('/maintenance/reindex', methods=['POST'])
@firebase_auth_required
def reindex_content():
    """Trigger content reindexing"""
    admin_service = AdminService()
    
    admin_service.trigger_reindexing()
    return jsonify({
        'message': 'Reindexing started'
    }), 202
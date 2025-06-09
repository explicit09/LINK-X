from flask import Blueprint, request, jsonify
from core.decorators_unified import auth_required
from core.exceptions import NotFoundError, ValidationError
from services.admin_service import AdminService

bp = Blueprint('admin', __name__)

@bp.route('/users', methods=['GET'])
@auth_required()
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
@auth_required()
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
@auth_required()
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
@auth_required()
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
@auth_required()
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
@auth_required()
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
@auth_required()
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
@auth_required()
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
@auth_required()
def get_platform_stats():
    """Get platform-wide statistics"""
    admin_service = AdminService()
    
    stats = admin_service.get_platform_statistics()
    return jsonify({
        'stats': stats
    }), 200

@bp.route('/reports', methods=['GET'])
@auth_required()
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
@auth_required()
def get_system_settings():
    """Get system settings"""
    admin_service = AdminService()
    
    settings = admin_service.get_system_settings()
    return jsonify({
        'settings': settings
    }), 200

@bp.route('/settings', methods=['PUT'])
@auth_required()
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
@auth_required()
def run_cleanup():
    """Run system cleanup tasks"""
    admin_service = AdminService()
    
    result = admin_service.run_cleanup_tasks()
    return jsonify({
        'message': 'Cleanup completed',
        'result': result
    }), 200

@bp.route('/maintenance/reindex', methods=['POST'])
@auth_required()
def reindex_content():
    """Trigger content reindexing"""
    admin_service = AdminService()
    
    admin_service.trigger_reindexing()
    return jsonify({
        'message': 'Reindexing started'
    }), 202

@bp.route('/maintenance/reconcile-file-status', methods=['POST'])
def reconcile_file_status():
    """Reconcile file processing statuses - fix files with chunks but wrong status"""
    admin_service = AdminService()
    
    try:
        result = admin_service.reconcile_file_statuses()
        return jsonify({
            'message': 'File status reconciliation completed',
            'files_fixed': result['files_fixed'],
            'details': result['details']
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/maintenance/migrate-files-schema', methods=['POST'])
def migrate_files_schema():
    """Add missing columns to files table"""
    from core.database_supabase import db_manager
    
    try:
        with db_manager.get_session() as session:
            # Check if columns already exist
            result = session.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'files' 
                AND column_name IN ('description', 'processing_status', 'processed')
            """).fetchall()
            
            existing_columns = [row.column_name for row in result]
            
            migrations = []
            
            # Add description column if missing
            if 'description' not in existing_columns:
                session.execute("ALTER TABLE files ADD COLUMN description TEXT")
                migrations.append("Added 'description' column")
            
            # Add processing_status column if missing
            if 'processing_status' not in existing_columns:
                session.execute("ALTER TABLE files ADD COLUMN processing_status VARCHAR(20) DEFAULT 'pending' NOT NULL")
                migrations.append("Added 'processing_status' column")
            
            # Add processed column if missing
            if 'processed' not in existing_columns:
                session.execute("ALTER TABLE files ADD COLUMN processed BOOLEAN DEFAULT FALSE NOT NULL")
                migrations.append("Added 'processed' column")
            
            # Update existing files that have chunks to completed status
            if migrations:
                updated_files = session.execute("""
                    UPDATE files 
                    SET processing_status = 'completed', processed = true
                    WHERE id IN (
                        SELECT DISTINCT file_id 
                        FROM file_chunks 
                        GROUP BY file_id 
                        HAVING COUNT(*) > 0
                    )
                    AND processing_status != 'completed'
                    RETURNING id, filename
                """).fetchall()
                
                if updated_files:
                    migrations.append(f"Updated {len(updated_files)} files with chunks to 'completed' status")
            
            session.commit()
            
            return jsonify({
                'message': 'Schema migration completed successfully',
                'migrations_applied': migrations
            }), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Debug endpoint removed for production


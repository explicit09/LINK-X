"""
API endpoints for background task management and monitoring.
Add these to your Flask app.
"""
from flask import Blueprint, jsonify, request
from src.task_monitor import TaskMonitor
from src.file_upload_handler import FileUploadHandler
from src.tasks import index_file, reindex_course
from src.db.queries import get_file_by_id
from sqlalchemy.orm import Session

# Create blueprint
background_api = Blueprint('background_api', __name__, url_prefix='/api/background')

def verify_admin():
    """Verify admin access - implement your auth logic here."""
    # This is a placeholder - implement your actual auth check
    return None  # Return None if authorized, error response if not

@background_api.route('/tasks/<task_id>/status', methods=['GET'])
def get_task_status(task_id):
    """Get status of a specific task."""
    monitor = TaskMonitor()
    try:
        status = monitor.get_task_status(task_id)
        return jsonify(status), 200
    finally:
        monitor.cleanup()

@background_api.route('/tasks/active', methods=['GET'])
def get_active_tasks():
    """Get all active tasks."""
    auth_error = verify_admin()
    if auth_error:
        return auth_error
    
    monitor = TaskMonitor()
    try:
        tasks = monitor.get_active_tasks()
        return jsonify({'tasks': tasks, 'count': len(tasks)}), 200
    finally:
        monitor.cleanup()

@background_api.route('/tasks/scheduled', methods=['GET'])
def get_scheduled_tasks():
    """Get all scheduled tasks."""
    auth_error = verify_admin()
    if auth_error:
        return auth_error
    
    monitor = TaskMonitor()
    try:
        tasks = monitor.get_scheduled_tasks()
        return jsonify({'tasks': tasks, 'count': len(tasks)}), 200
    finally:
        monitor.cleanup()

@background_api.route('/queues/stats', methods=['GET'])
def get_queue_stats():
    """Get queue statistics."""
    monitor = TaskMonitor()
    try:
        stats = monitor.get_queue_stats()
        return jsonify(stats), 200
    finally:
        monitor.cleanup()

@background_api.route('/workers/stats', methods=['GET'])
def get_worker_stats():
    """Get worker statistics."""
    auth_error = verify_admin()
    if auth_error:
        return auth_error
    
    monitor = TaskMonitor()
    try:
        stats = monitor.get_worker_stats()
        return jsonify({'workers': stats, 'count': len(stats)}), 200
    finally:
        monitor.cleanup()

@background_api.route('/indexing/stats', methods=['GET'])
def get_indexing_stats():
    """Get indexing statistics."""
    hours = request.args.get('hours', 24, type=int)
    
    monitor = TaskMonitor()
    try:
        stats = monitor.get_indexing_stats(hours)
        return jsonify(stats), 200
    finally:
        monitor.cleanup()

@background_api.route('/health', methods=['GET'])
def get_health_report():
    """Get system health report."""
    monitor = TaskMonitor()
    try:
        report = monitor.get_health_report()
        status_code = 200 if report['status'] == 'healthy' else 503
        return jsonify(report), status_code
    finally:
        monitor.cleanup()

@background_api.route('/tasks/<task_id>/cancel', methods=['POST'])
def cancel_task(task_id):
    """Cancel a specific task."""
    auth_error = verify_admin()
    if auth_error:
        return auth_error
    
    monitor = TaskMonitor()
    try:
        success = monitor.cancel_task(task_id)
        if success:
            return jsonify({'message': f'Task {task_id} cancelled'}), 200
        else:
            return jsonify({'error': 'Failed to cancel task'}), 500
    finally:
        monitor.cleanup()

@background_api.route('/tasks/retry-failed', methods=['POST'])
def retry_failed_tasks():
    """Retry failed indexing tasks."""
    auth_error = verify_admin()
    if auth_error:
        return auth_error
    
    hours = request.json.get('hours', 1) if request.json else 1
    
    monitor = TaskMonitor()
    try:
        result = monitor.retry_failed_tasks(hours)
        return jsonify(result), 200
    finally:
        monitor.cleanup()

@background_api.route('/files/<file_id>/reindex', methods=['POST'])
def reindex_file(file_id):
    """Manually trigger file reindexing."""
    # Check if file exists
    from src.db.queries import get_file_by_id
    from src.db.schema import Session as DBSession
    
    db = DBSession()
    try:
        file = get_file_by_id(db, file_id)
        if not file:
            return jsonify({'error': 'File not found'}), 404
        
        # Trigger reindexing
        task = index_file.apply_async(
            args=[file_id],
            kwargs={'force_reindex': True},
            queue='high'
        )
        
        return jsonify({
            'message': 'Reindexing triggered',
            'task_id': task.id,
            'file_id': file_id
        }), 202
    finally:
        db.close()

@background_api.route('/courses/<course_id>/reindex', methods=['POST'])
def reindex_course_endpoint(course_id):
    """Manually trigger course reindexing."""
    auth_error = verify_admin()
    if auth_error:
        return auth_error
    
    # Trigger reindexing
    task = reindex_course.apply_async(
        args=[course_id],
        queue='default'
    )
    
    return jsonify({
        'message': 'Course reindexing triggered',
        'task_id': task.id,
        'course_id': course_id
    }), 202

@background_api.route('/files/<file_id>/indexing-status', methods=['GET'])
def check_file_indexing_status(file_id):
    """Check indexing status of a file."""
    from src.db.schema import Session as DBSession
    
    db = DBSession()
    try:
        handler = FileUploadHandler(db)
        status = handler.check_indexing_status(file_id)
        return jsonify(status), 200
    finally:
        db.close()

# Integration function to add to your main app.py
def register_background_endpoints(app):
    """Register background processing endpoints with Flask app."""
    app.register_blueprint(background_api)
    
    # Add custom error handlers
    @background_api.errorhandler(Exception)
    def handle_error(e):
        return jsonify({'error': str(e)}), 500
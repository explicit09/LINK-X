"""
Tracking functions for recording metrics and events
"""
from .metrics_definitions import (
    db_connection_pool, streaming_connections, user_actions_total,
    user_sessions_active, user_login_attempts, course_enrollments_total,
    course_completion_rate, module_progress_total, learning_time_total,
    file_uploads_total, file_processing_queue_size, file_processing_errors,
    chunk_creation_total, search_queries_total, security_events_total,
    failed_auth_attempts, suspicious_activity_total, memory_usage_bytes,
    cpu_usage_percent
)

def update_connection_pool_metrics(pool_size: int, active: int, idle: int):
    """Update database connection pool metrics"""
    db_connection_pool.labels(state='total').set(pool_size)
    db_connection_pool.labels(state='active').set(active)
    db_connection_pool.labels(state='idle').set(idle)

def track_streaming_connection(increment: bool = True):
    """Track streaming connections"""
    if increment:
        streaming_connections.inc()
    else:
        streaming_connections.dec()

def track_user_action(user_id: str, action_type: str, resource_type: str):
    """Track user actions for analytics"""
    user_actions_total.labels(
        user_id=user_id,
        action_type=action_type,
        resource_type=resource_type
    ).inc()

def track_user_session(active: bool = True):
    """Track active user sessions"""
    if active:
        user_sessions_active.inc()
    else:
        user_sessions_active.dec()

def track_login_attempt(method: str, status: str):
    """Track login attempts"""
    user_login_attempts.labels(
        method=method,
        status=status
    ).inc()

def track_course_enrollment(course_id: str, user_type: str):
    """Track course enrollments"""
    course_enrollments_total.labels(
        course_id=course_id,
        user_type=user_type
    ).inc()

def update_course_completion_rate(course_id: str, completion_rate: float):
    """Update course completion rate"""
    course_completion_rate.labels(course_id=course_id).set(completion_rate)

def track_module_progress(course_id: str, module_id: str, progress_type: str):
    """Track module progress events"""
    module_progress_total.labels(
        course_id=course_id,
        module_id=module_id,
        progress_type=progress_type
    ).inc()

def track_learning_time(course_id: str, user_id: str, duration_seconds: float):
    """Track learning time"""
    learning_time_total.labels(
        course_id=course_id,
        user_id=user_id
    ).inc(duration_seconds)

def track_file_upload(file_type: str, status: str, user_type: str):
    """Track file uploads"""
    file_uploads_total.labels(
        file_type=file_type,
        status=status,
        user_type=user_type
    ).inc()

def update_file_processing_queue(queue_type: str, size: int):
    """Update file processing queue size"""
    file_processing_queue_size.labels(queue_type=queue_type).set(size)

def track_file_processing_error(error_type: str, file_type: str):
    """Track file processing errors"""
    file_processing_errors.labels(
        error_type=error_type,
        file_type=file_type
    ).inc()

def track_chunk_creation(file_type: str, course_id: str, count: int = 1):
    """Track chunk creation"""
    chunk_creation_total.labels(
        file_type=file_type,
        course_id=course_id
    ).inc(count)

def track_search_query(course_id: str, query_type: str, user_type: str):
    """Track search queries"""
    search_queries_total.labels(
        course_id=course_id,
        query_type=query_type,
        user_type=user_type
    ).inc()

def track_security_event(event_type: str, severity: str, source_ip: str):
    """Track security events"""
    security_events_total.labels(
        event_type=event_type,
        severity=severity,
        source_ip=source_ip
    ).inc()

def track_failed_auth(auth_method: str, failure_reason: str):
    """Track failed authentication attempts"""
    failed_auth_attempts.labels(
        auth_method=auth_method,
        failure_reason=failure_reason
    ).inc()

def track_suspicious_activity(activity_type: str, severity: str):
    """Track suspicious activity"""
    suspicious_activity_total.labels(
        activity_type=activity_type,
        severity=severity
    ).inc()

def update_system_metrics(component: str, memory_bytes: int, cpu_percent: float):
    """Update system resource metrics"""
    memory_usage_bytes.labels(component=component).set(memory_bytes)
    cpu_usage_percent.labels(component=component).set(cpu_percent)
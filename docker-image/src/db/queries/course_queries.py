"""
Course related database queries.
"""

import logging
from typing import Optional, Dict, Any, List
from uuid import UUID
from psycopg2.extensions import connection as Connection

from .base import to_uuid, execute_query, build_update_query, build_insert_query, validate_required_fields

logger = logging.getLogger(__name__)

# Course CRUD Operations

def get_course_by_id(conn: Connection, course_id: Any) -> Optional[Dict[str, Any]]:
    """Get course by ID."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None:
        return None
    
    query = "SELECT * FROM courses WHERE id = %s"
    return execute_query(conn, query, (course_uuid,), fetch_one=True)

def get_courses_by_instructor_id(conn: Connection, instructor_id: Any) -> List[Dict[str, Any]]:
    """Get all courses created by an instructor."""
    instructor_uuid = to_uuid(instructor_id)
    if instructor_uuid is None:
        return []
    
    query = """
        SELECT c.*, COUNT(e.id) as enrollment_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.instructor_id = %s
        GROUP BY c.id
        ORDER BY c.created_at DESC
    """
    return execute_query(conn, query, (instructor_uuid,), fetch_all=True)

def get_courses_by_student_id(conn: Connection, student_id: Any) -> List[Dict[str, Any]]:
    """Get all courses a student is enrolled in."""
    student_uuid = to_uuid(student_id)
    if student_uuid is None:
        return []
    
    query = """
        SELECT c.*, e.enrolled_at, u.name as instructor_name, u.email as instructor_email
        FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE e.student_id = %s
        ORDER BY e.enrolled_at DESC
    """
    return execute_query(conn, query, (student_uuid,), fetch_all=True)

def create_course(conn: Connection, course_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new course."""
    required_fields = ['title', 'instructor_id']
    validate_required_fields(course_data, required_fields)
    
    # Set default values
    course_data.setdefault('created_at', 'NOW()')
    course_data.setdefault('updated_at', 'NOW()')
    course_data.setdefault('published', False)
    
    try:
        query, params = build_insert_query('courses', course_data)
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error creating course: {e}")
        conn.rollback()
        raise

def update_course(conn: Connection, course_id: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing course."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None:
        return None
    
    if not updates:
        return get_course_by_id(conn, course_uuid)
    
    try:
        query, params = build_update_query(
            'courses', 
            updates, 
            'WHERE id = %s',
            (course_uuid,)
        )
        query += " RETURNING *"
        
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error updating course {course_uuid}: {e}")
        conn.rollback()
        raise

def delete_course(conn: Connection, course_id: Any) -> bool:
    """Delete a course and all related data."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None:
        return False
    
    try:
        # Delete in proper order to respect foreign key constraints
        queries = [
            "DELETE FROM enrollments WHERE course_id = %s",
            "DELETE FROM access_codes WHERE course_id = %s",
            "DELETE FROM modules WHERE course_id = %s",
            "DELETE FROM courses WHERE id = %s"
        ]
        
        cursor = conn.cursor()
        for query in queries:
            cursor.execute(query, (course_uuid,))
        
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error deleting course {course_uuid}: {e}")
        conn.rollback()
        raise

# Course Discovery and Search

def search_courses(conn: Connection, search_term: str, published_only: bool = True, limit: int = 50) -> List[Dict[str, Any]]:
    """Search courses by title, description, or code."""
    if not search_term:
        return []
    
    search_pattern = f"%{search_term}%"
    where_clause = "WHERE (c.title ILIKE %s OR c.description ILIKE %s OR c.code ILIKE %s)"
    params = [search_pattern, search_pattern, search_pattern]
    
    if published_only:
        where_clause += " AND c.published = %s"
        params.append(True)
    
    query = f"""
        SELECT c.*, u.name as instructor_name, u.email as instructor_email,
               COUNT(e.id) as enrollment_count
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        {where_clause}
        GROUP BY c.id, u.name, u.email
        ORDER BY c.created_at DESC
        LIMIT %s
    """
    params.append(limit)
    
    return execute_query(conn, query, tuple(params), fetch_all=True)

def list_public_courses(conn: Connection, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """List all published courses."""
    query = """
        SELECT c.*, u.name as instructor_name, u.email as instructor_email,
               COUNT(e.id) as enrollment_count
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.published = %s
        GROUP BY c.id, u.name, u.email
        ORDER BY c.created_at DESC
        LIMIT %s OFFSET %s
    """
    return execute_query(conn, query, (True, limit, offset), fetch_all=True)

def get_course_statistics(conn: Connection, course_id: Any) -> Optional[Dict[str, Any]]:
    """Get statistics for a course."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None:
        return None
    
    query = """
        SELECT 
            c.id,
            c.title,
            c.created_at,
            COUNT(DISTINCT e.id) as total_enrollments,
            COUNT(DISTINCT m.id) as total_modules,
            COUNT(DISTINCT f.id) as total_files,
            MAX(e.enrolled_at) as last_enrollment
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN modules m ON c.id = m.course_id
        LEFT JOIN files f ON m.id = f.module_id
        WHERE c.id = %s
        GROUP BY c.id, c.title, c.created_at
    """
    return execute_query(conn, query, (course_uuid,), fetch_one=True)

# Course Access and Permissions

def get_course_with_access_info(conn: Connection, course_id: Any, user_id: Any) -> Optional[Dict[str, Any]]:
    """Get course with user's access information."""
    course_uuid = to_uuid(course_id)
    user_uuid = to_uuid(user_id)
    if course_uuid is None or user_uuid is None:
        return None
    
    query = """
        SELECT c.*, 
               u.name as instructor_name,
               u.email as instructor_email,
               e.enrolled_at,
               CASE 
                   WHEN c.instructor_id = %s THEN 'instructor'
                   WHEN e.id IS NOT NULL THEN 'student'
                   ELSE 'none'
               END as access_level
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN enrollments e ON c.id = e.course_id AND e.student_id = %s
        WHERE c.id = %s
    """
    return execute_query(conn, query, (user_uuid, user_uuid, course_uuid), fetch_one=True)

def check_course_access(conn: Connection, course_id: Any, user_id: Any) -> str:
    """Check user's access level to a course. Returns: 'instructor', 'student', or 'none'."""
    course_uuid = to_uuid(course_id)
    user_uuid = to_uuid(user_id)
    if course_uuid is None or user_uuid is None:
        return 'none'
    
    query = """
        SELECT 
            CASE 
                WHEN c.instructor_id = %s THEN 'instructor'
                WHEN e.id IS NOT NULL THEN 'student'
                ELSE 'none'
            END as access_level
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id AND e.student_id = %s
        WHERE c.id = %s
    """
    result = execute_query(conn, query, (user_uuid, user_uuid, course_uuid), fetch_one=True)
    return result['access_level'] if result else 'none'

# Course Content Management

def get_course_content_summary(conn: Connection, course_id: Any) -> Optional[Dict[str, Any]]:
    """Get a summary of course content."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None:
        return None
    
    query = """
        SELECT 
            c.id as course_id,
            c.title as course_title,
            COUNT(DISTINCT m.id) as module_count,
            COUNT(DISTINCT f.id) as file_count,
            COALESCE(SUM(f.file_size), 0) as total_file_size,
            MAX(f.created_at) as last_file_upload
        FROM courses c
        LEFT JOIN modules m ON c.id = m.course_id
        LEFT JOIN files f ON m.id = f.module_id
        WHERE c.id = %s
        GROUP BY c.id, c.title
    """
    return execute_query(conn, query, (course_uuid,), fetch_one=True)

def toggle_course_published(conn: Connection, course_id: Any) -> Optional[Dict[str, Any]]:
    """Toggle the published status of a course."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None:
        return None
    
    try:
        query = """
            UPDATE courses 
            SET published = NOT published, updated_at = NOW()
            WHERE id = %s
            RETURNING *
        """
        cursor = conn.cursor()
        cursor.execute(query, (course_uuid,))
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error toggling course published status {course_uuid}: {e}")
        conn.rollback()
        raise
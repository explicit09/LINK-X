"""
Module related database queries.
"""

import logging
from typing import Optional, Dict, Any, List
from uuid import UUID
from psycopg2.extensions import connection as Connection

from .base import to_uuid, execute_query, build_update_query, build_insert_query, validate_required_fields

logger = logging.getLogger(__name__)

# Module CRUD Operations

def get_module_by_id(conn: Connection, module_id: Any) -> Optional[Dict[str, Any]]:
    """Get module by ID."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None:
        return None
    
    query = "SELECT * FROM modules WHERE id = %s"
    return execute_query(conn, query, (module_uuid,), fetch_one=True)

def get_modules_by_course(conn: Connection, course_id: Any) -> List[Dict[str, Any]]:
    """Get all modules for a course."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None:
        return []
    
    query = """
        SELECT m.*, COUNT(f.id) as file_count
        FROM modules m
        LEFT JOIN files f ON m.id = f.module_id
        WHERE m.course_id = %s
        GROUP BY m.id
        ORDER BY m.created_at ASC
    """
    return execute_query(conn, query, (course_uuid,), fetch_all=True)

def create_module(conn: Connection, module_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new module."""
    required_fields = ['title', 'course_id']
    validate_required_fields(module_data, required_fields)
    
    # Set default values
    module_data.setdefault('created_at', 'NOW()')
    module_data.setdefault('updated_at', 'NOW()')
    
    try:
        query, params = build_insert_query('modules', module_data)
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error creating module: {e}")
        conn.rollback()
        raise

def update_module(conn: Connection, module_id: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing module."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None:
        return None
    
    if not updates:
        return get_module_by_id(conn, module_uuid)
    
    try:
        query, params = build_update_query(
            'modules', 
            updates, 
            'WHERE id = %s',
            (module_uuid,)
        )
        query += " RETURNING *"
        
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error updating module {module_uuid}: {e}")
        conn.rollback()
        raise

def delete_module(conn: Connection, module_id: Any) -> bool:
    """Delete a module and all its files."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None:
        return False
    
    try:
        # Delete files first due to foreign key constraints
        cursor = conn.cursor()
        cursor.execute("DELETE FROM files WHERE module_id = %s", (module_uuid,))
        cursor.execute("DELETE FROM modules WHERE id = %s", (module_uuid,))
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error deleting module {module_uuid}: {e}")
        conn.rollback()
        raise

# Module Content and Statistics

def get_module_with_files(conn: Connection, module_id: Any) -> Optional[Dict[str, Any]]:
    """Get module with its files."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None:
        return None
    
    # Get module info
    module = get_module_by_id(conn, module_uuid)
    if not module:
        return None
    
    # Get files for this module
    query = """
        SELECT f.*, COUNT(fc.id) as chunk_count
        FROM files f
        LEFT JOIN file_chunks fc ON f.id = fc.file_id
        WHERE f.module_id = %s
        GROUP BY f.id
        ORDER BY f.created_at ASC
    """
    files = execute_query(conn, query, (module_uuid,), fetch_all=True)
    
    module['files'] = files or []
    return module

def get_module_statistics(conn: Connection, module_id: Any) -> Optional[Dict[str, Any]]:
    """Get statistics for a module."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None:
        return None
    
    query = """
        SELECT 
            m.id,
            m.title,
            m.created_at,
            COUNT(DISTINCT f.id) as file_count,
            COUNT(DISTINCT fc.id) as chunk_count,
            COALESCE(SUM(f.file_size), 0) as total_file_size,
            MAX(f.created_at) as last_file_upload
        FROM modules m
        LEFT JOIN files f ON m.id = f.module_id
        LEFT JOIN file_chunks fc ON f.id = fc.file_id
        WHERE m.id = %s
        GROUP BY m.id, m.title, m.created_at
    """
    return execute_query(conn, query, (module_uuid,), fetch_one=True)

def search_modules(conn: Connection, course_id: Any, search_term: str) -> List[Dict[str, Any]]:
    """Search modules within a course."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None or not search_term:
        return []
    
    search_pattern = f"%{search_term}%"
    query = """
        SELECT m.*, COUNT(f.id) as file_count
        FROM modules m
        LEFT JOIN files f ON m.id = f.module_id
        WHERE m.course_id = %s AND (m.title ILIKE %s OR m.description ILIKE %s)
        GROUP BY m.id
        ORDER BY m.created_at ASC
    """
    return execute_query(conn, query, (course_uuid, search_pattern, search_pattern), fetch_all=True)

# Module Ordering and Organization

def reorder_modules(conn: Connection, course_id: Any, module_orders: List[Dict[str, Any]]) -> bool:
    """Reorder modules within a course."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None or not module_orders:
        return False
    
    try:
        cursor = conn.cursor()
        for order_data in module_orders:
            module_uuid = to_uuid(order_data.get('module_id'))
            order_position = order_data.get('order')
            
            if module_uuid and order_position is not None:
                query = """
                    UPDATE modules 
                    SET order_position = %s, updated_at = NOW()
                    WHERE id = %s AND course_id = %s
                """
                cursor.execute(query, (order_position, module_uuid, course_uuid))
        
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        logger.error(f"Error reordering modules for course {course_uuid}: {e}")
        conn.rollback()
        raise

def get_next_module_order(conn: Connection, course_id: Any) -> int:
    """Get the next order position for a new module in a course."""
    course_uuid = to_uuid(course_id)
    if course_uuid is None:
        return 1
    
    query = """
        SELECT COALESCE(MAX(order_position), 0) + 1 as next_order
        FROM modules
        WHERE course_id = %s
    """
    result = execute_query(conn, query, (course_uuid,), fetch_one=True)
    return result['next_order'] if result else 1
"""
User and authentication related database queries.
"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID
from psycopg2.extensions import connection as Connection

from .base import to_uuid, execute_query, build_update_query, build_insert_query, validate_required_fields

logger = logging.getLogger(__name__)

# User CRUD Operations

def get_user_by_id(conn: Connection, user_id: Any) -> Optional[Dict[str, Any]]:
    """Get user by ID."""
    user_uuid = to_uuid(user_id)
    if user_uuid is None:
        return None
    
    query = "SELECT * FROM users WHERE id = %s"
    return execute_query(conn, query, (user_uuid,), fetch_one=True)

def get_user_by_email(conn: Connection, email: str) -> Optional[Dict[str, Any]]:
    """Get user by email address."""
    if not email:
        return None
    
    query = "SELECT * FROM users WHERE email = %s"
    return execute_query(conn, query, (email,), fetch_one=True)

def get_user_by_supabase_uid(conn: Connection, supabase_uid: str) -> Optional[Dict[str, Any]]:
    """Get user by Supabase UID."""
    if not supabase_uid:
        return None
    
    query = "SELECT * FROM users WHERE supabase_uid = %s"
    return execute_query(conn, query, (supabase_uid,), fetch_one=True)

def create_user(conn: Connection, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new user."""
    required_fields = ['supabase_uid', 'email']
    validate_required_fields(user_data, required_fields)
    
    # Set default values
    user_data.setdefault('created_at', 'NOW()')
    user_data.setdefault('updated_at', 'NOW()')
    
    try:
        query, params = build_insert_query('users', user_data)
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        conn.rollback()
        raise

def update_user(conn: Connection, user_id: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing user."""
    user_uuid = to_uuid(user_id)
    if user_uuid is None:
        return None
    
    if not updates:
        return get_user_by_id(conn, user_uuid)
    
    try:
        query, params = build_update_query(
            'users', 
            updates, 
            'WHERE id = %s',
            (user_uuid,)
        )
        query += " RETURNING *"
        
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error updating user {user_uuid}: {e}")
        conn.rollback()
        raise

def delete_user(conn: Connection, user_id: Any) -> bool:
    """Delete a user."""
    user_uuid = to_uuid(user_id)
    if user_uuid is None:
        return False
    
    try:
        query = "DELETE FROM users WHERE id = %s"
        cursor = conn.cursor()
        cursor.execute(query, (user_uuid,))
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error deleting user {user_uuid}: {e}")
        conn.rollback()
        raise

# Role Management

def get_role_by_user_id(conn: Connection, user_id: Any) -> Optional[str]:
    """Get the role of a user."""
    user_uuid = to_uuid(user_id)
    if user_uuid is None:
        return None
    
    query = """
        SELECT role FROM user_roles 
        WHERE user_id = %s
        ORDER BY created_at DESC 
        LIMIT 1
    """
    result = execute_query(conn, query, (user_uuid,), fetch_one=True)
    return result['role'] if result else None

def set_role(conn: Connection, user_id: Any, role: str) -> bool:
    """Set or update the role of a user."""
    user_uuid = to_uuid(user_id)
    if user_uuid is None:
        return False
    
    if not role:
        return False
    
    try:
        # Check if role already exists
        existing_role = get_role_by_user_id(conn, user_uuid)
        
        if existing_role:
            # Update existing role
            query = """
                UPDATE user_roles 
                SET role = %s, updated_at = NOW()
                WHERE user_id = %s
            """
            params = (role, user_uuid)
        else:
            # Insert new role
            query = """
                INSERT INTO user_roles (user_id, role, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
            """
            params = (user_uuid, role)
        
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        logger.error(f"Error setting role for user {user_uuid}: {e}")
        conn.rollback()
        raise

def get_users_by_role(conn: Connection, role: str) -> list[Dict[str, Any]]:
    """Get all users with a specific role."""
    if not role:
        return []
    
    query = """
        SELECT u.*, ur.role, ur.created_at as role_assigned_at
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        WHERE ur.role = %s
        ORDER BY u.created_at DESC
    """
    return execute_query(conn, query, (role,), fetch_all=True)

def get_user_with_role(conn: Connection, user_id: Any) -> Optional[Dict[str, Any]]:
    """Get user with their role information."""
    user_uuid = to_uuid(user_id)
    if user_uuid is None:
        return None
    
    query = """
        SELECT u.*, ur.role, ur.created_at as role_assigned_at
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = %s
    """
    return execute_query(conn, query, (user_uuid,), fetch_one=True)

def remove_user_role(conn: Connection, user_id: Any) -> bool:
    """Remove all roles from a user."""
    user_uuid = to_uuid(user_id)
    if user_uuid is None:
        return False
    
    try:
        query = "DELETE FROM user_roles WHERE user_id = %s"
        cursor = conn.cursor()
        cursor.execute(query, (user_uuid,))
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error removing role for user {user_uuid}: {e}")
        conn.rollback()
        raise

# User Search and Listing

def search_users(conn: Connection, search_term: str, limit: int = 50) -> list[Dict[str, Any]]:
    """Search users by email or name."""
    if not search_term:
        return []
    
    search_pattern = f"%{search_term}%"
    query = """
        SELECT u.*, ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.email ILIKE %s OR u.name ILIKE %s
        ORDER BY u.created_at DESC
        LIMIT %s
    """
    return execute_query(conn, query, (search_pattern, search_pattern, limit), fetch_all=True)

def list_users(conn: Connection, limit: int = 100, offset: int = 0) -> list[Dict[str, Any]]:
    """List users with pagination."""
    query = """
        SELECT u.*, ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        ORDER BY u.created_at DESC
        LIMIT %s OFFSET %s
    """
    return execute_query(conn, query, (limit, offset), fetch_all=True)

def count_users(conn: Connection) -> int:
    """Count total number of users."""
    query = "SELECT COUNT(*) as count FROM users"
    result = execute_query(conn, query, fetch_one=True)
    return result['count'] if result else 0
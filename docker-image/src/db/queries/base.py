"""
Base query utilities and common patterns for database operations.
"""

import logging
from typing import Optional, Any, Dict, List
from uuid import UUID
import psycopg2
import psycopg2.extras
from psycopg2.extensions import connection as Connection

logger = logging.getLogger(__name__)

def to_uuid(value: Any) -> Optional[UUID]:
    """Convert various input types to UUID, or return None if conversion fails."""
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    if isinstance(value, str):
        try:
            return UUID(value)
        except ValueError:
            logger.warning(f"Invalid UUID string: {value}")
            return None
    logger.warning(f"Cannot convert {type(value)} to UUID: {value}")
    return None

def execute_query(
    conn: Connection, 
    query: str, 
    params: Optional[tuple] = None,
    fetch_one: bool = False,
    fetch_all: bool = False,
    commit: bool = True
) -> Optional[Any]:
    """
    Execute a database query with proper error handling and logging.
    
    Args:
        conn: Database connection
        query: SQL query string
        params: Query parameters
        fetch_one: Whether to fetch one result
        fetch_all: Whether to fetch all results
        commit: Whether to commit the transaction
    
    Returns:
        Query result or None
    """
    cursor = None
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(query, params)
        
        if fetch_one:
            result = cursor.fetchone()
            return dict(result) if result else None
        elif fetch_all:
            results = cursor.fetchall()
            return [dict(row) for row in results] if results else []
        
        if commit:
            conn.commit()
        
        return True
        
    except psycopg2.Error as e:
        logger.error(f"Database error executing query: {e}")
        logger.error(f"Query: {query}")
        logger.error(f"Params: {params}")
        if commit:
            conn.rollback()
        raise
    except Exception as e:
        logger.error(f"Unexpected error executing query: {e}")
        logger.error(f"Query: {query}")
        logger.error(f"Params: {params}")
        if commit:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()

def build_update_query(
    table: str, 
    updates: Dict[str, Any], 
    where_clause: str,
    where_params: tuple
) -> tuple[str, tuple]:
    """
    Build UPDATE query dynamically based on provided fields.
    
    Args:
        table: Table name
        updates: Dictionary of column -> value updates
        where_clause: WHERE clause (with placeholders)
        where_params: Parameters for WHERE clause
    
    Returns:
        Tuple of (query_string, all_parameters)
    """
    if not updates:
        raise ValueError("No updates provided")
    
    set_clauses = []
    params = []
    
    for column, value in updates.items():
        set_clauses.append(f"{column} = %s")
        params.append(value)
    
    query = f"""
        UPDATE {table}
        SET {', '.join(set_clauses)}, updated_at = NOW()
        {where_clause}
    """
    
    # Add WHERE parameters
    params.extend(where_params)
    
    return query, tuple(params)

def build_insert_query(
    table: str, 
    data: Dict[str, Any],
    returning: str = "*"
) -> tuple[str, tuple]:
    """
    Build INSERT query dynamically based on provided data.
    
    Args:
        table: Table name
        data: Dictionary of column -> value data
        returning: RETURNING clause
    
    Returns:
        Tuple of (query_string, parameters)
    """
    if not data:
        raise ValueError("No data provided for insert")
    
    columns = list(data.keys())
    placeholders = ["%s"] * len(columns)
    values = [data[col] for col in columns]
    
    query = f"""
        INSERT INTO {table} ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING {returning}
    """
    
    return query, tuple(values)

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> None:
    """
    Validate that all required fields are present and not None.
    
    Args:
        data: Data dictionary to validate
        required_fields: List of required field names
    
    Raises:
        ValueError: If any required field is missing or None
    """
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

def sanitize_dict(data: Dict[str, Any], allowed_fields: List[str]) -> Dict[str, Any]:
    """
    Remove any fields from data dict that are not in allowed_fields.
    
    Args:
        data: Input data dictionary
        allowed_fields: List of allowed field names
    
    Returns:
        Sanitized dictionary with only allowed fields
    """
    return {k: v for k, v in data.items() if k in allowed_fields}

class QueryError(Exception):
    """Custom exception for query-related errors."""
    pass

class ValidationError(QueryError):
    """Custom exception for validation errors."""
    pass
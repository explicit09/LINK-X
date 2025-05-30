"""
File and file chunk related database queries.
"""

import logging
from typing import Optional, Dict, Any, List
from uuid import UUID
from psycopg2.extensions import connection as Connection

from .base import to_uuid, execute_query, build_update_query, build_insert_query, validate_required_fields

logger = logging.getLogger(__name__)

# File CRUD Operations

def get_file_by_id(conn: Connection, file_id: Any) -> Optional[Dict[str, Any]]:
    """Get file by ID."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None:
        return None
    
    query = "SELECT * FROM files WHERE id = %s"
    return execute_query(conn, query, (file_uuid,), fetch_one=True)

def get_files_by_module(conn: Connection, module_id: Any) -> List[Dict[str, Any]]:
    """Get all files for a module."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None:
        return []
    
    query = """
        SELECT f.*, COUNT(fc.id) as chunk_count
        FROM files f
        LEFT JOIN file_chunks fc ON f.id = fc.file_id
        WHERE f.module_id = %s
        GROUP BY f.id
        ORDER BY f.created_at DESC
    """
    return execute_query(conn, query, (module_uuid,), fetch_all=True)

def get_files_without_raw_by_module(conn: Connection, module_id: Any) -> List[Dict[str, Any]]:
    """Get files without raw content for a module."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None:
        return []
    
    query = """
        SELECT f.id, f.filename, f.file_type, f.file_size, f.created_at, f.updated_at,
               f.module_id, f.uploaded_by, f.ai_summary, f.transcription_text,
               COUNT(fc.id) as chunk_count
        FROM files f
        LEFT JOIN file_chunks fc ON f.id = fc.file_id
        WHERE f.module_id = %s
        GROUP BY f.id, f.filename, f.file_type, f.file_size, f.created_at, f.updated_at,
                 f.module_id, f.uploaded_by, f.ai_summary, f.transcription_text
        ORDER BY f.created_at DESC
    """
    return execute_query(conn, query, (module_uuid,), fetch_all=True)

def create_file(conn: Connection, file_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new file record."""
    required_fields = ['filename', 'module_id', 'uploaded_by']
    validate_required_fields(file_data, required_fields)
    
    # Set default values
    file_data.setdefault('created_at', 'NOW()')
    file_data.setdefault('updated_at', 'NOW()')
    
    try:
        query, params = build_insert_query('files', file_data)
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error creating file: {e}")
        conn.rollback()
        raise

def update_file(conn: Connection, file_id: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing file."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None:
        return None
    
    if not updates:
        return get_file_by_id(conn, file_uuid)
    
    try:
        query, params = build_update_query(
            'files', 
            updates, 
            'WHERE id = %s',
            (file_uuid,)
        )
        query += " RETURNING *"
        
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error updating file {file_uuid}: {e}")
        conn.rollback()
        raise

def delete_file(conn: Connection, file_id: Any) -> bool:
    """Delete a file and all its chunks."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None:
        return False
    
    try:
        # Delete chunks first due to foreign key constraints
        cursor = conn.cursor()
        cursor.execute("DELETE FROM file_chunks WHERE file_id = %s", (file_uuid,))
        cursor.execute("DELETE FROM files WHERE id = %s", (file_uuid,))
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error deleting file {file_uuid}: {e}")
        conn.rollback()
        raise

# File Chunk Operations

def insert_file_chunks(conn: Connection, file_id: Any, chunks: List[Dict[str, Any]]) -> bool:
    """Insert multiple file chunks for a file."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None or not chunks:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Prepare batch insert
        insert_query = """
            INSERT INTO file_chunks (file_id, chunk_index, content, embedding, metadata)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        # Prepare chunk data
        chunk_data = []
        for i, chunk in enumerate(chunks):
            chunk_data.append((
                file_uuid,
                chunk.get('chunk_index', i),
                chunk.get('content', ''),
                chunk.get('embedding'),
                chunk.get('metadata')
            ))
        
        cursor.executemany(insert_query, chunk_data)
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        logger.error(f"Error inserting chunks for file {file_uuid}: {e}")
        conn.rollback()
        raise

def get_file_chunks(conn: Connection, file_id: Any) -> List[Dict[str, Any]]:
    """Get all chunks for a file."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None:
        return []
    
    query = """
        SELECT * FROM file_chunks
        WHERE file_id = %s
        ORDER BY chunk_index ASC
    """
    return execute_query(conn, query, (file_uuid,), fetch_all=True)

def delete_file_chunks(conn: Connection, file_id: Any) -> bool:
    """Delete all chunks for a file."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM file_chunks WHERE file_id = %s", (file_uuid,))
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error deleting chunks for file {file_uuid}: {e}")
        conn.rollback()
        raise

# File Search and Analysis

def search_files(conn: Connection, module_id: Any, search_term: str) -> List[Dict[str, Any]]:
    """Search files within a module."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None or not search_term:
        return []
    
    search_pattern = f"%{search_term}%"
    query = """
        SELECT f.*, COUNT(fc.id) as chunk_count
        FROM files f
        LEFT JOIN file_chunks fc ON f.id = fc.file_id
        WHERE f.module_id = %s AND (f.filename ILIKE %s OR f.ai_summary ILIKE %s)
        GROUP BY f.id
        ORDER BY f.created_at DESC
    """
    return execute_query(conn, query, (module_uuid, search_pattern, search_pattern), fetch_all=True)

def get_file_statistics(conn: Connection, file_id: Any) -> Optional[Dict[str, Any]]:
    """Get statistics for a file."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None:
        return None
    
    query = """
        SELECT 
            f.id,
            f.filename,
            f.file_type,
            f.file_size,
            f.created_at,
            COUNT(fc.id) as chunk_count,
            COALESCE(AVG(LENGTH(fc.content)), 0) as avg_chunk_size
        FROM files f
        LEFT JOIN file_chunks fc ON f.id = fc.file_id
        WHERE f.id = %s
        GROUP BY f.id, f.filename, f.file_type, f.file_size, f.created_at
    """
    return execute_query(conn, query, (file_uuid,), fetch_one=True)

# Audio Transcription

def transcribe_audio(conn: Connection, file_id: Any, transcription_text: str) -> bool:
    """Update a file with transcription text."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None or not transcription_text:
        return False
    
    try:
        query = """
            UPDATE files 
            SET transcription_text = %s, updated_at = NOW()
            WHERE id = %s
        """
        cursor = conn.cursor()
        cursor.execute(query, (transcription_text, file_uuid))
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error updating transcription for file {file_uuid}: {e}")
        conn.rollback()
        raise

def get_files_needing_transcription(conn: Connection, file_types: List[str] = None) -> List[Dict[str, Any]]:
    """Get audio files that need transcription."""
    if file_types is None:
        file_types = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a']
    
    query = """
        SELECT * FROM files
        WHERE file_type = ANY(%s) AND (transcription_text IS NULL OR transcription_text = '')
        ORDER BY created_at ASC
    """
    return execute_query(conn, query, (file_types,), fetch_all=True)

# File Content Management

def update_file_ai_summary(conn: Connection, file_id: Any, ai_summary: str) -> bool:
    """Update a file with AI-generated summary."""
    file_uuid = to_uuid(file_id)
    if file_uuid is None:
        return False
    
    try:
        query = """
            UPDATE files 
            SET ai_summary = %s, updated_at = NOW()
            WHERE id = %s
        """
        cursor = conn.cursor()
        cursor.execute(query, (ai_summary, file_uuid))
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0
    except Exception as e:
        logger.error(f"Error updating AI summary for file {file_uuid}: {e}")
        conn.rollback()
        raise

def get_files_by_type(conn: Connection, module_id: Any, file_type: str) -> List[Dict[str, Any]]:
    """Get files of a specific type within a module."""
    module_uuid = to_uuid(module_id)
    if module_uuid is None or not file_type:
        return []
    
    query = """
        SELECT f.*, COUNT(fc.id) as chunk_count
        FROM files f
        LEFT JOIN file_chunks fc ON f.id = fc.file_id
        WHERE f.module_id = %s AND f.file_type = %s
        GROUP BY f.id
        ORDER BY f.created_at DESC
    """
    return execute_query(conn, query, (module_uuid, file_type), fetch_all=True)
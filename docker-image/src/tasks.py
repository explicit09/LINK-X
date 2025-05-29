"""
Celery tasks for background processing.
Handles file indexing, embedding generation, and maintenance tasks.
"""
import os
import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import traceback

from celery import Task, group, chord
from celery.exceptions import SoftTimeLimitExceeded
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from src.celery_app import app
from src.db.schema import Base, File, FileChunk, Module
from src.indexer import store_file_embeddings
from src.textUtils import extract_text, clean_extracted_text, split_text, openai_embed_text
from src.db.queries import get_file_by_id, insert_file_chunks, update_file
from src.s3_storage import s3_storage

# Configure logging
logger = logging.getLogger(__name__)

# Database setup
POSTGRES_URL = os.getenv("POSTGRES_URL")
if not POSTGRES_URL:
    raise RuntimeError("POSTGRES_URL not set")

engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)

class CallbackTask(Task):
    """Base task with callbacks for better error handling and monitoring."""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Success callback."""
        logger.info(f"Task {self.name}[{task_id}] succeeded")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Failure callback."""
        logger.error(f"Task {self.name}[{task_id}] failed: {exc}")
        # Could send alerts here
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Retry callback."""
        logger.warning(f"Task {self.name}[{task_id}] retrying: {exc}")

@app.task(base=CallbackTask, bind=True, name='tasks.index_file')
def index_file(self, file_id: str, force_reindex: bool = False) -> Dict[str, Any]:
    """
    Index a file by extracting text, chunking, and generating embeddings.
    
    Args:
        file_id: UUID of the file to index
        force_reindex: If True, reindex even if chunks already exist
        
    Returns:
        Dictionary with indexing results
    """
    start_time = time.time()
    db = Session()
    
    try:
        # Update task progress
        self.update_state(state='PROCESSING', meta={'stage': 'loading_file'})
        
        # Get file from database
        file = get_file_by_id(db, file_id)
        if not file:
            raise ValueError(f"File {file_id} not found")
        
        # Check if already indexed
        if not force_reindex:
            existing_chunks = db.query(FileChunk).filter_by(file_id=file_id).count()
            if existing_chunks > 0:
                logger.info(f"File {file_id} already indexed with {existing_chunks} chunks")
                return {
                    'file_id': file_id,
                    'status': 'already_indexed',
                    'chunks': existing_chunks,
                    'duration': time.time() - start_time
                }
        
        # Load file content
        file_content = None
        if file.storage_type == 's3' and file.s3_key:
            self.update_state(state='PROCESSING', meta={'stage': 'downloading_from_s3'})
            file_content = s3_storage.download_file(file.s3_key)
        else:
            file_content = file.file_data
        
        if not file_content:
            raise ValueError(f"No content available for file {file_id}")
        
        # Extract and clean text
        self.update_state(state='PROCESSING', meta={'stage': 'extracting_text'})
        raw_text = extract_text(file_content, file.filename)
        clean_text = clean_extracted_text(raw_text)
        
        # Split into chunks
        self.update_state(state='PROCESSING', meta={'stage': 'chunking_text'})
        chunks = split_text(clean_text)
        
        if not chunks:
            logger.warning(f"No chunks extracted from file {file_id}")
            return {
                'file_id': file_id,
                'status': 'no_content',
                'chunks': 0,
                'duration': time.time() - start_time
            }
        
        # Delete existing chunks if reindexing
        if force_reindex:
            db.query(FileChunk).filter_by(file_id=file_id).delete()
            db.commit()
        
        # Process chunks in batches to avoid memory issues
        batch_size = 50
        total_chunks = len(chunks)
        chunks_stored = 0
        
        for i in range(0, total_chunks, batch_size):
            batch_chunks = chunks[i:i + batch_size]
            
            # Update progress
            progress = (i / total_chunks) * 100
            self.update_state(
                state='PROCESSING', 
                meta={
                    'stage': 'generating_embeddings',
                    'progress': progress,
                    'chunks_processed': i,
                    'total_chunks': total_chunks
                }
            )
            
            # Generate embeddings for batch
            try:
                embeddings = openai_embed_text(batch_chunks)
                
                # Store chunks with embeddings
                course_id = file.module.course_id
                stored = insert_file_chunks(
                    db, 
                    file_id, 
                    course_id, 
                    batch_chunks, 
                    embeddings,
                    start_index=i
                )
                chunks_stored += stored
                
            except SoftTimeLimitExceeded:
                logger.error(f"Soft time limit exceeded while processing file {file_id}")
                db.rollback()
                raise
            except Exception as e:
                logger.error(f"Error processing chunk batch {i}-{i+batch_size}: {e}")
                db.rollback()
                raise
        
        # Update file metadata
        update_file(db, file_id, indexed_at=datetime.utcnow())
        
        duration = time.time() - start_time
        logger.info(f"Successfully indexed file {file_id}: {chunks_stored} chunks in {duration:.2f}s")
        
        return {
            'file_id': file_id,
            'status': 'success',
            'chunks': chunks_stored,
            'duration': duration
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to index file {file_id}: {e}")
        logger.error(traceback.format_exc())
        raise
    finally:
        db.close()

@app.task(base=CallbackTask, bind=True, name='tasks.generate_embeddings')
def generate_embeddings(self, chunks: List[str], metadata: Dict[str, Any]) -> List[List[float]]:
    """
    Generate embeddings for a list of text chunks.
    Separate task to allow for rate limiting and retries.
    
    Args:
        chunks: List of text chunks
        metadata: Additional metadata (file_id, chunk_indices, etc.)
        
    Returns:
        List of embedding vectors
    """
    try:
        embeddings = openai_embed_text(chunks)
        return embeddings
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        raise

@app.task(base=CallbackTask, name='tasks.reindex_course')
def reindex_course(course_id: str) -> Dict[str, Any]:
    """
    Reindex all files in a course.
    
    Args:
        course_id: UUID of the course to reindex
        
    Returns:
        Dictionary with reindexing results
    """
    db = Session()
    start_time = time.time()
    
    try:
        # Get all files in the course
        files = db.execute(text("""
            SELECT f.id 
            FROM "File" f
            JOIN "Module" m ON f.module_id = m.id
            WHERE m.course_id = :course_id
        """), {"course_id": course_id}).fetchall()
        
        file_ids = [row[0] for row in files]
        
        if not file_ids:
            return {
                'course_id': course_id,
                'status': 'no_files',
                'files_processed': 0
            }
        
        # Create a group of indexing tasks
        job = group(index_file.s(str(file_id), force_reindex=True) for file_id in file_ids)
        result = job.apply_async()
        
        # Wait for all tasks to complete
        results = result.get(timeout=3600)  # 1 hour timeout
        
        # Aggregate results
        total_chunks = sum(r.get('chunks', 0) for r in results)
        successful = sum(1 for r in results if r.get('status') == 'success')
        
        return {
            'course_id': course_id,
            'status': 'success',
            'files_processed': successful,
            'total_files': len(file_ids),
            'total_chunks': total_chunks,
            'duration': time.time() - start_time
        }
        
    except Exception as e:
        logger.error(f"Failed to reindex course {course_id}: {e}")
        raise
    finally:
        db.close()

@app.task(base=CallbackTask, name='tasks.cleanup_old_chunks')
def cleanup_old_chunks(days_old: int = 30) -> Dict[str, Any]:
    """
    Clean up orphaned chunks from deleted files.
    
    Args:
        days_old: Remove chunks older than this many days with no associated file
        
    Returns:
        Dictionary with cleanup results
    """
    db = Session()
    
    try:
        # Find orphaned chunks
        result = db.execute(text("""
            DELETE FROM "FileChunk" fc
            WHERE NOT EXISTS (
                SELECT 1 FROM "File" f WHERE f.id = fc.file_id
            )
            AND fc.created_at < :cutoff_date
            RETURNING fc.id
        """), {
            "cutoff_date": datetime.utcnow() - timedelta(days=days_old)
        })
        
        deleted_count = result.rowcount
        db.commit()
        
        logger.info(f"Cleaned up {deleted_count} orphaned chunks")
        
        return {
            'status': 'success',
            'chunks_deleted': deleted_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to cleanup chunks: {e}")
        raise
    finally:
        db.close()

@app.task(base=CallbackTask, name='tasks.vacuum_analyze_chunks')
def vacuum_analyze_chunks() -> Dict[str, Any]:
    """
    Run VACUUM ANALYZE on FileChunk table to maintain performance.
    
    Returns:
        Dictionary with maintenance results
    """
    db = Session()
    
    try:
        # Can't run VACUUM in a transaction
        db.execute(text("COMMIT"))
        db.execute(text('VACUUM ANALYZE "FileChunk"'))
        
        # Get table stats
        stats = db.execute(text("""
            SELECT 
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze
            FROM pg_stat_user_tables
            WHERE tablename = 'FileChunk'
        """)).fetchone()
        
        return {
            'status': 'success',
            'live_tuples': stats[0],
            'dead_tuples': stats[1],
            'last_vacuum': stats[2].isoformat() if stats[2] else None,
            'last_analyze': stats[4].isoformat() if stats[4] else None
        }
        
    except Exception as e:
        logger.error(f"Failed to vacuum analyze: {e}")
        raise
    finally:
        db.close()

@app.task(base=CallbackTask, name='tasks.health_check')
def health_check() -> Dict[str, Any]:
    """
    Health check task to monitor system status.
    
    Returns:
        Dictionary with health status
    """
    db = Session()
    
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        
        # Check chunk count
        chunk_count = db.execute(text('SELECT COUNT(*) FROM "FileChunk"')).scalar()
        
        # Check for stuck indexing tasks
        stuck_tasks = db.execute(text("""
            SELECT COUNT(*) 
            FROM "File" f
            WHERE f.created_at < :cutoff
            AND NOT EXISTS (
                SELECT 1 FROM "FileChunk" fc WHERE fc.file_id = f.id
            )
        """), {
            "cutoff": datetime.utcnow() - timedelta(hours=1)
        }).scalar()
        
        # Check Redis connection
        from src.celery_app import app as celery_app
        celery_app.backend.get('health_check_test')
        
        health_status = 'healthy'
        if stuck_tasks > 10:
            health_status = 'degraded'
            logger.warning(f"Found {stuck_tasks} files without chunks after 1 hour")
        
        return {
            'status': health_status,
            'database': 'connected',
            'redis': 'connected',
            'total_chunks': chunk_count,
            'stuck_files': stuck_tasks,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
    finally:
        db.close()

# Task chains for complex workflows
def process_course_upload(course_id: str, file_ids: List[str]):
    """
    Process multiple file uploads for a course.
    Uses chord to process files in parallel and aggregate results.
    """
    # Create individual tasks
    header = group(index_file.s(file_id) for file_id in file_ids)
    
    # Callback to run after all files are processed
    callback = aggregate_results.s(course_id)
    
    # Create chord
    chord(header)(callback)

@app.task
def aggregate_results(results: List[Dict], course_id: str) -> Dict[str, Any]:
    """Aggregate results from multiple file indexing tasks."""
    total_chunks = sum(r.get('chunks', 0) for r in results)
    successful = sum(1 for r in results if r.get('status') == 'success')
    failed = sum(1 for r in results if r.get('status') != 'success')
    
    logger.info(f"Course {course_id} indexing complete: {successful} successful, {failed} failed, {total_chunks} total chunks")
    
    return {
        'course_id': course_id,
        'files_processed': len(results),
        'successful': successful,
        'failed': failed,
        'total_chunks': total_chunks
    }
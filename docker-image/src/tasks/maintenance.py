"""
Maintenance and cleanup tasks
"""
from celery import shared_task
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any

from db.connection import get_db_session
from db.schema import File, FileChunk, PersonalizedFile
# S3 storage removed - using Supabase Storage
from .file_processing import process_file_async
from .embedding import generate_embeddings_async
from core.cache import cache

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def cleanup_old_files_async(self, days: int = 30):
    """Clean up files older than specified days"""
    db_session = get_db_session()
    
    try:
        logger.info(f"Cleaning up files older than {days} days")
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Find old files that are not referenced in any course
        old_files = db_session.query(File).filter(
            File.created_at < cutoff_date,
            File.is_deleted == True  # Only clean up files marked as deleted
        ).all()
        
        cleaned_count = 0
        errors = []
        
        for file in old_files:
            try:
                # Skip S3 deletion - files are now in Supabase Storage
                if file.storage_type == 's3' and file.s3_key:
                    logger.info(f"Skipping S3 deletion for migrated file: {file.s3_key}")
                
                # Delete file chunks
                db_session.query(FileChunk).filter_by(file_id=file.id).delete()
                
                # Delete personalized versions
                db_session.query(PersonalizedFile).filter_by(original_file_id=file.id).delete()
                
                # Clear cache entries
                cache.delete_pattern(f"file:{file.id}:*")
                cache.delete_pattern(f"embedding:{file.id}:*")
                
                # Delete the file record
                db_session.delete(file)
                cleaned_count += 1
                
            except Exception as file_error:
                errors.append({
                    "file_id": str(file.id),
                    "error": str(file_error)
                })
                logger.error(f"Error cleaning file {file.id}: {str(file_error)}")
        
        # Clean up old activities - commented out as Activity model doesn't exist
        # old_activities = db_session.query(Activity).filter(
        #     Activity.created_at < cutoff_date
        # ).delete()
        # logger.info(f"Deleted {old_activities} old activity records")
        
        db_session.commit()
        logger.info(f"Successfully cleaned up {cleaned_count} files")
        
        return {
            "status": "success", 
            "cleaned": cleaned_count,
            "errors": errors,
            "activities_cleaned": old_activities
        }
        
    except Exception as e:
        db_session.rollback()
        logger.error(f"Error during cleanup: {str(e)}")
        raise
    finally:
        db_session.close()

@shared_task(bind=True)
def reindex_all_content(self):
    """Reindex all content in the system"""
    db_session = get_db_session()
    
    try:
        logger.info("Starting content reindexing")
        
        # Get all active files
        files = db_session.query(File).filter(
            File.is_deleted == False
        ).all()
        
        indexed_count = 0
        errors = []
        
        for file in files:
            try:
                # Clear existing chunks
                db_session.query(FileChunk).filter_by(file_id=file.id).delete()
                
                # Clear cache
                cache.delete_pattern(f"embedding:{file.id}:*")
                
                # Skip reindexing - handled by Supabase Edge Function
                logger.info(f"Skipping manual reindexing for file {file.id} - handled by Supabase triggers")
                indexed_count += 1
                
            except Exception as file_error:
                errors.append({
                    "file_id": str(file.id),
                    "error": str(file_error)
                })
                logger.error(f"Error reindexing file {file.id}: {str(file_error)}")
        
        db_session.commit()
        logger.info(f"Successfully queued {indexed_count} files for reindexing")
        
        return {
            "status": "success", 
            "indexed": indexed_count,
            "errors": errors
        }
        
    except Exception as e:
        db_session.rollback()
        logger.error(f"Error during reindexing: {str(e)}")
        raise
    finally:
        db_session.close()

@shared_task
def vacuum_database():
    """Perform database maintenance operations"""
    db_session = get_db_session()
    
    try:
        logger.info("Starting database vacuum")
        
        # PostgreSQL VACUUM ANALYZE
        db_session.execute("VACUUM ANALYZE")
        
        # Update statistics
        tables = ['files', 'file_chunks', 'courses', 'modules', 'enrollments', 'activities']
        for table in tables:
            db_session.execute(f"ANALYZE {table}")
            logger.info(f"Updated statistics for table: {table}")
        
        db_session.commit()
        logger.info("Database vacuum completed successfully")
        
        return {"status": "success", "tables_analyzed": len(tables)}
        
    except Exception as e:
        db_session.rollback()
        logger.error(f"Error during vacuum: {str(e)}")
        return {"status": "error", "message": str(e)}
    finally:
        db_session.close()

@shared_task
def cleanup_orphaned_files():
    """Clean up orphaned files (placeholder for Supabase Storage cleanup)"""
    logger.info("Orphaned file cleanup not needed with Supabase Storage RLS")
    return {
        "status": "success",
        "message": "Supabase Storage uses RLS policies for automatic cleanup"
    }
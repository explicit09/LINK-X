"""
File upload handler with background processing integration.
Handles file uploads and triggers asynchronous indexing.
"""
import os
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from io import BytesIO

from flask import jsonify
from sqlalchemy.orm import Session

from src.db.queries import create_file, get_module_by_id
from src.s3_storage import s3_storage
from src.tasks import index_file

logger = logging.getLogger(__name__)

class FileUploadHandler:
    """Handles file uploads with background processing."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.use_s3 = os.getenv('USE_S3_STORAGE', 'false').lower() == 'true'
    
    def process_upload(
        self,
        file_obj,
        module_id: str,
        title: Optional[str] = None,
        user_id: Optional[str] = None,
        process_immediately: bool = False
    ) -> Dict[str, Any]:
        """
        Process a file upload and trigger background indexing.
        
        Args:
            file_obj: Flask file object
            module_id: UUID of the module to add file to
            title: Optional title for the file
            user_id: Optional user ID for tracking
            process_immediately: If True, index synchronously (not recommended)
            
        Returns:
            Dictionary with file info and task status
        """
        try:
            # Validate module exists
            module = get_module_by_id(self.db, module_id)
            if not module:
                raise ValueError(f"Module {module_id} not found")
            
            # Read file content
            file_content = file_obj.read()
            file_size = len(file_content)
            filename = file_obj.filename
            content_type = file_obj.content_type or 'application/octet-stream'
            
            # Use provided title or filename
            if not title:
                title = filename
            
            # Generate file ID
            file_id = str(uuid.uuid4())
            
            # Store file
            if self.use_s3:
                # Upload to S3
                s3_result = s3_storage.upload_file(
                    file_obj=BytesIO(file_content),
                    course_id=str(module.course_id),
                    module_id=str(module_id),
                    file_id=file_id,
                    filename=filename,
                    content_type=content_type
                )
                
                # Create database record
                db_file = create_file(
                    db=self.db,
                    module_id=module_id,
                    title=title,
                    filename=filename,
                    file_type=content_type,
                    file_size=file_size,
                    s3_key=s3_result['s3_key'],
                    s3_bucket=s3_result['s3_bucket'],
                    storage_type='s3'
                )
            else:
                # Store in database
                db_file = create_file(
                    db=self.db,
                    module_id=module_id,
                    title=title,
                    filename=filename,
                    file_type=content_type,
                    file_size=file_size,
                    file_data=file_content,
                    storage_type='database'
                )
            
            # Trigger background indexing
            task = None
            if process_immediately:
                # Synchronous processing (not recommended for production)
                logger.warning(f"Processing file {file_id} synchronously")
                from src.indexer import store_file_embeddings
                chunks_stored = store_file_embeddings(
                    self.db, 
                    file_id, 
                    s3_content=file_content if self.use_s3 else None
                )
                task_status = {
                    'status': 'completed',
                    'chunks': chunks_stored
                }
            else:
                # Asynchronous processing (recommended)
                task = index_file.apply_async(
                    args=[file_id],
                    kwargs={'force_reindex': False},
                    queue='high',
                    countdown=2  # Wait 2 seconds before processing
                )
                task_status = {
                    'id': task.id,
                    'status': 'queued'
                }
            
            # Log upload
            logger.info(
                f"File uploaded: {file_id} ({filename}, {file_size} bytes) "
                f"to module {module_id}, task: {task.id if task else 'sync'}"
            )
            
            return {
                'file': {
                    'id': str(db_file.id),
                    'title': db_file.title,
                    'filename': db_file.filename,
                    'file_type': db_file.file_type,
                    'file_size': db_file.file_size,
                    'module_id': str(db_file.module_id),
                    'created_at': db_file.created_at.isoformat()
                },
                'indexing': task_status,
                'message': 'File uploaded successfully. Processing will begin shortly.'
            }
            
        except Exception as e:
            logger.error(f"Failed to process file upload: {e}")
            raise
    
    def check_indexing_status(self, file_id: str) -> Dict[str, Any]:
        """
        Check the indexing status of a file.
        
        Args:
            file_id: UUID of the file
            
        Returns:
            Dictionary with indexing status
        """
        from src.db.schema import FileChunk
        
        # Check if chunks exist
        chunk_count = self.db.query(FileChunk).filter_by(file_id=file_id).count()
        
        if chunk_count > 0:
            return {
                'status': 'completed',
                'chunks': chunk_count,
                'ready': True
            }
        
        # Check for active task
        from src.celery_app import app as celery_app
        
        # Search for task by checking result backend
        # This is a simplified check - in production you'd want to track task IDs
        return {
            'status': 'processing',
            'chunks': 0,
            'ready': False,
            'message': 'File is being processed. Please check back in a few moments.'
        }

def handle_batch_upload(
    db_session: Session,
    files: list,
    module_id: str,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handle batch file uploads with parallel processing.
    
    Args:
        db_session: Database session
        files: List of file objects
        module_id: Module to add files to
        user_id: Optional user ID
        
    Returns:
        Dictionary with batch upload results
    """
    handler = FileUploadHandler(db_session)
    results = []
    task_ids = []
    
    for file_obj in files:
        try:
            result = handler.process_upload(
                file_obj=file_obj,
                module_id=module_id,
                user_id=user_id,
                process_immediately=False
            )
            results.append({
                'filename': file_obj.filename,
                'status': 'success',
                'file_id': result['file']['id'],
                'task_id': result['indexing'].get('id')
            })
            if result['indexing'].get('id'):
                task_ids.append(result['indexing']['id'])
                
        except Exception as e:
            logger.error(f"Failed to upload {file_obj.filename}: {e}")
            results.append({
                'filename': file_obj.filename,
                'status': 'failed',
                'error': str(e)
            })
    
    successful = sum(1 for r in results if r['status'] == 'success')
    failed = sum(1 for r in results if r['status'] == 'failed')
    
    return {
        'total': len(files),
        'successful': successful,
        'failed': failed,
        'results': results,
        'task_ids': task_ids,
        'message': f'Uploaded {successful} files successfully. Processing will begin shortly.'
    }
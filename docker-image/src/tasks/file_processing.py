"""
File processing tasks
"""
from celery import shared_task
import logging
from typing import Optional

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_file_async(self, file_id: str, force: bool = False):
    """Process uploaded file - extract text, generate embeddings"""
    try:
        from services.ai_service import AIService
        # S3 storage removed - using Supabase Storage
        from core.database_supabase import db
        from db.schema import File
        
        ai_service = AIService()
        
        # Get file record using direct db query
        file = db.session.query(File).filter_by(id=file_id).first()
        if not file:
            logger.error(f"File {file_id} not found")
            return
        
        # Skip if already processed unless forced (check transcription field)
        if not force and file.transcription and not file.transcription.startswith("PROCESSING"):
            logger.info(f"File {file_id} already processed")
            return
        
        # Process file based on storage type
        logger.info(f"Processing file {file_id}: {file.filename}, storage_type: {getattr(file, 'storage_type', 'unknown')}")
        
        try:
            # File processing now handled by Supabase Edge Function
            if hasattr(file, 'storage_type') and file.storage_type == 'supabase':
                logger.info(f"File {file.id} uses Supabase Storage - embeddings generated automatically")
                # Mark as processed since Supabase handles it
                file.processed = True
                db.session.commit()
                return
                    
            elif hasattr(file, 'storage_type') and file.storage_type == 'database':
                # Handle local/database storage
                logger.info(f"Processing local file: {file.filename}")
                if file.file_type in ['txt', 'md']:
                    # For text files, content might be in transcription field
                    if hasattr(file, 'transcription') and file.transcription and file.transcription != "PROCESSING_FAILED":
                        extracted_text = file.transcription
                    else:
                        # Could implement reading from local filesystem here
                        raise ValueError("Text content not available for local file")
                else:
                    # For PDFs and audio files stored locally, we'd need a different approach
                    # This would require storing the file content or path somewhere accessible
                    raise ValueError(f"Local processing not implemented for file type: {file.file_type}")
                    
            else:
                # Legacy files or migration needed
                logger.warning(f"File {file_id} not using Supabase Storage - consider migrating")
                # Mark as needing migration
                file.transcription = "NEEDS_MIGRATION_TO_SUPABASE"
                db.session.commit()
                return
            
            # Update file with extracted text
            file.transcription = extracted_text
            db.session.commit()
            
            # Queue embedding generation with content
            from .embedding import generate_embeddings_async
            generate_embeddings_async.delay(file_id, extracted_text)
            
            logger.info(f"Successfully processed file {file_id}")
            
        except Exception as e:
            logger.error(f"Error processing file {file_id}: {str(e)}")
            # Mark file as failed
            try:
                file.transcription = f"PROCESSING_FAILED: {str(e)}"
                db.session.commit()
            except Exception as db_error:
                logger.error(f"Failed to update file status: {str(db_error)}")
            raise
            
    except Exception as e:
        logger.error(f"Task failed for file {file_id}: {str(e)}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

@shared_task(bind=True, max_retries=3)
def personalize_file_async(self, file_id: str, user_id: str):
    """Generate personalized version of file content"""
    try:
        from repositories.file_repository import FileRepository
        from repositories.user_repository import UserRepository
        from services.ai_service import AIService
        
        file_repo = FileRepository()
        user_repo = UserRepository()
        ai_service = AIService()
        
        # Get file and user
        file = file_repo.get_by_id(file_id)
        user = user_repo.get_with_profile(user_id)
        
        if not file or not user:
            logger.error(f"File {file_id} or user {user_id} not found")
            return
        
        # Check if file has been processed
        if not file.processed or not file.extracted_text:
            logger.info(f"File {file_id} not yet processed, queueing processing first")
            process_file_async.apply_async(args=[file_id], countdown=5)
            # Retry this task after file processing
            raise self.retry(countdown=300)  # 5 minutes
        
        logger.info(f"Personalizing file {file_id} for user {user_id}")
        
        # Get or create personalized file record
        personalized = file_repo.get_personalized_file(file_id, user_id)
        if not personalized:
            personalized = file_repo.create_personalized_file(user_id, file_id)
        
        # Generate personalized content
        profile = user.student_profile if user.role.value == 'student' else None
        personalized_content = ai_service.personalize_content(
            file.extracted_text,
            profile=profile.__dict__ if profile else None,
            learning_style=getattr(profile, 'learning_style', 'default')
        )
        
        # Update personalized file
        from datetime import datetime
        personalized.personalized_content = personalized_content
        personalized.processed = True
        personalized.processed_at = datetime.utcnow()
        
        # Use file repository to update
        file_repo = FileRepository()
        file_repo.update(
            personalized.id,
            personalized_content=personalized_content,
            processed=True,
            processed_at=datetime.utcnow()
        )
        
        logger.info(f"Successfully personalized file {file_id} for user {user_id}")
        
    except Exception as e:
        logger.error(f"Task failed for file {file_id}, user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
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
        from services.s3_storage_resilient import s3_storage
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
            # Check storage type and handle accordingly
            if hasattr(file, 'storage_type') and file.storage_type == 's3' and hasattr(file, 's3_key') and file.s3_key:
                # Download and extract text from S3
                logger.info(f"Processing S3 file: bucket={getattr(file, 's3_bucket', 'unknown')}, key={file.s3_key}")
                if file.file_type == 'pdf':
                    from utils.textUtils import extract_text, clean_extracted_text
                    file_content = s3_storage.download_file(file.s3_key)
                    raw_text = extract_text(file_content, file.filename)
                    extracted_text = clean_extracted_text(raw_text)
                elif file.file_type in ['txt', 'md']:
                    file_content = s3_storage.download_file(file.s3_key)
                    extracted_text = file_content.decode('utf-8')
                elif file.file_type in ['mp3', 'wav', 'm4a']:
                    from utils.transcriber import transcribe_audio
                    file_content = s3_storage.download_file(file.s3_key)
                    extracted_text = transcribe_audio(file_content, file.file_type)
                else:
                    raise ValueError(f"Unsupported file type: {file.file_type}")
                    
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
                # Fallback: try S3 first, then check for transcription
                logger.warning(f"Unknown storage type for file {file_id}, attempting fallback processing")
                try:
                    # Try S3 if we have the keys
                    if hasattr(file, 's3_key') and file.s3_key and hasattr(file, 's3_bucket') and file.s3_bucket:
                        logger.info("Attempting S3 fallback")
                        file_content = s3_storage.download_file(file.s3_key)
                        if file.file_type == 'pdf':
                            from utils.textUtils import extract_text, clean_extracted_text
                            raw_text = extract_text(file_content, file.filename)
                            extracted_text = clean_extracted_text(raw_text)
                        elif file.file_type in ['txt', 'md']:
                            extracted_text = file_content.decode('utf-8')
                        elif file.file_type in ['mp3', 'wav', 'm4a']:
                            from utils.transcriber import transcribe_audio
                            extracted_text = transcribe_audio(file_content, file.file_type)
                        else:
                            raise ValueError(f"Unsupported file type: {file.file_type}")
                    else:
                        # Try transcription field for text files
                        if file.file_type in ['txt', 'md'] and hasattr(file, 'transcription') and file.transcription:
                            extracted_text = file.transcription
                        else:
                            raise ValueError("No accessible file content found")
                except Exception as fallback_error:
                    logger.error(f"Fallback processing failed: {str(fallback_error)}")
                    raise ValueError(f"Could not process file: {str(fallback_error)}")
            
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
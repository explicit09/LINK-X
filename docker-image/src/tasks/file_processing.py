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
        from repositories.file_repository import FileRepository
        from services.ai_service import AIService
        from ..s3_storage import download_file_from_s3
        
        file_repo = FileRepository()
        ai_service = AIService()
        
        # Get file record
        file = file_repo.get_by_id(file_id)
        if not file:
            logger.error(f"File {file_id} not found")
            return
        
        # Skip if already processed unless forced
        if file.processed and not force:
            logger.info(f"File {file_id} already processed")
            return
        
        # Download file from S3
        logger.info(f"Processing file {file_id}: {file.filename}")
        
        try:
            # Download and extract text based on file type
            if file.file_type == 'pdf':
                from ..textUtils import extract_text_from_pdf
                file_content = download_file_from_s3(file.s3_bucket, file.s3_key)
                extracted_text = extract_text_from_pdf(file_content)
            elif file.file_type in ['txt', 'md']:
                file_content = download_file_from_s3(file.s3_bucket, file.s3_key)
                extracted_text = file_content.decode('utf-8')
            elif file.file_type in ['mp3', 'wav', 'm4a']:
                from ..transcriber import transcribe_audio
                file_content = download_file_from_s3(file.s3_bucket, file.s3_key)
                extracted_text = transcribe_audio(file_content, file.file_type)
            else:
                raise ValueError(f"Unsupported file type: {file.file_type}")
            
            # Update file with extracted text
            file_repo.update_processing_status(
                file_id,
                processed=True,
                extracted_text=extracted_text
            )
            
            # Queue embedding generation
            generate_embeddings_async.delay(file_id)
            
            logger.info(f"Successfully processed file {file_id}")
            
        except Exception as e:
            logger.error(f"Error processing file {file_id}: {str(e)}")
            file_repo.update_processing_status(
                file_id,
                processed=False,
                error=str(e)
            )
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
        from repositories.base_repository import BaseRepository
        base_repo = BaseRepository(type(personalized))
        base_repo.update(
            personalized.id,
            personalized_content=personalized_content,
            processed=True,
            processed_at=datetime.utcnow()
        )
        
        logger.info(f"Successfully personalized file {file_id} for user {user_id}")
        
    except Exception as e:
        logger.error(f"Task failed for file {file_id}, user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
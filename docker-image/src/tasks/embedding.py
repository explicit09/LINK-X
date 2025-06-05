"""
Embedding generation tasks
"""
from celery import shared_task
import logging
import numpy as np
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from services.ai_service import AIService
from core.database import db
from db.schema import File, FileChunk
try:
    from core.cache import cache
except ImportError:
    # Fallback if cache is not available
    cache = None

logger = logging.getLogger(__name__)

# Chunk size for processing
CHUNK_SIZE = 1000  # characters
EMBEDDING_DIMENSION = 1536  # OpenAI text-embedding-3-small dimension

@shared_task(bind=True, max_retries=3)
def generate_embeddings_async(self, file_id: str, content: str):
    """Generate embeddings for file content"""
    # Set up Flask application context for database operations
    from app import create_app
    app = create_app()
    
    with app.app_context():
        ai_service = AIService()
        
        try:
            logger.info(f"Generating embeddings for file {file_id}")
            
            # Get file and course information
            file = db.session.query(File).filter_by(id=file_id).first()
            if not file:
                logger.error(f"File {file_id} not found")
                return {"status": "error", "message": "File not found"}
            
            # Get course_id from module
            from db.schema import Module
            module = db.session.query(Module).filter_by(id=file.module_id).first()
            course_id = module.course_id if module else None
            
            # Split content into chunks
            chunks = split_content_into_chunks(content, CHUNK_SIZE)
            logger.info(f"Processing {len(chunks)} chunks for file {file_id}")
            
            # Generate embeddings for each chunk
            for idx, chunk_text in enumerate(chunks):
                try:
                    # Generate embedding
                    embedding = ai_service.generate_embeddings(chunk_text)
                    
                    # Store in database
                    chunk = FileChunk(
                        file_id=file_id,
                        course_id=course_id,
                        chunk_index=idx,
                        content=chunk_text,
                        embedding=embedding
                    )
                    db.session.add(chunk)
                    
                    # Cache the embedding for fast retrieval
                    if cache:
                        cache_key = f"embedding:{file_id}:{idx}"
                        cache.set(cache_key, embedding, timeout=3600)  # 1 hour cache
                    
                except Exception as chunk_error:
                    logger.error(f"Error processing chunk {idx}: {str(chunk_error)}")
                    continue
            
            # Update file status - using transcription field to track processing status
            # Use transcription field to indicate embeddings generated
            if not file.transcription or file.transcription == "PROCESSING_FAILED":
                file.transcription = f"PROCESSED_{len(chunks)}_CHUNKS"
            logger.info(f"File {file_id} marked as processed with {len(chunks)} chunks")
            
            db.session.commit()
            logger.info(f"Successfully generated embeddings for file {file_id}")
            
            return {
                "status": "success", 
                "file_id": file_id,
                "chunks_processed": len(chunks)
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error generating embeddings: {str(e)}")
            raise self.retry(exc=e, countdown=60)

@shared_task(bind=True, max_retries=3)
def update_embeddings_async(self, file_id: str, content_delta: Dict[str, Any]):
    """Update embeddings for modified content"""
    ai_service = AIService()
    
    try:
        logger.info(f"Updating embeddings for file {file_id}")
        
        # Get existing chunks
        existing_chunks = db.session.query(FileChunk).filter_by(
            file_id=file_id
        ).order_by(FileChunk.chunk_index).all()
        
        # Determine which chunks need updating based on content_delta
        start_pos = content_delta.get('start_position', 0)
        end_pos = content_delta.get('end_position', len(content_delta.get('new_content', '')))
        new_content = content_delta.get('new_content', '')
        
        # Calculate affected chunk indices
        start_chunk_idx = start_pos // CHUNK_SIZE
        end_chunk_idx = end_pos // CHUNK_SIZE
        
        # Re-chunk the affected portion
        affected_content = new_content[start_pos:end_pos]
        new_chunks = split_content_into_chunks(affected_content, CHUNK_SIZE)
        
        # Update affected chunks
        for idx in range(start_chunk_idx, min(end_chunk_idx + 1, len(existing_chunks))):
            if idx < len(new_chunks):
                chunk = existing_chunks[idx]
                chunk.content = new_chunks[idx - start_chunk_idx]
                chunk.embedding = ai_service.generate_embeddings(chunk.content)
                
                # Update cache
                if cache:
                    cache_key = f"embedding:{file_id}:{idx}"
                    cache.set(cache_key, chunk.embedding, timeout=3600)
        
        db.session.commit()
        logger.info(f"Successfully updated embeddings for file {file_id}")
        
        return {
            "status": "success", 
            "file_id": file_id,
            "chunks_updated": end_chunk_idx - start_chunk_idx + 1
        }
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating embeddings: {str(e)}")
        raise self.retry(exc=e, countdown=60)

def split_content_into_chunks(content: str, chunk_size: int) -> List[str]:
    """Split content into overlapping chunks for better context"""
    chunks = []
    overlap = chunk_size // 10  # 10% overlap
    
    for i in range(0, len(content), chunk_size - overlap):
        chunk = content[i:i + chunk_size]
        if chunk.strip():  # Only add non-empty chunks
            chunks.append(chunk)
    
    return chunks

def generate_embeddings_sync(file_id: str, content: str):
    """Synchronous version of embedding generation for direct execution"""
    ai_service = AIService()
    
    try:
        logger.info(f"Generating embeddings synchronously for file {file_id}")
        
        # Get file and course information
        file = db.session.query(File).filter_by(id=file_id).first()
        if not file:
            logger.error(f"File {file_id} not found")
            return {"status": "error", "message": "File not found"}
        
        # Get course_id from module
        from db.schema import Module
        module = db.session.query(Module).filter_by(id=file.module_id).first()
        course_id = module.course_id if module else None
        
        # Split content into chunks
        chunks = split_content_into_chunks(content, CHUNK_SIZE)
        logger.info(f"Processing {len(chunks)} chunks for file {file_id}")
        
        # Generate embeddings for each chunk
        for idx, chunk_text in enumerate(chunks):
            try:
                # Generate embedding
                embedding = ai_service.generate_embeddings(chunk_text)
                
                # Store in database
                chunk = FileChunk(
                    file_id=file_id,
                    course_id=course_id,
                    chunk_index=idx,
                    content=chunk_text,
                    embedding=embedding
                )
                db.session.add(chunk)
                
                # Cache the embedding for fast retrieval
                if cache:
                    cache_key = f"embedding:{file_id}:{idx}"
                    cache.set(cache_key, embedding, timeout=3600)  # 1 hour cache
                
            except Exception as chunk_error:
                logger.error(f"Error processing chunk {idx}: {str(chunk_error)}")
                continue
        
        db.session.commit()
        logger.info(f"Successfully generated embeddings for file {file_id}")
        
        return {
            "status": "success", 
            "file_id": file_id,
            "chunks_processed": len(chunks)
        }
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error generating embeddings: {str(e)}")
        return {"status": "error", "message": str(e)}

@shared_task
def cleanup_orphaned_embeddings():
    """Clean up embeddings for deleted files"""
    try:
        # Find chunks without corresponding files
        orphaned_chunks = db.session.query(FileChunk).filter(
            ~FileChunk.file_id.in_(
                db.session.query(File.id)
            )
        ).all()
        
        for chunk in orphaned_chunks:
            # Clear from cache
            if cache:
                cache_key = f"embedding:{chunk.file_id}:{chunk.chunk_index}"
                cache.delete(cache_key)
            
            # Delete from database
            db.session.delete(chunk)
        
        db.session.commit()
        logger.info(f"Cleaned up {len(orphaned_chunks)} orphaned chunks")
        
        return {"status": "success", "cleaned": len(orphaned_chunks)}
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error cleaning up embeddings: {str(e)}")
        return {"status": "error", "message": str(e)}
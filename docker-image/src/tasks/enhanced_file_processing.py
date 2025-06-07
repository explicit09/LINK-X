"""
Enhanced file processing with semantic chunking and hybrid search.
Builds on existing file_processing.py infrastructure.
"""
from celery import shared_task
import logging
from typing import Optional, Dict, List
import json

from core.database_supabase import db_manager
from db.schema import File, FileChunk, Module
from repositories.file_repository import FileRepository
# EmbeddingsService removed - Supabase handles embeddings natively now
from services.ai.ai_service import AIService
from services.file_service_supabase import SupabaseFileService as S3Storage
from utils.semantic_chunker import create_enhanced_chunks
from utils.textUtils import extract_text

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_file_with_semantic_chunking(self, file_id: str, force: bool = False):
    """
    Enhanced file processing with semantic chunking.
    Can be called alongside or instead of regular processing.
    """
    try:
        logger.info(f"Starting enhanced processing for file {file_id}")
        
        with db_manager.get_session() as session:
            file_repo = FileRepository()
            file_obj = file_repo.get_by_id(session, file_id)
            
            if not file_obj:
                logger.error(f"File {file_id} not found")
                return {"status": "error", "message": "File not found"}
            
            # Skip if already processed unless forced
            if hasattr(file_obj, 'semantic_processed') and file_obj.semantic_processed and not force:
                logger.info(f"File {file_id} already semantically processed")
                return {"status": "skipped", "message": "Already processed"}
            
            # Get content based on file type
            content = None
            
            # Check for existing transcription (audio files)
            if file_obj.transcription:
                content = file_obj.transcription
                logger.info("Using existing transcription")
            
            # Download from S3 if needed
            elif file_obj.storage_type == 's3' and file_obj.s3_key:
                logger.info(f"Downloading from S3: {file_obj.s3_bucket}/{file_obj.s3_key}")
                s3_service = S3Storage()
                
                try:
                    file_data = s3_service.download_file(file_obj.s3_bucket, file_obj.s3_key)
                    
                    if file_obj.file_type == 'pdf':
                        from utils.textUtils import extract_text_from_pdf
                        content = extract_text_from_pdf(file_data)
                    elif file_obj.file_type in ['txt', 'md']:
                        content = file_data.decode('utf-8')
                    elif file_obj.file_type in ['mp3', 'wav', 'm4a']:
                        # For audio, check if transcription exists
                        if not file_obj.transcription:
                            logger.info("Audio file needs transcription first")
                            # Queue transcription task
                            from tasks.file_processing import process_file_async
                            process_file_async.delay(file_id)
                            return {"status": "queued", "message": "Queued for transcription"}
                    else:
                        logger.error(f"Unsupported file type: {file_obj.file_type}")
                        return {"status": "error", "message": f"Unsupported type: {file_obj.file_type}"}
                        
                except Exception as e:
                    logger.error(f"Error downloading/processing file: {e}")
                    return {"status": "error", "message": str(e)}
            
            if not content:
                logger.error(f"No content available for file {file_id}")
                return {"status": "error", "message": "No content available"}
            
            # Get module and course info
            module = session.query(Module).filter_by(id=file_obj.module_id).first()
            if not module:
                logger.error(f"Module {file_obj.module_id} not found")
                return {"status": "error", "message": "Module not found"}
            
            course_id = module.course_id
            
            # Create semantic chunks
            logger.info("Creating semantic chunks...")
            chunks_data = create_enhanced_chunks(file_id, content, file_obj.file_type)
            logger.info(f"Created {len(chunks_data)} semantic chunks")
            
            # Delete existing chunks
            session.query(FileChunk).filter_by(file_id=file_id).delete()
            
            # Process each chunk
            # Note: Embeddings will be generated automatically by Supabase native AI
            for chunk_data in chunks_data:
                # Create FileChunk with semantic metadata
                # Embedding will be generated automatically by database trigger
                chunk = FileChunk(
                    file_id=file_id,
                    course_id=course_id,
                    chunk_index=chunk_data['chunk_index'],
                    content=chunk_data['content'],  # Embedding will be auto-generated by Supabase
                    chunk_metadata=chunk_data['chunk_metadata']  # Semantic metadata!
                )
                session.add(chunk)
            
            # Mark as processed (add flag if not exists)
            # For now, we'll use a metadata field
            if hasattr(file_obj, 'metadata'):
                if not file_obj.metadata:
                    file_obj.metadata = {}
                file_obj.metadata['semantic_processed'] = True
            
            session.commit()
            
            logger.info(f"Successfully processed file {file_id} with semantic chunking")
            
            # Queue embedding generation for new chunks
            from .embedding_generation import process_file_embeddings
            embedding_task = process_file_embeddings.apply_async(args=[file_id])
            logger.info(f"Queued embedding generation task: {embedding_task.id}")
            
            # Extract style if it's a professor's material
            if module.creator_id:  # Professor's course
                extract_teaching_style.delay(course_id)
            
            return {
                "status": "success",
                "file_id": file_id,
                "chunks_created": len(chunks_data),
                "semantic": True
            }
            
    except Exception as e:
        logger.error(f"Error in semantic processing: {str(e)}", exc_info=True)
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task
def extract_teaching_style(course_id: str):
    """
    Extract teaching style from course materials.
    Works for both professor courses and self-study materials.
    """
    try:
        logger.info(f"Extracting teaching style for course {course_id}")
        
        with db_manager.get_session() as session:
            # Get all chunks from the course
            chunks = session.query(FileChunk).filter_by(course_id=course_id).all()
            
            if not chunks:
                logger.warning(f"No chunks found for course {course_id}")
                return
            
            # Analyze style patterns
            style_profile = {
                'terminology': {},  # Common terms and their usage
                'explanation_patterns': [],  # How concepts are explained
                'example_types': {},  # Types of examples used
                'tone_indicators': {},  # Formal/informal indicators
                'structure_patterns': {}  # How content is organized
            }
            
            # Analyze chunks
            for chunk in chunks[:50]:  # Sample first 50 chunks
                metadata = chunk.chunk_metadata or {}
                
                # Extract terminology
                if 'concepts' in metadata:
                    for concept in metadata['concepts']:
                        style_profile['terminology'][concept] = \
                            style_profile['terminology'].get(concept, 0) + 1
                
                # Analyze patterns based on chunk type
                chunk_type = metadata.get('chunk_type', 'explanation')
                if chunk_type == 'definition':
                    # Extract definition patterns
                    import re
                    def_patterns = re.findall(r'(\w+)\s+(?:is|are|refers to|means)', 
                                            chunk.content[:200])
                    style_profile['explanation_patterns'].extend(def_patterns)
                
                elif chunk_type == 'example':
                    # Categorize example types
                    if 'real-world' in chunk.content.lower():
                        style_profile['example_types']['real_world'] = \
                            style_profile['example_types'].get('real_world', 0) + 1
                    elif any(word in chunk.content.lower() for word in ['suppose', 'imagine', 'consider']):
                        style_profile['example_types']['hypothetical'] = \
                            style_profile['example_types'].get('hypothetical', 0) + 1
                
                # Analyze tone
                formal_indicators = len(re.findall(r'\b(?:therefore|thus|hence|moreover)\b', 
                                                 chunk.content, re.I))
                informal_indicators = len(re.findall(r'\b(?:you|let\'s|we\'ll|don\'t)\b', 
                                                   chunk.content, re.I))
                
                style_profile['tone_indicators']['formal'] = \
                    style_profile['tone_indicators'].get('formal', 0) + formal_indicators
                style_profile['tone_indicators']['informal'] = \
                    style_profile['tone_indicators'].get('informal', 0) + informal_indicators
            
            # Store style profile
            from db.schema import Course
            course = session.query(Course).filter_by(id=course_id).first()
            if course:
                if not hasattr(course, 'teaching_style') or not course.teaching_style:
                    # Store in metadata for now
                    if not course.metadata:
                        course.metadata = {}
                    course.metadata['teaching_style'] = style_profile
                    session.commit()
                    
                    logger.info(f"Stored teaching style for course {course_id}")
            
            return style_profile
            
    except Exception as e:
        logger.error(f"Error extracting teaching style: {e}", exc_info=True)


@shared_task
def reprocess_course_with_enhancements(course_id: str):
    """
    Reprocess all files in a course with semantic chunking.
    Useful for upgrading existing courses.
    """
    try:
        logger.info(f"Reprocessing course {course_id} with enhancements")
        
        with db_manager.get_session() as session:
            # Get all files in the course
            files = session.query(File).join(Module).filter(
                Module.course_id == course_id
            ).all()
            
            logger.info(f"Found {len(files)} files to reprocess")
            
            # Queue processing for each file
            for file_obj in files:
                process_file_with_semantic_chunking.delay(str(file_obj.id), force=True)
            
            return {
                "status": "queued",
                "course_id": course_id,
                "files_queued": len(files)
            }
            
    except Exception as e:
        logger.error(f"Error reprocessing course: {e}", exc_info=True)
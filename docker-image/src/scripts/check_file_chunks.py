#!/usr/bin/env python
"""
Quick script to check if a file has FileChunk entries and trigger processing if needed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.schema import File, FileChunk, Module
from repositories.file_repository import FileRepository
from core.database_supabase import db_manager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_file_chunks(file_id: str):
    """Check if a file has FileChunk entries"""
    with db_manager.get_session() as session:
        # Get file
        file_obj = session.query(File).filter_by(id=file_id).first()
        if not file_obj:
            logger.error(f"File {file_id} not found")
            return
        
        logger.info(f"File found: {file_obj.title} (type: {file_obj.file_type}, storage: {file_obj.storage_type})")
        
        # Check for chunks
        chunks = session.query(FileChunk).filter_by(file_id=file_id).all()
        logger.info(f"Found {len(chunks)} FileChunk entries")
        
        if not chunks:
            logger.info("No chunks found - file needs processing")
            
            # Check if file has transcription (for audio files)
            if file_obj.transcription:
                logger.info(f"File has transcription (length: {len(file_obj.transcription)})")
                return file_obj.transcription
            
            # Check if file is in S3
            if file_obj.s3_key:
                logger.info(f"File is stored in S3: {file_obj.s3_bucket}/{file_obj.s3_key}")
                # TODO: Download and process file
                return None
            
            # Check if file has data in database
            if file_obj.file_data:
                logger.info(f"File has data in database (size: {len(file_obj.file_data)} bytes)")
                # TODO: Process file data
                return None
        else:
            # Combine chunks
            full_text = '\n\n'.join([chunk.content for chunk in sorted(chunks, key=lambda x: x.chunk_index)])
            logger.info(f"Combined text from chunks (length: {len(full_text)})")
            return full_text

def process_file_and_create_chunks(file_id: str):
    """Process a file and create FileChunk entries"""
    try:
        with db_manager.get_session() as session:
            # Get file with module info
            file_obj = session.query(File).filter_by(id=file_id).first()
            if not file_obj:
                logger.error(f"File {file_id} not found")
                return
            
            # Get module for course_id
            module = session.query(Module).filter_by(id=file_obj.module_id).first()
            if not module:
                logger.error(f"Module {file_obj.module_id} not found")
                return
            
            course_id = module.course_id
            logger.info(f"Processing file {file_obj.title} from course {course_id}")
            
            # Extract text based on file type
            extracted_text = None
            
            if file_obj.transcription:
                extracted_text = file_obj.transcription
                logger.info("Using existing transcription")
            elif file_obj.storage_type == 's3' and file_obj.s3_key:
                logger.info(f"Downloading file from S3: {file_obj.s3_bucket}/{file_obj.s3_key}")
                # TODO: Implement S3 download and text extraction
                from services.s3_storage import S3StorageService
                s3_service = S3StorageService()
                try:
                    file_data = s3_service.download_file(file_obj.s3_bucket, file_obj.s3_key)
                    
                    if file_obj.file_type == 'pdf':
                        from utils.textUtils import extract_text_from_pdf
                        extracted_text = extract_text_from_pdf(file_data)
                    elif file_obj.file_type in ['txt', 'md']:
                        extracted_text = file_data.decode('utf-8')
                    else:
                        logger.error(f"Unsupported file type: {file_obj.file_type}")
                        return
                except Exception as e:
                    logger.error(f"Error downloading/processing file: {e}")
                    return
            
            if not extracted_text:
                logger.error("No text extracted from file")
                return
            
            logger.info(f"Extracted text length: {len(extracted_text)}")
            
            # Create chunks
            from tasks.embedding import split_content_into_chunks, CHUNK_SIZE
            chunks = split_content_into_chunks(extracted_text, CHUNK_SIZE)
            logger.info(f"Creating {len(chunks)} chunks")
            
            # Delete existing chunks
            session.query(FileChunk).filter_by(file_id=file_id).delete()
            
            # Create new chunks
            for idx, chunk_text in enumerate(chunks):
                chunk = FileChunk(
                    file_id=file_id,
                    course_id=course_id,
                    chunk_index=idx,
                    content=chunk_text,
                    embedding=[0.0] * 1536  # Placeholder embedding
                )
                session.add(chunk)
            
            session.commit()
            logger.info(f"Successfully created {len(chunks)} chunks for file {file_id}")
            
    except Exception as e:
        logger.error(f"Error processing file: {e}", exc_info=True)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_file_chunks.py <file_id> [--process]")
        sys.exit(1)
    
    file_id = sys.argv[1]
    should_process = len(sys.argv) > 2 and sys.argv[2] == "--process"
    
    logger.info(f"Checking file {file_id}")
    text = check_file_chunks(file_id)
    
    if text:
        logger.info(f"File has text available (length: {len(text)})")
    else:
        logger.info("No text found for file")
        
        if should_process:
            logger.info("Processing file...")
            process_file_and_create_chunks(file_id)
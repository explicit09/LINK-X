#!/usr/bin/env python
"""
Test semantic processing on a single file.
"""
import os
import sys
import asyncio
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database_supabase import db_manager
from db.schema import File, FileChunk
from tasks.enhanced_file_processing import process_file_with_semantic_chunking
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_semantic_processing(file_id=None):
    """Test semantic processing on a file"""
    load_dotenv()
    
    with db_manager.get_session() as session:
        if not file_id:
            # Get a sample file
            file_obj = session.query(File).first()
            if not file_obj:
                logger.error("No files found in database")
                return
            file_id = str(file_obj.id)
            logger.info(f"Using file: {file_obj.title} (ID: {file_id})")
        else:
            file_obj = session.query(File).filter_by(id=file_id).first()
            if not file_obj:
                logger.error(f"File {file_id} not found")
                return
        
        # Check current chunks
        current_chunks = session.query(FileChunk).filter_by(file_id=file_id).count()
        logger.info(f"Current chunks: {current_chunks}")
        
        # Check for semantic metadata
        semantic_chunks = session.query(FileChunk).filter(
            FileChunk.file_id == file_id,
            FileChunk.chunk_metadata.isnot(None)
        ).count()
        logger.info(f"Chunks with metadata: {semantic_chunks}")
    
    # Process with semantic chunking
    logger.info("\nProcessing with semantic chunking...")
    
    # Call the task directly (not async)
    from tasks.enhanced_file_processing import process_file_with_semantic_chunking
    
    # Create a mock task object
    class MockTask:
        def __init__(self):
            self.request = type('obj', (object,), {'retries': 0})
    
    task = MockTask()
    result = process_file_with_semantic_chunking(task, file_id, force=True)
    
    logger.info(f"\nProcessing result: {result}")
    
    # Check results
    with db_manager.get_session() as session:
        new_chunks = session.query(FileChunk).filter_by(file_id=file_id).count()
        semantic_chunks = session.query(FileChunk).filter(
            FileChunk.file_id == file_id,
            FileChunk.chunk_metadata.isnot(None)
        ).count()
        
        logger.info(f"\nAfter processing:")
        logger.info(f"Total chunks: {new_chunks}")
        logger.info(f"Chunks with metadata: {semantic_chunks}")
        
        # Show sample metadata
        sample = session.query(FileChunk).filter(
            FileChunk.file_id == file_id,
            FileChunk.chunk_metadata.isnot(None)
        ).first()
        
        if sample:
            logger.info(f"\nSample metadata:")
            import json
            logger.info(json.dumps(sample.chunk_metadata, indent=2))

if __name__ == "__main__":
    file_id = sys.argv[1] if len(sys.argv) > 1 else None
    test_semantic_processing(file_id)
#!/usr/bin/env python
"""
Run semantic reprocessing on files in the database.
This adds semantic metadata to existing FileChunks.
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import db_manager
from db.schema import File, FileChunk, Course
from tasks.enhanced_file_processing import process_file_with_semantic_chunking

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_files_needing_processing():
    """Get files that need semantic processing"""
    with db_manager.get_session() as session:
        # Get files that have chunks but no semantic metadata
        files = session.query(File).join(FileChunk).filter(
            FileChunk.chunk_metadata.is_(None)
        ).distinct().limit(10).all()  # Process 10 at a time
        
        return [(str(f.id), f.title) for f in files]

def run_semantic_reprocessing():
    """Run semantic reprocessing on files"""
    load_dotenv()
    
    logger.info("Starting semantic reprocessing...")
    
    # Get files needing processing
    files = get_files_needing_processing()
    
    if not files:
        logger.info("No files need semantic processing!")
        
        # Check if we have any files at all
        with db_manager.get_session() as session:
            total_files = session.query(File).count()
            total_chunks = session.query(FileChunk).count()
            chunks_with_metadata = session.query(FileChunk).filter(
                FileChunk.chunk_metadata.isnot(None)
            ).count()
            
            logger.info(f"Total files: {total_files}")
            logger.info(f"Total chunks: {total_chunks}")
            logger.info(f"Chunks with metadata: {chunks_with_metadata}")
        return
    
    logger.info(f"Found {len(files)} files needing semantic processing")
    
    # Process each file
    for file_id, title in files:
        logger.info(f"\nProcessing: {title} (ID: {file_id})")
        
        try:
            # Create a mock task object for direct execution
            class MockTask:
                def __init__(self):
                    self.request = type('obj', (object,), {'retries': 0})()
            
            task = MockTask()
            result = process_file_with_semantic_chunking(
                task, 
                file_id, 
                force=True  # Force reprocessing
            )
            
            logger.info(f"Result: {result}")
            
            # Check if metadata was added
            with db_manager.get_session() as session:
                chunks_with_metadata = session.query(FileChunk).filter(
                    FileChunk.file_id == file_id,
                    FileChunk.chunk_metadata.isnot(None)
                ).count()
                
                total_chunks = session.query(FileChunk).filter(
                    FileChunk.file_id == file_id
                ).count()
                
                logger.info(f"Chunks with metadata: {chunks_with_metadata}/{total_chunks}")
            
        except Exception as e:
            logger.error(f"Error processing {title}: {e}", exc_info=True)
            continue
    
    logger.info("\nSemantic reprocessing complete!")

def check_sample_metadata():
    """Check a sample of the metadata created"""
    with db_manager.get_session() as session:
        # Get a sample chunk with metadata
        sample = session.query(FileChunk).filter(
            FileChunk.chunk_metadata.isnot(None)
        ).first()
        
        if sample:
            logger.info("\nSample metadata:")
            import json
            logger.info(json.dumps(sample.chunk_metadata, indent=2))
        else:
            logger.info("\nNo chunks with metadata found")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Run semantic reprocessing')
    parser.add_argument('--check-only', action='store_true', 
                        help='Only check current status')
    parser.add_argument('--file-id', type=str, 
                        help='Process specific file ID')
    
    args = parser.parse_args()
    
    if args.check_only:
        check_sample_metadata()
    elif args.file_id:
        # Process specific file
        logger.info(f"Processing specific file: {args.file_id}")
        class MockTask:
            def __init__(self):
                self.request = type('obj', (object,), {'retries': 0})()
        
        result = process_file_with_semantic_chunking(
            MockTask(), 
            args.file_id, 
            force=True
        )
        logger.info(f"Result: {result}")
        check_sample_metadata()
    else:
        run_semantic_reprocessing()
        check_sample_metadata()
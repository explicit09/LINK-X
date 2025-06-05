#!/usr/bin/env python
"""
Simple script to check if a file has FileChunk entries and trigger processing if needed
"""
import sys
import os
import psycopg2
from urllib.parse import urlparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get direct database connection"""
    db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@postgres:5432/postgres')
    parsed = urlparse(db_url)
    
    return psycopg2.connect(
        host=parsed.hostname or 'postgres',
        port=parsed.port or 5432,
        database=parsed.path[1:] if parsed.path else 'postgres',
        user=parsed.username or 'postgres',
        password=parsed.password or 'postgres'
    )

def check_file_chunks(file_id: str):
    """Check if a file has FileChunk entries"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get file info
        cur.execute('''
            SELECT id, filename, title, s3_key, storage_type, file_type, transcription
            FROM "File"
            WHERE id = %s
        ''', (file_id,))
        
        file_data = cur.fetchone()
        if not file_data:
            logger.error(f"File {file_id} not found")
            return None
        
        logger.info(f"File found:")
        logger.info(f"  - ID: {file_data[0]}")
        logger.info(f"  - Filename: {file_data[1]}")
        logger.info(f"  - Title: {file_data[2]}")
        logger.info(f"  - S3 Key: {file_data[3]}")
        logger.info(f"  - Storage Type: {file_data[4]}")
        logger.info(f"  - File Type: {file_data[5]}")
        logger.info(f"  - Has Transcription: {'Yes' if file_data[6] else 'No'}")
        
        # Check for chunks
        cur.execute('''
            SELECT COUNT(*) FROM "FileChunk"
            WHERE file_id = %s
        ''', (file_id,))
        
        chunk_count = cur.fetchone()[0]
        logger.info(f"\nFound {chunk_count} FileChunk entries")
        
        if chunk_count > 0:
            # Get chunk details
            cur.execute('''
                SELECT chunk_index, LENGTH(content) as content_length
                FROM "FileChunk"
                WHERE file_id = %s
                ORDER BY chunk_index
                LIMIT 5
            ''', (file_id,))
            
            chunks = cur.fetchall()
            logger.info("\nFirst few chunks:")
            for chunk in chunks:
                logger.info(f"  - Chunk {chunk[0]}: {chunk[1]} characters")
                
            # Get combined text length
            cur.execute('''
                SELECT SUM(LENGTH(content)) 
                FROM "FileChunk"
                WHERE file_id = %s
            ''', (file_id,))
            
            total_length = cur.fetchone()[0]
            logger.info(f"\nTotal content length across all chunks: {total_length} characters")
        else:
            logger.info("\nNo chunks found - file needs processing")
            
            # Check what processing might be needed
            if file_data[6]:  # Has transcription
                logger.info(f"File has transcription (length: {len(file_data[6])} characters)")
                logger.info("Transcription can be chunked for vector search")
            elif file_data[3]:  # Has S3 key
                logger.info(f"File is stored in S3: {file_data[3]}")
                logger.info("File needs to be downloaded and processed")
            else:
                logger.info("File needs content extraction")
                
        return chunk_count > 0
        
    finally:
        cur.close()
        conn.close()

def process_file_chunks(file_id: str):
    """Process a file and create FileChunk entries"""
    logger.info(f"\nProcessing file {file_id}...")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get file and module info
        cur.execute('''
            SELECT f.id, f.filename, f.title, f.s3_key, f.s3_bucket, 
                   f.storage_type, f.file_type, f.transcription, f.module_id,
                   m.course_id
            FROM "File" f
            JOIN "Module" m ON f.module_id = m.id
            WHERE f.id = %s
        ''', (file_id,))
        
        file_data = cur.fetchone()
        if not file_data:
            logger.error(f"File {file_id} not found or has no module")
            return False
            
        course_id = file_data[9]
        logger.info(f"Course ID: {course_id}")
        
        # Check if we can process this file
        extracted_text = None
        
        if file_data[7]:  # Has transcription
            extracted_text = file_data[7]
            logger.info("Using existing transcription for chunking")
        elif file_data[3] and file_data[4] == 's3':  # Has S3 key
            logger.info(f"File needs to be downloaded from S3: {file_data[4]}/{file_data[3]}")
            logger.info("S3 download and processing would happen here in production")
            # In production, this would download and extract text
            return False
        else:
            logger.error("No content available to process")
            return False
            
        if extracted_text:
            # Simple chunking (in production, use proper text splitter)
            chunk_size = 1000
            chunks = []
            for i in range(0, len(extracted_text), chunk_size):
                chunks.append(extracted_text[i:i+chunk_size])
            
            logger.info(f"Created {len(chunks)} chunks of ~{chunk_size} characters each")
            
            # Delete existing chunks
            cur.execute('DELETE FROM "FileChunk" WHERE file_id = %s', (file_id,))
            
            # Insert new chunks
            for idx, chunk_text in enumerate(chunks):
                # Create placeholder embedding (in production, generate real embeddings)
                placeholder_embedding = [0.0] * 1536
                
                cur.execute('''
                    INSERT INTO "FileChunk" (file_id, course_id, chunk_index, content, embedding)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (file_id, course_id, idx, chunk_text, placeholder_embedding))
            
            conn.commit()
            logger.info(f"Successfully created {len(chunks)} chunks")
            return True
            
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_file_chunks_simple.py <file_id> [--process]")
        sys.exit(1)
    
    file_id = sys.argv[1]
    should_process = len(sys.argv) > 2 and sys.argv[2] == "--process"
    
    has_chunks = check_file_chunks(file_id)
    
    if not has_chunks and should_process:
        success = process_file_chunks(file_id)
        if success:
            logger.info("\nFile processed successfully!")
            # Check again to confirm
            check_file_chunks(file_id)
        else:
            logger.error("\nFile processing failed")
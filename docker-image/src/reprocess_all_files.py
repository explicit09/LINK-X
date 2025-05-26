#!/usr/bin/env python3
"""
Reprocess all existing files to generate vector embeddings.
Run this after the pgvector migration to populate FileChunk table.
"""
import os
import sys
import time
import logging
import traceback
from datetime import datetime
from typing import List, Dict, Any

import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Local imports (without src prefix since we're running from src directory)
from indexer import store_file_embeddings
from db.schema import Base, File, FileChunk
from s3_storage import s3_storage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_connection():
    """Get database connection from environment."""
    postgres_url = os.getenv("POSTGRES_URL")
    if not postgres_url:
        raise RuntimeError("POSTGRES_URL not set")
    return psycopg2.connect(postgres_url, cursor_factory=RealDictCursor)

def get_sqlalchemy_session():
    """Get SQLAlchemy session."""
    postgres_url = os.getenv("POSTGRES_URL")
    if not postgres_url:
        raise RuntimeError("POSTGRES_URL not set")
    
    engine = create_engine(postgres_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()

def get_unprocessed_files() -> List[Dict[str, Any]]:
    """Get all files that don't have vector embeddings yet."""
    conn = get_connection()
    
    try:
        with conn.cursor() as cur:
            # Find files without any chunks
            cur.execute("""
                SELECT 
                    f.id,
                    f.title,
                    f.filename,
                    f.file_type,
                    f.file_size,
                    f.created_at,
                    f.s3_key,
                    f.s3_bucket,
                    f.storage_type,
                    m.title as module_title,
                    m.id as module_id,
                    c.title as course_title,
                    c.id as course_id,
                    COALESCE(chunk_count.count, 0) as existing_chunks
                FROM "File" f
                JOIN "Module" m ON f.module_id = m.id
                JOIN "Course" c ON m.course_id = c.id
                LEFT JOIN (
                    SELECT file_id, COUNT(*) as count 
                    FROM "FileChunk" 
                    GROUP BY file_id
                ) chunk_count ON f.id = chunk_count.file_id
                WHERE COALESCE(chunk_count.count, 0) = 0
                AND (f.file_data IS NOT NULL OR f.s3_key IS NOT NULL)
                ORDER BY f.created_at DESC
            """)
            
            files = cur.fetchall()
            return [dict(row) for row in files]
    finally:
        conn.close()

def process_file(file_info: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single file and generate embeddings."""
    file_id = file_info['id']
    filename = file_info['filename']
    storage_type = file_info.get('storage_type', 'database')
    s3_key = file_info.get('s3_key')
    
    logger.info(f"Processing file: {filename} ({file_id}) - Storage: {storage_type}")
    
    db_session = get_sqlalchemy_session()
    start_time = time.time()
    
    try:
        # Download from S3 if needed
        s3_content = None
        if storage_type == 's3' and s3_key:
            logger.info(f"Downloading file from S3: {s3_key}")
            s3_content = s3_storage.download_file(s3_key)
            if not s3_content:
                raise ValueError(f"Failed to download file from S3: {s3_key}")
        
        # Use the existing indexer function
        chunks_stored = store_file_embeddings(db_session, str(file_id), s3_content)
        
        duration = time.time() - start_time
        
        result = {
            'file_id': str(file_id),
            'filename': filename,
            'status': 'success',
            'chunks_stored': chunks_stored,
            'duration': duration,
            'storage_type': storage_type
        }
        
        logger.info(f"✓ Processed {filename}: {chunks_stored} chunks in {duration:.2f}s")
        return result
        
    except Exception as e:
        duration = time.time() - start_time
        error_msg = str(e)
        
        result = {
            'file_id': str(file_id),
            'filename': filename,
            'status': 'error',
            'error': error_msg,
            'duration': duration,
            'storage_type': storage_type
        }
        
        logger.error(f"✗ Failed to process {filename}: {error_msg}")
        logger.error(traceback.format_exc())
        return result
        
    finally:
        db_session.close()

def check_vector_index_needed(total_chunks: int) -> bool:
    """Check if we need to create vector indexes."""
    if total_chunks < 100:
        logger.info(f"Only {total_chunks} chunks - vector index not needed yet")
        return False
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check if vector indexes already exist
            cur.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'FileChunk' 
                AND (indexdef LIKE '%hnsw%' OR indexdef LIKE '%ivfflat%')
            """)
            
            existing_indexes = cur.fetchall()
            
            if existing_indexes:
                logger.info(f"Vector indexes already exist: {[idx['indexname'] for idx in existing_indexes]}")
                return False
            else:
                logger.info(f"No vector indexes found - will create after processing")
                return True
    finally:
        conn.close()

def create_vector_index():
    """Create vector index after processing files."""
    logger.info("Creating vector index...")
    
    conn = get_connection()
    conn.autocommit = True
    
    try:
        with conn.cursor() as cur:
            # Get chunk count for optimal lists parameter
            cur.execute('SELECT COUNT(*) FROM "FileChunk"')
            chunk_count = cur.fetchone()[0]
            
            # Calculate optimal lists parameter for ivfflat
            lists = max(10, min(1000, int((chunk_count / 1000) ** 0.5 * 50)))
            
            logger.info(f"Creating vector index for {chunk_count} chunks...")
            
            # Try HNSW first (better performance)
            try:
                cur.execute("""
                    CREATE INDEX CONCURRENTLY idx_filechunk_embedding_hnsw 
                    ON "FileChunk" 
                    USING hnsw (embedding vector_cosine_ops) 
                    WITH (m = 16, ef_construction = 64)
                """)
                logger.info("✓ HNSW vector index created")
                return True
                
            except Exception as e:
                logger.warning(f"HNSW failed ({e}), trying ivfflat...")
                
                try:
                    cur.execute(f"""
                        CREATE INDEX CONCURRENTLY idx_filechunk_embedding_ivfflat
                        ON "FileChunk" 
                        USING ivfflat (embedding vector_cosine_ops) 
                        WITH (lists = {lists})
                    """)
                    logger.info(f"✓ IVFFlat vector index created with lists={lists}")
                    return True
                    
                except Exception as e2:
                    logger.error(f"✗ Failed to create vector index: {e2}")
                    return False
                    
    except Exception as e:
        logger.error(f"✗ Error creating vector index: {e}")
        return False
    finally:
        conn.close()

def main():
    """Main reprocessing function."""
    print("=== File Reprocessing Script ===")
    print(f"Started at: {datetime.now()}")
    
    try:
        # Get unprocessed files
        unprocessed_files = get_unprocessed_files()
        
        if not unprocessed_files:
            print("✅ All files are already processed!")
            return
        
        print(f"\n📁 Found {len(unprocessed_files)} files to process:")
        for file_info in unprocessed_files:
            storage = file_info.get('storage_type', 'database')
            storage_info = f" [S3: {file_info['s3_key'][:30]}...]" if storage == 's3' else " [Database]"
            print(f"  - {file_info['filename']} ({file_info['course_title']} / {file_info['module_title']}){storage_info}")
        
        # Confirm processing
        response = input(f"\nProcess {len(unprocessed_files)} files? (yes/no): ")
        if response.lower() != 'yes':
            print("Processing cancelled.")
            return
        
        # Process files
        print(f"\n🚀 Processing {len(unprocessed_files)} files...")
        results = []
        total_chunks = 0
        
        for i, file_info in enumerate(unprocessed_files, 1):
            print(f"\n[{i}/{len(unprocessed_files)}] Processing {file_info['filename']}...")
            
            result = process_file(file_info)
            results.append(result)
            
            if result['status'] == 'success':
                total_chunks += result['chunks_stored']
        
        # Summary
        successful = sum(1 for r in results if r['status'] == 'success')
        failed = sum(1 for r in results if r['status'] == 'error')
        s3_files = sum(1 for r in results if r.get('storage_type') == 's3')
        db_files = sum(1 for r in results if r.get('storage_type') != 's3')
        
        print(f"\n📊 Processing Summary:")
        print(f"  Total files: {len(results)}")
        print(f"  Successful: {successful}")
        print(f"  Failed: {failed}")
        print(f"  Total chunks created: {total_chunks}")
        print(f"  Storage breakdown: {s3_files} S3 files, {db_files} database files")
        
        if failed > 0:
            print(f"\n❌ Failed files:")
            for result in results:
                if result['status'] == 'error':
                    print(f"  - {result['filename']}: {result['error']}")
        
        # Create vector index if needed
        if total_chunks >= 100:
            print(f"\n🔍 Creating vector index for {total_chunks} chunks...")
            if create_vector_index():
                print("✅ Vector index created successfully!")
            else:
                print("⚠️  Vector index creation failed - you may need to create it manually")
        
        print(f"\n✅ Reprocessing completed!")
        print("Next steps:")
        print("1. Run monitoring script: python3 monitor_pgvector.py")
        print("2. Test AI features with the processed content")
        
    except Exception as e:
        print(f"\n❌ Reprocessing failed: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)
    
    print(f"\nCompleted at: {datetime.now()}")

if __name__ == "__main__":
    main() 
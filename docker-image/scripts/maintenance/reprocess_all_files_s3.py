#!/usr/bin/env python3
"""
Reprocess all existing files to generate vector embeddings.
Enhanced version that handles both database and S3-stored files.
Run this after the pgvector migration to populate FileChunk table.
"""
import os
import sys
import time
import logging
import traceback
import boto3
from datetime import datetime
from typing import List, Dict, Any
from io import BytesIO

import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add src to path for imports
sys.path.append('/app/src' if os.path.exists('/app/src') else os.path.dirname(__file__))

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
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def get_sqlalchemy_session():
    """Get SQLAlchemy session."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not set")
    
    engine = create_engine(database_url, pool_pre_ping=True)
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
                    c.title as course_title,
                    m.course_id,
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

def download_s3_file(s3_key: str, s3_bucket: str = None) -> bytes:
    """Download file content from S3."""
    try:
        # Use the configured S3 bucket if not provided
        if not s3_bucket:
            s3_bucket = os.getenv('S3_BUCKET_NAME', 'linkx-files')
        
        # Use s3_storage if available, otherwise create client
        if hasattr(s3_storage, 's3_client'):
            response = s3_storage.s3_client.get_object(
                Bucket=s3_bucket,
                Key=s3_key
            )
        else:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            response = s3_client.get_object(
                Bucket=s3_bucket,
                Key=s3_key
            )
        
        return response['Body'].read()
    except Exception as e:
        logger.error(f"Failed to download S3 file {s3_key}: {e}")
        raise

def process_file(file_info: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single file and generate embeddings."""
    file_id = file_info['id']
    filename = file_info['filename']
    storage_type = file_info.get('storage_type', 'database')
    
    logger.info(f"Processing file: {filename} ({file_id}) - Storage: {storage_type}")
    
    db_session = get_sqlalchemy_session()
    start_time = time.time()
    
    try:
        # Handle S3 files
        s3_content = None
        if storage_type == 's3' and file_info.get('s3_key'):
            logger.info(f"Downloading file from S3: {file_info['s3_key']}")
            s3_content = download_s3_file(
                file_info['s3_key'], 
                file_info.get('s3_bucket')
            )
            logger.info(f"Downloaded {len(s3_content)} bytes from S3")
        
        # Use the existing indexer function
        chunks_stored = store_file_embeddings(
            db_session, 
            str(file_id), 
            s3_content=s3_content
        )
        
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
            chunk_count = cur.fetchone()['count']
            
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
    print("=== Enhanced File Reprocessing Script (with S3 support) ===")
    print(f"Started at: {datetime.now()}")
    
    # Check S3 configuration
    use_s3 = os.getenv('USE_S3_STORAGE', 'false').lower() == 'true'
    if use_s3:
        print(f"✅ S3 storage enabled - Bucket: {os.getenv('S3_BUCKET_NAME')}")
    else:
        print("ℹ️  S3 storage disabled - using database storage only")
    
    try:
        # Get unprocessed files
        unprocessed_files = get_unprocessed_files()
        
        if not unprocessed_files:
            print("✅ All files are already processed!")
            return
        
        print(f"\n📁 Found {len(unprocessed_files)} files to process:")
        
        # Count storage types
        s3_files = sum(1 for f in unprocessed_files if f.get('storage_type') == 's3')
        db_files = len(unprocessed_files) - s3_files
        
        print(f"  Storage: {db_files} in database, {s3_files} in S3")
        
        for file_info in unprocessed_files:
            storage_icon = "☁️" if file_info.get('storage_type') == 's3' else "💾"
            print(f"  {storage_icon} {file_info['filename']} ({file_info['course_title']} / {file_info['module_title']})")
        
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
        s3_processed = sum(1 for r in results if r.get('storage_type') == 's3' and r['status'] == 'success')
        db_processed = successful - s3_processed
        
        print(f"\n📊 Processing Summary:")
        print(f"  Total files: {len(results)}")
        print(f"  Successful: {successful} ({db_processed} database, {s3_processed} S3)")
        print(f"  Failed: {failed}")
        print(f"  Total chunks created: {total_chunks}")
        
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
        print("\nNext steps:")
        print("1. Run monitoring script: python3 monitor_pgvector.py")
        print("2. Test AI features with the processed content")
        print("3. Verify S3 file access if using S3 storage")
        
    except Exception as e:
        print(f"\n❌ Reprocessing failed: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)
    
    print(f"\nCompleted at: {datetime.now()}")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Storage Audit Script - Checks data distribution across components
Ensures proper separation of concerns:
- S3: File binary data
- PostgreSQL: Metadata, relationships
- pgvector: Text chunks and embeddings
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
from datetime import datetime
from typing import Dict, List, Any
import json

def get_connection():
    """Get database connection from environment."""
    postgres_url = os.getenv("POSTGRES_URL")
    if not postgres_url:
        raise RuntimeError("POSTGRES_URL not set")
    return psycopg2.connect(postgres_url, cursor_factory=RealDictCursor)

def check_s3_configuration():
    """Check S3 configuration and connectivity."""
    print("\n🔍 Checking S3 Configuration...")
    
    use_s3 = os.getenv('USE_S3_STORAGE', 'false').lower() == 'true'
    s3_bucket = os.getenv('S3_BUCKET_NAME')
    aws_region = os.getenv('AWS_REGION', 'us-east-1')
    
    print(f"  USE_S3_STORAGE: {use_s3}")
    print(f"  S3_BUCKET_NAME: {s3_bucket}")
    print(f"  AWS_REGION: {aws_region}")
    
    if use_s3:
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=aws_region
            )
            
            # Test S3 access
            s3_client.head_bucket(Bucket=s3_bucket)
            print(f"  ✅ S3 bucket '{s3_bucket}' is accessible")
            
            # Count objects
            paginator = s3_client.get_paginator('list_objects_v2')
            total_objects = 0
            total_size = 0
            
            for page in paginator.paginate(Bucket=s3_bucket):
                if 'Contents' in page:
                    total_objects += len(page['Contents'])
                    total_size += sum(obj['Size'] for obj in page['Contents'])
            
            print(f"  📊 S3 Statistics:")
            print(f"     - Total objects: {total_objects}")
            print(f"     - Total size: {total_size / (1024**3):.2f} GB")
            
            return True, total_objects, total_size
            
        except Exception as e:
            print(f"  ❌ S3 Error: {e}")
            return False, 0, 0
    else:
        print("  ℹ️  S3 storage is disabled")
        return False, 0, 0

def analyze_file_storage():
    """Analyze how files are stored across the system."""
    print("\n📁 Analyzing File Storage Distribution...")
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Get file storage statistics
            cur.execute("""
                SELECT 
                    storage_type,
                    COUNT(*) as file_count,
                    SUM(file_size) as total_size,
                    AVG(file_size) as avg_size,
                    COUNT(CASE WHEN file_data IS NOT NULL THEN 1 END) as has_binary_data,
                    COUNT(CASE WHEN s3_key IS NOT NULL THEN 1 END) as has_s3_key
                FROM "File"
                GROUP BY storage_type
                ORDER BY storage_type
            """)
            
            storage_stats = cur.fetchall()
            
            print("\n  Storage Type Distribution:")
            print("  " + "-" * 80)
            print(f"  {'Type':<15} {'Files':<10} {'Total Size':<15} {'Avg Size':<15} {'DB Binary':<12} {'S3 Key':<10}")
            print("  " + "-" * 80)
            
            total_files = 0
            total_size = 0
            
            for stat in storage_stats:
                storage_type = stat['storage_type'] or 'unknown'
                file_count = stat['file_count']
                total_file_size = stat['total_size'] or 0
                avg_size = stat['avg_size'] or 0
                has_binary = stat['has_binary_data']
                has_s3 = stat['has_s3_key']
                
                total_files += file_count
                total_size += total_file_size
                
                print(f"  {storage_type:<15} {file_count:<10} {total_file_size/(1024**2):<15.2f}MB {avg_size/(1024**2):<15.2f}MB {has_binary:<12} {has_s3:<10}")
            
            print("  " + "-" * 80)
            print(f"  {'TOTAL':<15} {total_files:<10} {total_size/(1024**2):<15.2f}MB")
            
            # Check for potential issues
            print("\n  🔍 Storage Integrity Checks:")
            
            # Check for files with both DB and S3 storage (potential duplication)
            cur.execute("""
                SELECT COUNT(*) as count
                FROM "File"
                WHERE file_data IS NOT NULL 
                AND s3_key IS NOT NULL
            """)
            dual_storage = cur.fetchone()['count']
            
            if dual_storage > 0:
                print(f"  ⚠️  WARNING: {dual_storage} files have BOTH database binary AND S3 storage!")
                print("     This is unnecessary duplication!")
            else:
                print("  ✅ No files with duplicate storage (good!)")
            
            # Check for orphaned files (no storage at all)
            cur.execute("""
                SELECT COUNT(*) as count
                FROM "File"
                WHERE file_data IS NULL 
                AND s3_key IS NULL
            """)
            orphaned = cur.fetchone()['count']
            
            if orphaned > 0:
                print(f"  ❌ ERROR: {orphaned} files have NO storage location!")
            else:
                print("  ✅ All files have storage location (good!)")
            
            # Check storage type consistency
            cur.execute("""
                SELECT 
                    COUNT(*) as count,
                    storage_type,
                    CASE 
                        WHEN s3_key IS NOT NULL THEN 's3'
                        WHEN file_data IS NOT NULL THEN 'database'
                        ELSE 'none'
                    END as actual_storage
                FROM "File"
                GROUP BY storage_type, 
                         CASE 
                             WHEN s3_key IS NOT NULL THEN 's3'
                             WHEN file_data IS NOT NULL THEN 'database'
                             ELSE 'none'
                         END
                HAVING storage_type != CASE 
                                         WHEN s3_key IS NOT NULL THEN 's3'
                                         WHEN file_data IS NOT NULL THEN 'database'
                                         ELSE 'none'
                                      END
            """)
            
            mismatched = cur.fetchall()
            if mismatched:
                print(f"  ⚠️  Storage type mismatches found:")
                for m in mismatched:
                    print(f"     - {m['count']} files marked as '{m['storage_type']}' but actually in '{m['actual_storage']}'")
            else:
                print("  ✅ Storage types are consistent (good!)")
            
            return storage_stats
            
    finally:
        conn.close()

def analyze_vector_storage():
    """Analyze vector embeddings storage."""
    print("\n🔢 Analyzing Vector Storage (pgvector)...")
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Get chunk statistics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_chunks,
                    COUNT(DISTINCT file_id) as files_with_chunks,
                    COUNT(DISTINCT course_id) as courses_with_chunks,
                    AVG(LENGTH(content)) as avg_chunk_size,
                    MIN(created_at) as oldest_chunk,
                    MAX(created_at) as newest_chunk
                FROM "FileChunk"
            """)
            
            chunk_stats = cur.fetchone()
            
            print(f"\n  Vector Storage Statistics:")
            print(f"  - Total chunks: {chunk_stats['total_chunks']}")
            print(f"  - Files with chunks: {chunk_stats['files_with_chunks']}")
            print(f"  - Courses with chunks: {chunk_stats['courses_with_chunks']}")
            if chunk_stats['avg_chunk_size']:
                print(f"  - Average chunk size: {chunk_stats['avg_chunk_size']:.0f} characters")
            if chunk_stats['oldest_chunk']:
                print(f"  - Oldest chunk: {chunk_stats['oldest_chunk']}")
                print(f"  - Newest chunk: {chunk_stats['newest_chunk']}")
            
            # Check for files without chunks
            cur.execute("""
                SELECT COUNT(*) as count
                FROM "File" f
                LEFT JOIN "FileChunk" fc ON f.id = fc.file_id
                WHERE fc.id IS NULL
                AND (f.file_data IS NOT NULL OR f.s3_key IS NOT NULL)
            """)
            
            files_without_chunks = cur.fetchone()['count']
            
            if files_without_chunks > 0:
                print(f"\n  ⚠️  {files_without_chunks} files don't have vector embeddings yet")
                print("     Run reprocessing script to generate embeddings")
            else:
                print("\n  ✅ All files have vector embeddings (good!)")
            
            # Check index status
            cur.execute("""
                SELECT 
                    indexname,
                    indexdef
                FROM pg_indexes 
                WHERE tablename = 'FileChunk' 
                AND (indexdef LIKE '%embedding%')
            """)
            
            indexes = cur.fetchall()
            
            if indexes:
                print("\n  Vector Indexes:")
                for idx in indexes:
                    print(f"  - {idx['indexname']}")
            else:
                print("\n  ⚠️  No vector indexes found - queries may be slow!")
            
            return chunk_stats
            
    finally:
        conn.close()

def check_data_flow():
    """Verify the data flow is correct."""
    print("\n🔄 Checking Data Flow Architecture...")
    
    print("\n  Expected Architecture:")
    print("  1. File Upload:")
    print("     - Binary data → S3 (if enabled) OR PostgreSQL BYTEA")
    print("     - Metadata → PostgreSQL tables")
    print("     - Text extraction → Chunks → pgvector embeddings")
    
    print("\n  2. File Retrieval:")
    print("     - Metadata from PostgreSQL")
    print("     - Binary from S3 (presigned URL) OR PostgreSQL")
    print("     - AI search via pgvector similarity")
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Sample recent file uploads
            cur.execute("""
                SELECT 
                    f.id,
                    f.filename,
                    f.file_type,
                    f.file_size,
                    f.storage_type,
                    f.s3_key,
                    CASE WHEN f.file_data IS NOT NULL THEN 'YES' ELSE 'NO' END as has_db_binary,
                    COUNT(fc.id) as chunk_count
                FROM "File" f
                LEFT JOIN "FileChunk" fc ON f.id = fc.file_id
                WHERE f.created_at > NOW() - INTERVAL '7 days'
                GROUP BY f.id
                ORDER BY f.created_at DESC
                LIMIT 5
            """)
            
            recent_files = cur.fetchall()
            
            if recent_files:
                print("\n  Recent Files (last 7 days):")
                print("  " + "-" * 100)
                print(f"  {'Filename':<30} {'Type':<15} {'Storage':<10} {'DB Binary':<10} {'S3 Key':<20} {'Chunks':<10}")
                print("  " + "-" * 100)
                
                for f in recent_files:
                    s3_key = f['s3_key'][:20] + '...' if f['s3_key'] and len(f['s3_key']) > 20 else f['s3_key'] or 'None'
                    print(f"  {f['filename'][:30]:<30} {f['file_type'][:15]:<15} {f['storage_type']:<10} {f['has_db_binary']:<10} {s3_key:<20} {f['chunk_count']:<10}")
            
    finally:
        conn.close()

def generate_recommendations():
    """Generate recommendations based on findings."""
    print("\n💡 Recommendations:")
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check current configuration
            use_s3 = os.getenv('USE_S3_STORAGE', 'false').lower() == 'true'
            
            # Get storage statistics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_files,
                    SUM(file_size) as total_size,
                    COUNT(CASE WHEN storage_type = 's3' THEN 1 END) as s3_files,
                    COUNT(CASE WHEN storage_type = 'database' THEN 1 END) as db_files,
                    COUNT(CASE WHEN file_data IS NOT NULL AND s3_key IS NOT NULL THEN 1 END) as duplicate_storage
                FROM "File"
            """)
            
            stats = cur.fetchone()
            
            if stats['duplicate_storage'] > 0:
                print("\n  🚨 CRITICAL: Remove duplicate storage!")
                print(f"     - {stats['duplicate_storage']} files are stored in BOTH database and S3")
                print("     - Run migration script to move to single storage location")
            
            if use_s3 and stats['db_files'] > 0:
                print(f"\n  📦 Migrate {stats['db_files']} database files to S3:")
                print("     - Run: python3 migrate_files_to_s3.py")
                print("     - This will free up database space")
            
            if not use_s3 and stats['total_size'] > 1024**3:  # > 1GB
                print(f"\n  ☁️  Consider enabling S3 storage:")
                print(f"     - Current database storage: {stats['total_size']/(1024**3):.2f} GB")
                print("     - S3 provides better scalability and performance")
            
            # Check for missing embeddings
            cur.execute("""
                SELECT COUNT(*) as count
                FROM "File" f
                LEFT JOIN "FileChunk" fc ON f.id = fc.file_id
                WHERE fc.id IS NULL
                AND (f.file_data IS NOT NULL OR f.s3_key IS NOT NULL)
            """)
            
            missing_embeddings = cur.fetchone()['count']
            
            if missing_embeddings > 0:
                print(f"\n  🔄 Generate embeddings for {missing_embeddings} files:")
                print("     - Run: ./run_reprocessing.sh")
            
    finally:
        conn.close()

def main():
    """Main audit function."""
    print("=" * 100)
    print("🔍 LINK-X Storage Architecture Audit")
    print("=" * 100)
    print(f"Started at: {datetime.now()}")
    
    try:
        # 1. Check S3 configuration
        s3_enabled, s3_objects, s3_size = check_s3_configuration()
        
        # 2. Analyze file storage
        storage_stats = analyze_file_storage()
        
        # 3. Analyze vector storage
        chunk_stats = analyze_vector_storage()
        
        # 4. Check data flow
        check_data_flow()
        
        # 5. Generate recommendations
        generate_recommendations()
        
        print("\n" + "=" * 100)
        print("✅ Audit Complete!")
        print("=" * 100)
        
    except Exception as e:
        print(f"\n❌ Audit failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print(f"\nCompleted at: {datetime.now()}")

if __name__ == "__main__":
    main()
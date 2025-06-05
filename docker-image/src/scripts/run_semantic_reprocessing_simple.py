#!/usr/bin/env python
"""
Simple semantic reprocessing script that uses direct database connection.
"""
import os
import sys
import logging
import psycopg2
import json
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get direct database connection"""
    # Load from parent directory .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
    load_dotenv(env_path)
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL not found in environment")
        return None
    return psycopg2.connect(database_url)

def check_current_status():
    """Check current chunking status"""
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cur = conn.cursor()
        
        # Get statistics
        cur.execute("""
            SELECT 
                COUNT(*) as total_chunks,
                COUNT(DISTINCT file_id) as total_files,
                COUNT(CASE WHEN chunk_metadata IS NOT NULL THEN 1 END) as chunks_with_metadata,
                COUNT(DISTINCT CASE WHEN chunk_metadata IS NOT NULL THEN file_id END) as files_with_metadata
            FROM "FileChunk"
        """)
        
        stats = cur.fetchone()
        
        logger.info("\n=== Current Chunking Status ===")
        logger.info(f"Total chunks: {stats[0]:,}")
        logger.info(f"Total files: {stats[1]:,}")
        logger.info(f"Chunks with metadata: {stats[2]:,} ({stats[2]/max(stats[0],1)*100:.1f}%)")
        logger.info(f"Files with semantic chunks: {stats[3]:,} ({stats[3]/max(stats[1],1)*100:.1f}%)")
        
        # Get sample metadata
        cur.execute("""
            SELECT chunk_metadata 
            FROM "FileChunk" 
            WHERE chunk_metadata IS NOT NULL 
            LIMIT 1
        """)
        
        sample = cur.fetchone()
        if sample and sample[0]:
            logger.info("\nSample metadata:")
            logger.info(json.dumps(sample[0], indent=2))
        else:
            logger.info("\nNo semantic metadata found yet.")
        
        # Get files needing processing
        cur.execute("""
            SELECT DISTINCT f.id, f.title
            FROM "File" f
            JOIN "FileChunk" fc ON f.id = fc.file_id
            WHERE fc.chunk_metadata IS NULL
            LIMIT 10
        """)
        
        files_needing_processing = cur.fetchall()
        
        if files_needing_processing:
            logger.info(f"\nFiles needing semantic processing (showing first 10):")
            for file_id, title in files_needing_processing:
                logger.info(f"  - {title} (ID: {file_id})")
        else:
            logger.info("\n✓ All files have semantic metadata!")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"Error checking status: {e}")
        if conn:
            conn.close()

def process_specific_file(file_id):
    """Process a specific file with semantic chunking"""
    logger.info(f"\nProcessing file {file_id}...")
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cur = conn.cursor()
        
        # Get file info
        cur.execute("""
            SELECT f.title, f.file_type, f.transcription, f.storage_type, f.s3_key, f.module_id
            FROM "File" f
            WHERE f.id = %s
        """, (file_id,))
        
        file_info = cur.fetchone()
        if not file_info:
            logger.error(f"File {file_id} not found")
            return
        
        title, file_type, transcription, storage_type, s3_key, module_id = file_info
        logger.info(f"File: {title} (Type: {file_type})")
        
        # Get course_id from module
        course_id = None
        if module_id:
            cur.execute('SELECT course_id FROM "Module" WHERE id = %s', (module_id,))
            result = cur.fetchone()
            if result:
                course_id = result[0]
        
        # Get existing chunks
        cur.execute("""
            SELECT chunk_index, content
            FROM "FileChunk"
            WHERE file_id = %s
            ORDER BY chunk_index
        """, (file_id,))
        
        chunks = cur.fetchall()
        logger.info(f"Found {len(chunks)} existing chunks")
        
        if not chunks:
            logger.warning("No chunks found for this file")
            return
        
        # Process chunks with semantic metadata
        # Since we can't use the full semantic chunker without dependencies,
        # we'll add basic metadata based on content analysis
        
        for chunk_index, content in chunks:
            # Basic content analysis
            metadata = analyze_chunk_content(content)
            
            # Update chunk with metadata
            cur.execute("""
                UPDATE "FileChunk"
                SET chunk_metadata = %s
                WHERE file_id = %s AND chunk_index = %s
            """, (json.dumps(metadata), file_id, chunk_index))
        
        conn.commit()
        logger.info(f"✓ Added metadata to {len(chunks)} chunks")
        
        # Show sample of what was added
        if chunks:
            sample_metadata = analyze_chunk_content(chunks[0][1])
            logger.info("\nSample metadata added:")
            logger.info(json.dumps(sample_metadata, indent=2))
        
        cur.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        if conn:
            conn.rollback()
            conn.close()

def analyze_chunk_content(content):
    """Basic content analysis to generate metadata"""
    content_lower = content.lower()
    
    # Determine chunk type
    chunk_type = 'explanation'  # default
    
    if any(phrase in content_lower for phrase in ['is defined as', 'refers to', 'means', 'definition:']):
        chunk_type = 'definition'
    elif any(phrase in content_lower for phrase in ['for example', 'for instance', 'such as', 'e.g.']):
        chunk_type = 'example'
    elif any(phrase in content_lower for phrase in ['introduction', 'overview', 'summary', 'in this']):
        chunk_type = 'introduction'
    elif any(phrase in content_lower for phrase in ['in conclusion', 'to summarize', 'key takeaway']):
        chunk_type = 'conclusion'
    
    # Extract concepts (simple keyword extraction)
    import re
    concepts = []
    
    # Look for capitalized terms (potential concepts)
    capitalized = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
    concepts.extend([term for term in capitalized if len(term) > 3 and term.lower() not in ['the', 'this', 'that']])
    
    # Look for quoted terms
    quoted = re.findall(r'["\']([^"\'\']+)["\']', content)
    concepts.extend([term for term in quoted if 3 < len(term) < 50])
    
    # Deduplicate
    concepts = list(set(concepts))[:10]
    
    # Determine hierarchy level (basic heuristic)
    hierarchy_level = 3  # default paragraph level
    if re.match(r'^#+\s', content):  # Markdown header
        hierarchy_level = len(re.match(r'^(#+)', content).group(1)) - 1
    elif re.match(r'^\d+\.\s', content):  # Numbered section
        hierarchy_level = 1
    
    return {
        'chunk_type': chunk_type,
        'hierarchy_level': hierarchy_level,
        'concepts': concepts,
        'processed_with': 'basic_analyzer_v1',
        'processed_at': str(json.dumps(None, default=str))  # timestamp
    }

def process_all_files():
    """Process all files needing semantic metadata"""
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cur = conn.cursor()
        
        # Get files needing processing
        cur.execute("""
            SELECT DISTINCT f.id, f.title
            FROM "File" f
            JOIN "FileChunk" fc ON f.id = fc.file_id
            WHERE fc.chunk_metadata IS NULL
            LIMIT 10
        """)
        
        files = cur.fetchall()
        cur.close()
        conn.close()
        
        if not files:
            logger.info("No files need processing!")
            return
        
        logger.info(f"\nProcessing {len(files)} files...")
        
        for file_id, title in files:
            logger.info(f"\n{'='*60}")
            process_specific_file(file_id)
        
        logger.info(f"\n{'='*60}")
        logger.info("✓ Processing complete!")
        
        # Show updated stats
        check_current_status()
        
    except Exception as e:
        logger.error(f"Error in batch processing: {e}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Semantic reprocessing for FileChunks')
    parser.add_argument('--check-only', action='store_true', help='Only check current status')
    parser.add_argument('--file-id', type=str, help='Process specific file ID')
    parser.add_argument('--all', action='store_true', help='Process all files (10 at a time)')
    
    args = parser.parse_args()
    
    if args.check_only:
        check_current_status()
    elif args.file_id:
        process_specific_file(args.file_id)
        check_current_status()
    elif args.all:
        process_all_files()
    else:
        logger.info("Usage:")
        logger.info("  --check-only    Check current status")
        logger.info("  --file-id ID    Process specific file")
        logger.info("  --all           Process all files needing metadata")
        logger.info("\nStarting with status check...")
        check_current_status()
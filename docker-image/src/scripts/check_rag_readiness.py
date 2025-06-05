#!/usr/bin/env python
"""
Diagnostic script to verify RAG system readiness.
Checks if FileChunks have real embeddings and proper metadata.
"""
import os
import sys
import psycopg2
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_rag_readiness():
    """Comprehensive RAG system diagnostic"""
    
    print("=" * 60)
    print("RAG SYSTEM DIAGNOSTIC REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    try:
        # Get database URL from environment
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            print("ERROR: DATABASE_URL environment variable not set")
            print("Please run: source .env or export DATABASE_URL=...")
            return False
            
        # Connect to database
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # 1. Check total chunks
        print("\n1. FILE CHUNK STATISTICS:")
        cur.execute("""
            SELECT 
                COUNT(*) as total_chunks,
                COUNT(DISTINCT file_id) as total_files,
                COUNT(DISTINCT course_id) as total_courses
            FROM "FileChunk"
        """)
        stats = cur.fetchone()
        print(f"   Total chunks: {stats[0]:,}")
        print(f"   Total files: {stats[1]:,}")
        print(f"   Total courses: {stats[2]:,}")
        
        # 2. Check embedding quality
        print("\n2. EMBEDDING QUALITY CHECK:")
        
        # Check for placeholder embeddings (all zeros)
        cur.execute("""
            SELECT COUNT(*) as placeholder_count
            FROM "FileChunk"
            WHERE embedding[1] = 0 AND embedding[2] = 0 AND embedding[3] = 0
        """)
        placeholder_count = cur.fetchone()[0]
        
        # Check for real embeddings
        cur.execute("""
            SELECT COUNT(*) as real_embeddings
            FROM "FileChunk"
            WHERE embedding[1] != 0 OR embedding[2] != 0 OR embedding[3] != 0
        """)
        real_count = cur.fetchone()[0]
        
        print(f"   Real embeddings: {real_count:,} ({real_count/max(stats[0],1)*100:.1f}%)")
        print(f"   Placeholder embeddings: {placeholder_count:,} ({placeholder_count/max(stats[0],1)*100:.1f}%)")
        
        if placeholder_count > 0:
            print("   ⚠️  WARNING: Found placeholder embeddings!")
        else:
            print("   ✅ All embeddings are real")
        
        # 3. Check metadata population
        print("\n3. METADATA QUALITY:")
        cur.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE chunk_metadata IS NOT NULL) as has_metadata,
                COUNT(*) FILTER (WHERE chunk_metadata IS NULL) as no_metadata,
                COUNT(*) FILTER (WHERE chunk_metadata::text LIKE '%chunk_type%') as has_type,
                COUNT(*) FILTER (WHERE chunk_metadata::text LIKE '%concepts%') as has_concepts
            FROM "FileChunk"
        """)
        metadata_stats = cur.fetchone()
        
        print(f"   Has metadata: {metadata_stats[0]:,} ({metadata_stats[0]/max(stats[0],1)*100:.1f}%)")
        print(f"   No metadata: {metadata_stats[1]:,}")
        print(f"   Has chunk_type: {metadata_stats[2]:,}")
        print(f"   Has concepts: {metadata_stats[3]:,}")
        
        # 4. Sample chunk analysis
        print("\n4. SAMPLE CHUNK ANALYSIS:")
        cur.execute("""
            SELECT 
                fc.chunk_index,
                fc.chunk_metadata,
                LENGTH(fc.content) as content_length,
                f.title as file_title,
                fc.embedding[1:5] as embedding_sample
            FROM "FileChunk" fc
            JOIN "File" f ON fc.file_id = f.id
            WHERE fc.chunk_metadata IS NOT NULL
            LIMIT 5
        """)
        
        samples = cur.fetchall()
        for i, sample in enumerate(samples):
            print(f"\n   Sample {i+1}:")
            print(f"   - File: {sample[3]}")
            print(f"   - Chunk index: {sample[0]}")
            print(f"   - Content length: {sample[2]} chars")
            print(f"   - Embedding sample: {sample[4]}")
            if sample[1]:
                print(f"   - Metadata: {json.dumps(sample[1], indent=6)[:200]}...")
        
        # 5. Course ID coverage
        print("\n5. COURSE COVERAGE:")
        cur.execute("""
            SELECT 
                c.title,
                COUNT(fc.id) as chunk_count,
                COUNT(DISTINCT fc.file_id) as file_count
            FROM "Course" c
            LEFT JOIN "FileChunk" fc ON fc.course_id = c.id
            GROUP BY c.id, c.title
            ORDER BY chunk_count DESC
            LIMIT 5
        """)
        
        courses = cur.fetchall()
        for course in courses:
            print(f"   - {course[0]}: {course[1]:,} chunks from {course[2]} files")
        
        # 6. Vector search test
        print("\n6. VECTOR SEARCH TEST:")
        cur.execute("""
            SELECT COUNT(*) 
            FROM "FileChunk" 
            WHERE embedding IS NOT NULL 
            LIMIT 1
        """)
        
        if cur.fetchone()[0] > 0:
            # Test a simple vector search
            cur.execute("""
                SELECT 
                    fc.chunk_index,
                    1 - (fc.embedding <=> (SELECT embedding FROM "FileChunk" LIMIT 1)) as similarity
                FROM "FileChunk" fc
                WHERE fc.embedding IS NOT NULL
                ORDER BY fc.embedding <=> (SELECT embedding FROM "FileChunk" LIMIT 1)
                LIMIT 3
            """)
            
            similar = cur.fetchall()
            print("   Vector search working: ✅")
            print("   Sample similarities:")
            for s in similar:
                print(f"   - Chunk {s[0]}: {s[1]:.4f} similarity")
        else:
            print("   Vector search: ❌ No embeddings found")
        
        # 7. Recommendations
        print("\n7. RECOMMENDATIONS:")
        if placeholder_count > 0:
            print("   🔧 Replace placeholder embeddings with real ones")
            print("      Run: python src/scripts/reprocess_embeddings.py")
        
        if metadata_stats[1] > stats[0] * 0.1:  # More than 10% without metadata
            print("   🔧 Add semantic metadata to chunks")
            print("      Run: process_file_with_semantic_chunking()")
        
        if real_count == stats[0] and metadata_stats[0] > stats[0] * 0.8:
            print("   ✅ RAG system is ready for use!")
        else:
            print("   ⚠️  RAG system needs preparation before use")
        
        print("\n" + "=" * 60)
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"\nERROR: {e}")
        print("Make sure the database is accessible and migrations are up to date.")
        return False
    
    return True


if __name__ == "__main__":
    check_rag_readiness()
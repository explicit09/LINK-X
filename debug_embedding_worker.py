#!/usr/bin/env python3
"""
Debug script to test and fix the embedding worker issue
"""
import asyncio
import asyncpg
import os
import sys
import json

# Add the src directory to Python path
sys.path.insert(0, 'docker-image/src')

async def test_embedding_worker():
    """Test the exact issue with the embedding worker"""
    
    # Get database URL
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment")
        return
    
    print("🔧 Testing embedding worker issue...")
    
    try:
        # Create connection pool
        pool = await asyncpg.create_pool(
            database_url,
            min_size=1,
            max_size=2,
            statement_cache_size=0  # Disable for PgBouncer
        )
        
        async with pool.acquire() as conn:
            # 1. Check current embedding jobs
            jobs = await conn.fetch(
                "SELECT id, chunk_id, status FROM embedding_jobs WHERE status = 'pending' LIMIT 5"
            )
            
            print(f"📊 Found {len(jobs)} pending embedding jobs")
            
            if not jobs:
                print("❌ No pending jobs to test with")
                return
            
            # 2. Test the problematic query pattern
            print("🧪 Testing chunk_ids array query...")
            
            chunk_ids = [job['chunk_id'] for job in jobs]
            print(f"chunk_ids type: {type(chunk_ids)}")
            print(f"chunk_ids[0] type: {type(chunk_ids[0])}")
            print(f"chunk_ids sample: {chunk_ids[:2]}")
            
            # This is the query that's causing issues
            chunks = await conn.fetch(
                """
                SELECT id, content 
                FROM file_chunks 
                WHERE id = ANY($1::uuid[])
                """,
                chunk_ids
            )
            
            print(f"✅ Query worked! Got {len(chunks)} chunks")
            
            # 3. Test a simple embedding job completion
            if chunks:
                # Create a dummy embedding
                dummy_embedding = [0.1] * 1536  # Standard embedding size
                embedding_str = f"[{','.join(map(str, dummy_embedding))}]"
                
                print("🧪 Testing embedding storage...")
                
                job_id = jobs[0]['id']
                
                # Test the complete_embedding_job function
                await conn.execute(
                    """
                    SELECT complete_embedding_job($1, $2::vector, $3)
                    """,
                    job_id,
                    embedding_str,
                    'text-embedding-3-small'
                )
                
                print("✅ Embedding storage test successful!")
                
                # Check if it actually worked
                result = await conn.fetchrow(
                    "SELECT status FROM embedding_jobs WHERE id = $1",
                    job_id
                )
                
                print(f"📊 Job status after completion: {result['status']}")
                
        await pool.close()
        print("🎉 All tests passed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_embedding_worker()) 
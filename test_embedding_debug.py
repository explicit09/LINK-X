#!/usr/bin/env python3
"""
Comprehensive test to debug the embedding worker issue
"""
import asyncio
import asyncpg
import os
import sys
import traceback
import json

# Add the src directory to Python path
sys.path.insert(0, 'docker-image/src')

async def test_embedding_worker_step_by_step():
    """Test each step of the embedding worker process to find the exact error"""
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment")
        return
    
    print("🔧 Testing embedding worker step by step...")
    
    try:
        # Create connection pool
        pool = await asyncpg.create_pool(
            database_url,
            min_size=1,
            max_size=2,
            statement_cache_size=0  # Disable for PgBouncer
        )
        
        async with pool.acquire() as conn:
            print("✅ Database connection successful")
            
            # Step 1: Test claiming jobs
            print("\n1. Testing claim_embedding_jobs function...")
            try:
                jobs = await conn.fetch("SELECT * FROM claim_embedding_jobs('test-worker', 2)")
                print(f"   ✅ Claimed {len(jobs)} jobs")
                for job in jobs:
                    print(f"   Job: {job['job_id']}, Chunk: {job['chunk_id']}")
                    print(f"   Types: job_id={type(job['job_id'])}, chunk_id={type(job['chunk_id'])}")
            except Exception as e:
                print(f"   ❌ Error claiming jobs: {e}")
                traceback.print_exc()
                return
            
            if not jobs:
                print("   ⚠️  No jobs available to test")
                return
            
            # Step 2: Test getting chunk content
            print("\n2. Testing chunk content retrieval...")
            try:
                chunk_id = jobs[0]['chunk_id']
                chunk_data = await conn.fetchrow(
                    "SELECT id, content FROM file_chunks WHERE id = $1",
                    chunk_id
                )
                if chunk_data:
                    print(f"   ✅ Retrieved chunk content: {len(chunk_data['content'])} characters")
                    print(f"   Content preview: {chunk_data['content'][:100]}...")
                else:
                    print(f"   ❌ No chunk found for ID: {chunk_id}")
                    return
            except Exception as e:
                print(f"   ❌ Error retrieving chunk: {e}")
                traceback.print_exc()
                return
            
            # Step 3: Test creating job_chunk_pairs (this might be where the error occurs)
            print("\n3. Testing job_chunk_pairs creation...")
            try:
                job_chunk_pairs = []
                texts = []
                
                for job in jobs:
                    job_id = job['job_id']
                    chunk_id = job['chunk_id']
                    
                    print(f"   Processing job_id: {job_id} (type: {type(job_id)})")
                    print(f"   Processing chunk_id: {chunk_id} (type: {type(chunk_id)})")
                    
                    # Convert to strings (this is the fix I tried)
                    job_id_str = str(job_id)
                    chunk_id_str = str(chunk_id)
                    
                    print(f"   Converted job_id: {job_id_str} (type: {type(job_id_str)})")
                    print(f"   Converted chunk_id: {chunk_id_str} (type: {type(chunk_id_str)})")
                    
                    # Create the tuple
                    pair = (job_id_str, chunk_id_str)
                    print(f"   Created pair: {pair} (type: {type(pair)})")
                    
                    job_chunk_pairs.append(pair)
                    texts.append(chunk_data['content'])
                
                print(f"   ✅ Created {len(job_chunk_pairs)} job_chunk_pairs")
                print(f"   job_chunk_pairs: {job_chunk_pairs}")
                
            except Exception as e:
                print(f"   ❌ Error creating job_chunk_pairs: {e}")
                traceback.print_exc()
                return
            
            # Step 4: Test the zip operation (this might be the issue)
            print("\n4. Testing zip operation...")
            try:
                # Simulate embeddings (list of lists of floats)
                fake_embeddings = [[0.1, 0.2, 0.3] for _ in range(len(job_chunk_pairs))]
                print(f"   Created {len(fake_embeddings)} fake embeddings")
                
                # Test the zip operation that's failing
                for i, ((job_id, chunk_id), embedding) in enumerate(zip(job_chunk_pairs, fake_embeddings)):
                    print(f"   Iteration {i}: job_id={job_id}, chunk_id={chunk_id}, embedding_len={len(embedding)}")
                    
                    # Test if we can use these in a dictionary (this might trigger the error)
                    test_dict = {
                        'job_id': job_id,
                        'chunk_id': chunk_id,
                        'embedding': embedding
                    }
                    print(f"   ✅ Created test dict: {list(test_dict.keys())}")
                
                print("   ✅ Zip operation successful")
                
            except Exception as e:
                print(f"   ❌ Error in zip operation: {e}")
                traceback.print_exc()
                return
            
            # Step 5: Test the database function call
            print("\n5. Testing complete_embedding_job function...")
            try:
                job_id = job_chunk_pairs[0][0]
                chunk_id = job_chunk_pairs[0][1]
                embedding = fake_embeddings[0]
                
                # Convert to pgvector format
                embedding_str = f"[{','.join(map(str, embedding))}]"
                print(f"   Embedding string: {embedding_str}")
                
                # Test the database function call
                await conn.execute(
                    "SELECT complete_embedding_job($1, $2::vector, $3)",
                    job_id,
                    embedding_str,
                    'text-embedding-3-small'
                )
                
                print("   ✅ Database function call successful")
                
            except Exception as e:
                print(f"   ❌ Error in database function: {e}")
                traceback.print_exc()
                return
            
            print("\n🎉 All tests passed! The issue might be elsewhere.")
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_embedding_worker_step_by_step()) 
#!/usr/bin/env python3
"""
Test script to debug the embedding worker issue
"""
import sys
import os
import traceback

# Add the src directory to Python path
sys.path.insert(0, '/app/src')

def test_embedding_issue():
    """Test the embedding worker issue"""
    
    try:
        print("🔧 Testing embedding worker issue...")
        
        # Test 1: Basic database connection
        print("1. Testing database connection...")
        from core.database_supabase import db_manager
        
        with db_manager.get_session() as session:
            result = session.execute("SELECT COUNT(*) FROM embedding_jobs WHERE status = 'pending'").scalar()
            print(f"   Found {result} pending embedding jobs")
            
            if result == 0:
                print("   ❌ No pending jobs to test with")
                return False
            
            # Test 2: Get a sample job
            print("2. Testing job retrieval...")
            job = session.execute(
                "SELECT id, chunk_id FROM embedding_jobs WHERE status = 'pending' LIMIT 1"
            ).fetchone()
            
            if not job:
                print("   ❌ Could not retrieve job")
                return False
                
            job_id, chunk_id = job
            print(f"   ✅ Got job: {job_id}, chunk: {chunk_id}")
            
            # Test 3: Get chunk content
            print("3. Testing chunk content retrieval...")
            chunk = session.execute(
                "SELECT content FROM file_chunks WHERE id = :chunk_id", 
                {"chunk_id": chunk_id}
            ).fetchone()
            
            if not chunk:
                print("   ❌ No chunk content found")
                return False
                
            content = chunk[0]
            print(f"   ✅ Got content, length: {len(content)}")
            
            # Test 4: Try to generate a simple embedding
            print("4. Testing OpenAI API...")
            
            # Import the rate limiter that's causing issues
            from services.openai_rate_limiter import get_rate_limiter
            rate_limiter = get_rate_limiter()
            
            print(f"   Rate limiter type: {type(rate_limiter)}")
            
            # Check if the issue is in generate_embeddings_adaptive
            import asyncio
            
            async def test_embedding_generation():
                try:
                    embeddings = await rate_limiter.generate_embeddings_adaptive(
                        [content[:500]],  # Just first 500 chars for testing
                        "text-embedding-3-small"
                    )
                    
                    if embeddings:
                        print(f"   ✅ Generated embedding, dimension: {len(embeddings[0])}")
                        return embeddings[0]
                    else:
                        print("   ❌ No embeddings returned")
                        return None
                        
                except Exception as e:
                    print(f"   ❌ Embedding generation error: {e}")
                    traceback.print_exc()
                    return None
            
            embedding = asyncio.run(test_embedding_generation())
            
            if not embedding:
                print("5. ❌ Failed to generate embedding")
                return False
            
            # Test 5: Try to store the embedding
            print("5. Testing embedding storage...")
            
            try:
                # Convert to pgvector format
                embedding_str = f"[{','.join(map(str, embedding))}]"
                
                session.execute(
                    "SELECT complete_embedding_job(:job_id, :embedding::vector, :model)",
                    {
                        "job_id": job_id,
                        "embedding": embedding_str,
                        "model": "text-embedding-3-small"
                    }
                )
                session.commit()
                
                print("   ✅ Successfully stored embedding!")
                
                # Check status
                status = session.execute(
                    "SELECT status FROM embedding_jobs WHERE id = :job_id",
                    {"job_id": job_id}
                ).scalar()
                
                print(f"   Job status after completion: {status}")
                return True
                
            except Exception as e:
                print(f"   ❌ Storage error: {e}")
                traceback.print_exc()
                return False
                
    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_embedding_issue()
    if success:
        print("🎉 All tests passed! Issue is likely in worker async handling.")
    else:
        print("❌ Tests failed. Need to investigate further.") 
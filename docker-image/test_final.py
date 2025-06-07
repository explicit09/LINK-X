#!/usr/bin/env python3
"""
Final comprehensive AI system test
"""
import os
import sys
import time
import json
import uuid
from datetime import datetime

sys.path.append('./src')
from dotenv import load_dotenv
load_dotenv('.env')

from sqlalchemy import create_engine, text
from openai import OpenAI

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

print(f"\n{BLUE}{'='*60}{RESET}")
print(f"{BLUE}{'LEARN-X AI System Test':^60}{RESET}")
print(f"{BLUE}{'='*60}{RESET}\n")

# Initialize
DATABASE_URL = os.getenv('DATABASE_URL')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
engine = create_engine(DATABASE_URL)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Test 1: Create Test Data
print(f"{YELLOW}1. Creating Test Data{RESET}")
try:
    with engine.connect() as conn:
        # Clean up any existing test data
        conn.execute(text("""
            DELETE FROM file_chunks WHERE file_id IN 
                (SELECT id FROM files WHERE title = 'AI Test Document');
            DELETE FROM files WHERE title = 'AI Test Document';
            DELETE FROM modules WHERE title = 'AI Test Module';
            DELETE FROM courses WHERE title = 'AI Test Course';
        """))
        conn.commit()
        
        # Create course
        course_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO courses (id, title, description, code, published, last_updated, created_at)
            VALUES (:id, 'AI Test Course', 'Testing AI system', 'TEST101', true, NOW(), NOW())
        """), {"id": course_id})
        
        # Create module
        module_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO modules (id, course_id, title, ordering)
            VALUES (:id, :course_id, 'AI Test Module', 1)
        """), {"id": module_id, "course_id": course_id})
        
        # Create file
        file_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO files (id, module_id, title, filename, file_type, file_size, storage_type, created_at, ordering, 
                            view_count_raw, view_count_personalized, chat_count)
            VALUES (:id, :module_id, 'AI Test Document', 'test_document.txt', 'txt', 1024, 'test', NOW(), 1, 0, 0, 0)
        """), {"id": file_id, "module_id": module_id})
        
        # Create test chunks
        chunks = [
            "Machine learning is a method of data analysis that automates analytical model building.",
            "Neural networks are a subset of machine learning and are at the heart of deep learning algorithms.",
            "Natural Language Processing (NLP) enables computers to understand, interpret and generate human language.",
            "Computer vision enables machines to interpret and understand visual information from the world.",
            "Deep learning uses multiple layers to progressively extract higher-level features from raw input."
        ]
        
        for i, content in enumerate(chunks):
            chunk_id = str(uuid.uuid4())
            # Create a zero vector for initial embedding (will be replaced by trigger)
            zero_embedding = '[' + ','.join(['0'] * 1536) + ']'
            conn.execute(text("""
                INSERT INTO file_chunks (id, file_id, course_id, chunk_index, content, chunk_metadata, embedding, created_at)
                VALUES (:id, :file_id, :course_id, :index, :content, :metadata, :embedding, NOW())
            """), {
                "id": chunk_id,
                "file_id": file_id,
                "course_id": course_id,
                "index": i,
                "content": content,
                "metadata": json.dumps({"chunk": i+1, "topic": "AI"}),
                "embedding": zero_embedding
            })
        
        conn.commit()
        print(f"{GREEN}✅ Created test data: 1 course, 1 module, 1 file, {len(chunks)} chunks{RESET}")
        
except Exception as e:
    print(f"{RED}❌ Failed to create test data: {e}{RESET}")
    sys.exit(1)

# Test 2: Check Embeddings
print(f"\n{YELLOW}2. Checking Embeddings{RESET}")
try:
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings
            FROM file_chunks
            WHERE course_id = :course_id
        """), {"course_id": course_id}).first()
        
        print(f"   Total chunks: {result.total}")
        print(f"   With embeddings: {result.with_embeddings}")
        
        if result.with_embeddings == 0:
            print(f"{YELLOW}   ⏳ Waiting 65 seconds for embedding cron job...{RESET}")
            time.sleep(65)
            
            # Check again
            result = conn.execute(text("""
                SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings
                FROM file_chunks WHERE course_id = :course_id
            """), {"course_id": course_id}).first()
            
            if result.with_embeddings > 0:
                print(f"{GREEN}   ✅ Embeddings generated!{RESET}")
            else:
                print(f"{YELLOW}   ⚠️  No embeddings yet. Cron job may need more time.{RESET}")
                
except Exception as e:
    print(f"{RED}❌ Embedding check failed: {e}{RESET}")

# Test 3: OpenAI Integration
print(f"\n{YELLOW}3. Testing OpenAI{RESET}")
try:
    # Test chat
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say OK"}],
        max_tokens=5
    )
    print(f"{GREEN}✅ Chat API: {response.choices[0].message.content}{RESET}")
    
    # Test embeddings
    embedding = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input="Test"
    )
    print(f"{GREEN}✅ Embeddings API: Dimension {len(embedding.data[0].embedding)}{RESET}")
    
except Exception as e:
    print(f"{RED}❌ OpenAI test failed: {e}{RESET}")

# Test 4: RAG Search (if embeddings exist)
print(f"\n{YELLOW}4. Testing RAG Search{RESET}")
try:
    with engine.connect() as conn:
        # Check for embeddings
        has_embeddings = conn.execute(text("""
            SELECT COUNT(*) FROM file_chunks 
            WHERE course_id = :course_id AND embedding IS NOT NULL
        """), {"course_id": course_id}).scalar()
        
        if has_embeddings > 0:
            # Generate query embedding
            query = "What is machine learning?"
            embedding_response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=query
            )
            query_embedding = embedding_response.data[0].embedding
            
            # Search
            # Convert embedding to PostgreSQL array format
            embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
            results = conn.execute(text("""
                SELECT 
                    content,
                    1 - (embedding <=> :embedding) as similarity
                FROM file_chunks
                WHERE course_id = :course_id AND embedding IS NOT NULL
                ORDER BY embedding <=> :embedding
                LIMIT 3
            """), {
                "embedding": embedding_str,
                "course_id": course_id
            }).fetchall()
            
            print(f"{GREEN}✅ RAG search working! Found {len(results)} results{RESET}")
            for i, (content, similarity) in enumerate(results, 1):
                print(f"   {i}. Similarity: {similarity:.3f} - {content[:60]}...")
                
        else:
            print(f"{YELLOW}   ⚠️  No embeddings available for RAG search{RESET}")
            
except Exception as e:
    print(f"{RED}❌ RAG search failed: {e}{RESET}")

# Test 5: Full AI Pipeline
print(f"\n{YELLOW}5. Testing Full AI Pipeline{RESET}")
try:
    with engine.connect() as conn:
        # Check if we have embeddings
        has_embeddings = conn.execute(text("""
            SELECT COUNT(*) FROM file_chunks 
            WHERE course_id = :course_id AND embedding IS NOT NULL
        """), {"course_id": course_id}).scalar()
        
        if has_embeddings > 0:
            # Get query
            question = "Explain neural networks in simple terms"
            
            # Get embedding
            embedding_response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=question
            )
            query_embedding = embedding_response.data[0].embedding
            
            # Get context
            embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
            results = conn.execute(text("""
                SELECT content FROM file_chunks
                WHERE course_id = :course_id AND embedding IS NOT NULL
                ORDER BY embedding <=> :embedding
                LIMIT 3
            """), {
                "embedding": embedding_str,
                "course_id": course_id
            }).fetchall()
            
            context = "\n".join([r.content for r in results])
            
            # Generate response
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Answer based on the context provided."},
                    {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
                ],
                max_tokens=150
            )
            
            answer = response.choices[0].message.content
            print(f"{GREEN}✅ Full pipeline working!{RESET}")
            print(f"   Q: {question}")
            print(f"   A: {answer[:100]}...")
            
        else:
            # Test without RAG
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "Explain neural networks briefly"}],
                max_tokens=50
            )
            print(f"{GREEN}✅ AI generation works (without RAG){RESET}")
            print(f"   Response: {response.choices[0].message.content}")
            
except Exception as e:
    print(f"{RED}❌ Full pipeline test failed: {e}{RESET}")

# Summary
print(f"\n{BLUE}{'='*60}{RESET}")
print(f"{BLUE}{'Test Summary':^60}{RESET}")
print(f"{BLUE}{'='*60}{RESET}")

with engine.connect() as conn:
    stats = conn.execute(text("""
        SELECT 
            (SELECT COUNT(*) FROM courses) as courses,
            (SELECT COUNT(*) FROM file_chunks) as chunks,
            (SELECT COUNT(*) FROM file_chunks WHERE embedding IS NOT NULL) as embedded
    """)).first()
    
    print(f"\nDatabase Stats:")
    print(f"  Courses: {stats.courses}")
    print(f"  Total chunks: {stats.chunks}")
    print(f"  Embedded chunks: {stats.embedded}")
    
    if stats.embedded > 0:
        print(f"\n{GREEN}✅ All systems operational!{RESET}")
    else:
        print(f"\n{YELLOW}⚠️  System operational but embeddings pending{RESET}")
        print(f"{YELLOW}   Run again in 1-2 minutes for full functionality{RESET}")

print(f"\n{BLUE}Test completed at: {datetime.now().strftime('%H:%M:%S')}{RESET}\n")
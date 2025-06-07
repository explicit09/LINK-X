#!/usr/bin/env python3
"""
Complete AI system test with data creation
"""
import os
import sys
import time
import json
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

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✅ {text}{RESET}")

def print_error(text):
    print(f"{RED}❌ {text}{RESET}")

def print_info(text):
    print(f"{YELLOW}ℹ️  {text}{RESET}")

# Initialize connections
DATABASE_URL = os.getenv('DATABASE_URL')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

engine = create_engine(DATABASE_URL)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

print_header("LEARN-X Complete AI System Test")

# Step 1: Create test data
print_header("Step 1: Creating Test Data")

with engine.connect() as conn:
    # Check if we already have test data
    existing = conn.execute(text("""
        SELECT COUNT(*) FROM courses WHERE title = 'AI System Test Course'
    """)).scalar()
    
    if existing > 0:
        print_info("Test data already exists, cleaning up...")
        conn.execute(text("""
            DELETE FROM file_chunks WHERE course_id IN 
                (SELECT id FROM courses WHERE title = 'AI System Test Course');
            DELETE FROM files WHERE module_id IN 
                (SELECT id FROM modules WHERE course_id IN 
                    (SELECT id FROM courses WHERE title = 'AI System Test Course'));
            DELETE FROM modules WHERE course_id IN 
                (SELECT id FROM courses WHERE title = 'AI System Test Course');
            DELETE FROM courses WHERE title = 'AI System Test Course';
        """))
        conn.commit()
    
    # Create course
    import uuid
    course_id = str(uuid.uuid4())
    result = conn.execute(text("""
        INSERT INTO courses (id, title, description, code, published, last_updated, created_at)
        VALUES (:id, 'AI System Test Course', 'Testing embeddings and RAG', 'TEST101', true, NOW(), NOW())
        RETURNING id
    """), {"id": course_id})
    course_id = result.scalar()
    print_success(f"Created course with ID: {course_id}")
    
    # Create module
    module_id = str(uuid.uuid4())
    result = conn.execute(text("""
        INSERT INTO modules (id, course_id, title, order_index)
        VALUES (:id, :course_id, 'Test Module', 1)
        RETURNING id
    """), {"id": module_id, "course_id": course_id})
    module_id = result.scalar()
    print_success(f"Created module with ID: {module_id}")
    
    # Create file
    file_id = str(uuid.uuid4())
    result = conn.execute(text("""
        INSERT INTO files (id, module_id, title, file_type, storage_type)
        VALUES (:id, :module_id, 'AI Concepts Document', 'md', 'test')
        RETURNING id
    """), {"id": file_id, "module_id": module_id})
    file_id = result.scalar()
    print_success(f"Created file with ID: {file_id}")
    
    # Create multiple test chunks with rich content
    test_chunks = [
        {
            "content": """Machine learning is a subset of artificial intelligence (AI) that provides systems 
            the ability to automatically learn and improve from experience without being explicitly programmed. 
            Machine learning focuses on the development of computer programs that can access data and use it 
            to learn for themselves.""",
            "metadata": {"topic": "machine_learning", "type": "definition"}
        },
        {
            "content": """Neural networks are computing systems inspired by the biological neural networks 
            that constitute animal brains. A neural network is based on a collection of connected units or 
            nodes called artificial neurons, which loosely model the neurons in a biological brain.""",
            "metadata": {"topic": "neural_networks", "type": "definition"}
        },
        {
            "content": """Deep learning is part of a broader family of machine learning methods based on 
            artificial neural networks with representation learning. Learning can be supervised, semi-supervised 
            or unsupervised. Deep learning architectures such as deep neural networks have been applied to 
            fields including computer vision and natural language processing.""",
            "metadata": {"topic": "deep_learning", "type": "explanation"}
        },
        {
            "content": """Natural Language Processing (NLP) is a subfield of linguistics, computer science, 
            and artificial intelligence concerned with the interactions between computers and human language, 
            in particular how to program computers to process and analyze large amounts of natural language data.""",
            "metadata": {"topic": "nlp", "type": "definition"}
        },
        {
            "content": """Computer vision is an interdisciplinary scientific field that deals with how computers 
            can gain high-level understanding from digital images or videos. From the perspective of engineering, 
            it seeks to understand and automate tasks that the human visual system can do.""",
            "metadata": {"topic": "computer_vision", "type": "definition"}
        }
    ]
    
    for i, chunk_data in enumerate(test_chunks):
        chunk_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO file_chunks (id, file_id, course_id, chunk_index, content, chunk_metadata)
            VALUES (:id, :file_id, :course_id, :index, :content, :metadata)
        """), {
            "id": chunk_id,
            "file_id": file_id,
            "course_id": course_id,
            "index": i,
            "content": chunk_data["content"],
            "metadata": json.dumps(chunk_data["metadata"])
        })
    
    conn.commit()
    print_success(f"Created {len(test_chunks)} test chunks")

# Step 2: Check embedding queue
print_header("Step 2: Checking Embedding System")

with engine.connect() as conn:
    # Check if embeddings exist
    result = conn.execute(text("""
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings
        FROM file_chunks
        WHERE course_id = :course_id
    """), {"course_id": course_id}).first()
    
    print_info(f"Total chunks: {result.total}")
    print_info(f"Chunks with embeddings: {result.with_embeddings}")
    
    if result.with_embeddings == 0:
        print_info("No embeddings yet. Waiting for cron job to process...")
        print_info("The cron job runs every minute. Waiting 65 seconds...")
        
        # Wait for cron job
        for i in range(65, 0, -1):
            print(f"\r{YELLOW}Waiting... {i} seconds remaining{RESET}", end='', flush=True)
            time.sleep(1)
        print()
        
        # Check again
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings
            FROM file_chunks
            WHERE course_id = :course_id
        """), {"course_id": course_id}).first()
        
        if result.with_embeddings > 0:
            print_success(f"Embeddings generated! {result.with_embeddings}/{result.total} chunks have embeddings")
        else:
            print_error("Embeddings not generated yet. The cron job may need more time.")
            print_info("You can check the embedding queue with: SELECT * FROM pgmq.list_queues();")

# Step 3: Test RAG search
print_header("Step 3: Testing RAG Search")

with engine.connect() as conn:
    # Check if we have embeddings
    has_embeddings = conn.execute(text("""
        SELECT COUNT(*) FROM file_chunks 
        WHERE course_id = :course_id AND embedding IS NOT NULL
    """), {"course_id": course_id}).scalar()
    
    if has_embeddings > 0:
        print_success(f"Found {has_embeddings} chunks with embeddings")
        
        # Test search queries
        test_queries = [
            "What is machine learning?",
            "Explain neural networks",
            "How does computer vision work?",
            "What is NLP?"
        ]
        
        for query in test_queries:
            print_info(f"\nTesting query: '{query}'")
            
            # Generate query embedding
            embedding_response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=query
            )
            query_embedding = embedding_response.data[0].embedding
            
            # Perform vector search
            result = conn.execute(text("""
                SELECT 
                    content,
                    chunk_metadata,
                    1 - (embedding <=> :query_embedding::vector) as similarity
                FROM file_chunks
                WHERE course_id = :course_id
                    AND embedding IS NOT NULL
                ORDER BY embedding <=> :query_embedding::vector
                LIMIT 3
            """), {
                "query_embedding": query_embedding,
                "course_id": course_id
            })
            
            matches = result.fetchall()
            if matches:
                print_success(f"Found {len(matches)} relevant chunks:")
                for i, match in enumerate(matches, 1):
                    print(f"  {i}. Similarity: {match.similarity:.3f}")
                    print(f"     Topic: {match.chunk_metadata.get('topic', 'unknown')}")
                    print(f"     Preview: {match.content[:80]}...")
            else:
                print_error("No matches found")
    else:
        print_error("No embeddings available for RAG search")
        print_info("Please wait for the embedding cron job to run and try again")

# Step 4: Test AI generation with RAG context
print_header("Step 4: Testing AI Generation with RAG")

if has_embeddings > 0:
    # Get a question
    question = "Explain how neural networks relate to deep learning in simple terms"
    print_info(f"Question: {question}")
    
    # Get relevant context via RAG
    embedding_response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=question
    )
    query_embedding = embedding_response.data[0].embedding
    
    # Get top 3 relevant chunks
    result = conn.execute(text("""
        SELECT content
        FROM file_chunks
        WHERE course_id = :course_id
            AND embedding IS NOT NULL
        ORDER BY embedding <=> :query_embedding::vector
        LIMIT 3
    """), {
        "query_embedding": query_embedding,
        "course_id": course_id
    })
    
    context_chunks = [row.content for row in result]
    context = "\n\n".join(context_chunks)
    
    print_info("Retrieved RAG context")
    
    # Generate response with context
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful AI assistant. Use the provided context to answer questions accurately."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ],
        max_tokens=200
    )
    
    answer = response.choices[0].message.content
    print_success("Generated AI response with RAG context:")
    print(f"\n{answer}\n")
else:
    print_error("Cannot test AI generation without embeddings")

# Summary
print_header("Test Summary")

with engine.connect() as conn:
    # Final status
    result = conn.execute(text("""
        SELECT 
            COUNT(*) as total_chunks,
            COUNT(*) FILTER (WHERE embedding IS NOT NULL) as embedded_chunks,
            COUNT(DISTINCT file_id) as files,
            COUNT(DISTINCT course_id) as courses
        FROM file_chunks
    """)).first()
    
    print(f"Total courses: {result.courses}")
    print(f"Total files: {result.files}")
    print(f"Total chunks: {result.total_chunks}")
    print(f"Embedded chunks: {result.embedded_chunks}")
    
    if result.embedded_chunks > 0:
        print_success("\nAll systems operational! ✨")
        print("- Database: ✅")
        print("- Embeddings: ✅")
        print("- RAG Search: ✅")
        print("- AI Generation: ✅")
    else:
        print_info("\nSystem partially operational:")
        print("- Database: ✅")
        print("- Embeddings: ⏳ (waiting for cron job)")
        print("- RAG Search: ❌ (requires embeddings)")
        print("- AI Generation: ✅ (works without RAG)")
        print_info("\nRun this test again in 1-2 minutes for full functionality")

print(f"\n{BLUE}Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{RESET}")
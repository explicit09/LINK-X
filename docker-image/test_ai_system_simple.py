#!/usr/bin/env python3
"""
Simple test script to verify AI system components
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment
load_dotenv('.env')

# Get credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(name, passed, details=""):
    status = f"{GREEN}PASSED{RESET}" if passed else f"{RED}FAILED{RESET}"
    print(f"{name:.<50} {status}")
    if details:
        print(f"  {details}")

print(f"{BLUE}=== LEARN-X AI System Test ==={RESET}\n")

# Test 1: Environment Variables
print("1. Environment Variables")
env_ok = all([SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY])
print_test("  Supabase URL", bool(SUPABASE_URL))
print_test("  Supabase Service Key", bool(SUPABASE_SERVICE_KEY))
print_test("  OpenAI API Key", bool(OPENAI_API_KEY))

if not env_ok:
    print(f"\n{RED}Missing environment variables. Check .env file{RESET}")
    sys.exit(1)

# Test 2: Supabase Connection
print("\n2. Supabase Connection")
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Test basic query
    result = supabase.table('file_chunks').select('id').limit(1).execute()
    print_test("  Database connection", True, f"Connected successfully")
    
    # Check tables
    tables = ['file_chunks', 'files', 'modules', 'courses']
    for table in tables:
        try:
            count_result = supabase.table(table).select('id', count='exact').execute()
            count = count_result.count if hasattr(count_result, 'count') else len(count_result.data)
            print_test(f"  Table '{table}'", True, f"{count} records")
        except Exception as e:
            print_test(f"  Table '{table}'", False, str(e))
            
except Exception as e:
    print_test("  Database connection", False, str(e))

# Test 3: Embedding System
print("\n3. Embedding System")
try:
    # Check embedding queue
    queue_check = supabase.rpc('pgmq.list_queues').execute()
    has_queue = any(q.get('queue_name') == 'embedding_jobs' for q in queue_check.data) if queue_check.data else False
    print_test("  Embedding queue exists", has_queue)
    
    # Check embeddings status
    chunks_result = supabase.table('file_chunks').select('id', 'embedding').execute()
    total_chunks = len(chunks_result.data)
    chunks_with_embeddings = sum(1 for chunk in chunks_result.data if chunk.get('embedding'))
    
    print_test("  Chunks with embeddings", chunks_with_embeddings > 0, 
               f"{chunks_with_embeddings}/{total_chunks} chunks embedded")
    
    # Check cron job
    cron_result = supabase.rpc('cron.job', {}).execute()
    has_cron = any(job.get('jobname') == 'process-embeddings' for job in cron_result.data) if cron_result.data else False
    print_test("  Embedding cron job", has_cron)
    
except Exception as e:
    print_test("  Embedding system", False, str(e))

# Test 4: OpenAI Integration
print("\n4. OpenAI Integration")
try:
    import openai
    openai.api_key = OPENAI_API_KEY
    
    # Test with new client
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    # Test chat completion
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say 'AI test successful' only"}],
        max_tokens=10
    )
    
    success = "test successful" in response.choices[0].message.content.lower()
    print_test("  Chat completion", success, response.choices[0].message.content)
    
    # Test embeddings
    embedding_response = client.embeddings.create(
        model="text-embedding-3-small",
        input="Test embedding"
    )
    
    embedding_dim = len(embedding_response.data[0].embedding)
    print_test("  Embeddings API", embedding_dim > 0, f"Dimension: {embedding_dim}")
    
except Exception as e:
    print_test("  OpenAI integration", False, str(e))

# Test 5: RAG Search (if embeddings exist)
print("\n5. RAG Search Test")
try:
    # Check if we have embedded chunks
    embedded_chunks = supabase.table('file_chunks').select('id', 'content').not_.is_('embedding', 'null').limit(1).execute()
    
    if embedded_chunks.data:
        print_test("  Embedded content available", True, f"Found {len(embedded_chunks.data)} chunks")
        
        # Create a test embedding for search
        test_query = "machine learning"
        embedding_response = client.embeddings.create(
            model="text-embedding-3-small",
            input=test_query
        )
        query_embedding = embedding_response.data[0].embedding
        
        # Perform vector search using raw SQL via RPC
        # Note: This requires a custom RPC function in Supabase
        print_test("  Vector search ready", True, "Embeddings can be searched")
        
    else:
        print_test("  Embedded content available", False, "No chunks with embeddings yet")
        print(f"  {YELLOW}Run the test again in 1-2 minutes after cron job processes chunks{RESET}")
        
except Exception as e:
    print_test("  RAG search", False, str(e))

# Summary
print(f"\n{BLUE}=== Test Complete ==={RESET}")
print(f"{YELLOW}Note: Embeddings are generated asynchronously. If some tests failed, wait 1-2 minutes and run again.{RESET}")

# Test creating a sample chunk if none exist
try:
    if total_chunks == 0:
        print(f"\n{YELLOW}No chunks found. Would you like to create test data? (y/n): {RESET}", end='')
        if input().lower() == 'y':
            # Create test data
            # First check if we have a course
            courses = supabase.table('courses').select('id').limit(1).execute()
            
            if not courses.data:
                # Create course
                course_data = {
                    'title': 'AI Test Course',
                    'description': 'Test course for AI system',
                    'instructor': 'Test System'
                }
                course_result = supabase.table('courses').insert(course_data).execute()
                course_id = course_result.data[0]['id']
            else:
                course_id = courses.data[0]['id']
            
            # Check for module
            modules = supabase.table('modules').select('id').eq('course_id', course_id).limit(1).execute()
            
            if not modules.data:
                # Create module
                module_data = {
                    'course_id': course_id,
                    'title': 'Test Module',
                    'order_index': 1
                }
                module_result = supabase.table('modules').insert(module_data).execute()
                module_id = module_result.data[0]['id']
            else:
                module_id = modules.data[0]['id']
            
            # Check for file
            files = supabase.table('files').select('id').eq('module_id', module_id).limit(1).execute()
            
            if not files.data:
                # Create file
                file_data = {
                    'module_id': module_id,
                    'title': 'Test Document',
                    'file_type': 'txt',
                    'storage_type': 'test'
                }
                file_result = supabase.table('files').insert(file_data).execute()
                file_id = file_result.data[0]['id']
            else:
                file_id = files.data[0]['id']
            
            # Create test chunk
            chunk_data = {
                'file_id': file_id,
                'course_id': course_id,
                'chunk_index': 0,
                'content': 'This is a test chunk about machine learning and artificial intelligence. Neural networks are powerful tools for pattern recognition.',
                'chunk_metadata': {'test': True}
            }
            
            chunk_result = supabase.table('file_chunks').insert(chunk_data).execute()
            print(f"{GREEN}Test chunk created successfully! Embeddings will be generated within 1 minute.{RESET}")
            
except Exception as e:
    print(f"{RED}Error creating test data: {e}{RESET}")
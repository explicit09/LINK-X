#!/usr/bin/env python3
from supabase import create_client, Client
import json

# Supabase credentials
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

# Create Supabase client
supabase: Client = create_client(url, key)

print("=== CHECKING FILES TABLE STRUCTURE ===\n")

# Try different column combinations to understand the structure
test_queries = [
    ("Basic ID check", "id"),
    ("With timestamps", "id, created_at"),
    ("Common file columns", "id, file_name, created_at"),
    ("Alternative naming", "id, filename, created_at"),
    ("With user info", "id, user_id, created_at"),
    ("With course info", "id, course_id, module_id, created_at"),
    ("Processing fields", "id, processed, processing_status, created_at"),
    ("Storage fields", "id, s3_url, supabase_storage_path, created_at"),
    ("All fields (select *)", "*")
]

for desc, cols in test_queries:
    try:
        result = supabase.table('files').select(cols).limit(1).execute()
        print(f"✓ {desc}: SUCCESS")
        if result.data and len(result.data) > 0:
            print(f"  Columns found: {', '.join(result.data[0].keys())}")
            print(f"  Sample data: {json.dumps(result.data[0], indent=2, default=str)}")
        else:
            print("  (Table is empty, but query succeeded)")
        print()
    except Exception as e:
        error_msg = str(e)
        if 'does not exist' in error_msg:
            # Extract the column that doesn't exist
            print(f"✗ {desc}: {error_msg}")
        else:
            print(f"✗ {desc}: {error_msg}")
        print()

# Also check the processing_queue structure
print("\n=== CHECKING PROCESSING_QUEUE TABLE STRUCTURE ===\n")
try:
    pq_result = supabase.table('processing_queue').select('*').limit(1).execute()
    if pq_result.data and len(pq_result.data) > 0:
        print("Processing queue columns found:")
        print(f"  {', '.join(pq_result.data[0].keys())}")
    else:
        print("Processing queue table is empty")
except Exception as e:
    print(f"Error checking processing_queue: {str(e)}")

# Check file_chunks structure
print("\n=== CHECKING FILE_CHUNKS TABLE STRUCTURE ===\n")
try:
    fc_result = supabase.table('file_chunks').select('*').limit(1).execute()
    if fc_result.data and len(fc_result.data) > 0:
        print("File chunks columns found:")
        print(f"  {', '.join(fc_result.data[0].keys())}")
    else:
        print("File chunks table is empty")
except Exception as e:
    print(f"Error checking file_chunks: {str(e)}")
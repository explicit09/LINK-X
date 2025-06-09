#!/usr/bin/env python3
import os
from supabase import create_client, Client
import json
from datetime import datetime

# Supabase credentials
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

# Create Supabase client
supabase: Client = create_client(url, key)

print("=== CHECKING RECENT FILE UPLOAD STATUS ===\n")

# 1. Check for the most recent file upload
print("1. MOST RECENT FILE UPLOAD:")
try:
    # Get the most recent file
    files_result = supabase.table('files').select('*').order('created_at', desc=True).limit(1).execute()
    
    if files_result.data and len(files_result.data) > 0:
        recent_file = files_result.data[0]
        print(f"\nFound recent file:")
        print(f"  ID: {recent_file.get('id')}")
        print(f"  Name: {recent_file.get('name')}")
        print(f"  Created at: {recent_file.get('created_at')}")
        print(f"  User ID: {recent_file.get('user_id')}")
        print(f"  Course ID: {recent_file.get('course_id')}")
        print(f"  Module ID: {recent_file.get('module_id')}")
        print(f"  S3 URL: {recent_file.get('s3_url', 'N/A')}")
        print(f"  Supabase path: {recent_file.get('supabase_storage_path', 'N/A')}")
        print(f"  Processing status: {recent_file.get('processing_status', 'N/A')}")
        print(f"  Processed: {recent_file.get('processed', 'N/A')}")
        
        file_id = recent_file.get('id')
        
        # 2. Check processing queue for this file
        print(f"\n2. PROCESSING QUEUE STATUS FOR FILE {file_id}:")
        try:
            queue_result = supabase.table('processing_queue').select('*').eq('file_id', file_id).execute()
            
            if queue_result.data:
                for queue_item in queue_result.data:
                    print(f"\n  Queue item:")
                    print(f"    ID: {queue_item.get('id')}")
                    print(f"    Status: {queue_item.get('status')}")
                    print(f"    Task type: {queue_item.get('task_type')}")
                    print(f"    Priority: {queue_item.get('priority')}")
                    print(f"    Attempts: {queue_item.get('attempts')}")
                    print(f"    Error message: {queue_item.get('error_message', 'None')}")
                    print(f"    Created at: {queue_item.get('created_at')}")
                    print(f"    Updated at: {queue_item.get('updated_at')}")
            else:
                print("  No processing queue entries found for this file")
        except Exception as e:
            print(f"  Error checking processing queue: {str(e)}")
        
        # 3. Check file_chunks for this file
        print(f"\n3. FILE CHUNKS FOR FILE {file_id}:")
        try:
            chunks_result = supabase.table('file_chunks').select('id, chunk_index, created_at').eq('file_id', file_id).order('chunk_index').execute()
            
            if chunks_result.data:
                print(f"  Found {len(chunks_result.data)} chunks")
                for i, chunk in enumerate(chunks_result.data[:5]):  # Show first 5 chunks
                    print(f"    Chunk {chunk.get('chunk_index')}: ID {chunk.get('id')}")
                if len(chunks_result.data) > 5:
                    print(f"    ... and {len(chunks_result.data) - 5} more chunks")
            else:
                print("  No file chunks found for this file")
        except Exception as e:
            print(f"  Error checking file chunks: {str(e)}")
            
    else:
        print("No files found in the database")
        
        # Check if there are ANY files at all
        all_files = supabase.table('files').select('id, name, created_at').execute()
        print(f"\nTotal files in database: {len(all_files.data) if all_files.data else 0}")
        
except Exception as e:
    print(f"Error accessing files table: {str(e)}")

# 4. Check recent processing queue entries (regardless of file)
print("\n\n4. RECENT PROCESSING QUEUE ENTRIES (ALL):")
try:
    recent_queue = supabase.table('processing_queue').select('*').order('created_at', desc=True).limit(5).execute()
    
    if recent_queue.data:
        print(f"Found {len(recent_queue.data)} recent queue entries:")
        for item in recent_queue.data:
            print(f"\n  Queue item:")
            print(f"    File ID: {item.get('file_id')}")
            print(f"    Status: {item.get('status')}")
            print(f"    Task type: {item.get('task_type')}")
            print(f"    Error: {item.get('error_message', 'None')}")
            print(f"    Created: {item.get('created_at')}")
    else:
        print("No processing queue entries found")
except Exception as e:
    print(f"Error checking processing queue: {str(e)}")

# 5. Check RLS policies
print("\n\n5. CHECKING RLS POLICIES (via test insert):")
try:
    # Try to check if we can access files with current permissions
    test_result = supabase.table('files').select('id').limit(1).execute()
    print("  ✓ Can READ from files table")
except Exception as e:
    print(f"  ✗ Cannot READ from files table: {str(e)}")

print("\n=== END OF FILE UPLOAD STATUS CHECK ===")
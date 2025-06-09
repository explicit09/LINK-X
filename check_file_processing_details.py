#!/usr/bin/env python3
from supabase import create_client, Client
import json
from datetime import datetime

# Supabase credentials
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

# Create Supabase client
supabase: Client = create_client(url, key)

print("=== FILE PROCESSING ANALYSIS ===\n")

# Get all files ordered by creation date
files_result = supabase.table('File').select('*').order('created_at', desc=True).execute()

if files_result.data:
    print(f"Total files in database: {len(files_result.data)}\n")
    
    # Analyze each file
    for i, file in enumerate(files_result.data):
        print(f"{i+1}. File: {file.get('title', 'Unknown')}")
        print(f"   ID: {file.get('id')}")
        print(f"   Created: {file.get('created_at')}")
        print(f"   Processed: {file.get('processed', False)}")
        print(f"   Processing Status: {file.get('processing_status', 'N/A')}")
        print(f"   Storage Path: {'Present' if file.get('storage_path') else 'Missing'}")
        
        file_id = file.get('id')
        
        # Check for chunks
        chunks_result = supabase.table('FileChunk').select('id, chunk_index').eq('file_id', file_id).execute()
        chunk_count = len(chunks_result.data) if chunks_result.data else 0
        print(f"   Chunks: {chunk_count}")
        
        # Check processing queue
        pq_result = supabase.table('processing_queue').select('*').eq('file_id', file_id).execute()
        if pq_result.data:
            print(f"   Processing Queue:")
            for pq in pq_result.data:
                print(f"     - Status: {pq.get('status')}, Attempts: {pq.get('attempts')}, Error: {pq.get('error_message', 'None')}")
        else:
            print(f"   Processing Queue: No entries")
        
        print()

# Check if there's a trigger or function to auto-queue files
print("\n=== CHECKING FOR AUTO-QUEUE MECHANISM ===")
print("The processing_queue_supabase.sql migration shows a trigger 'auto_queue_file_processing'")
print("but it's commented out by default. This means files need to be manually queued.")

# Get the most recent unprocessed file
unprocessed = [f for f in files_result.data if not f.get('processed', False)]
if unprocessed:
    print(f"\n=== UNPROCESSED FILES: {len(unprocessed)} ===")
    most_recent_unprocessed = unprocessed[0]
    print(f"\nMost recent unprocessed file:")
    print(f"  ID: {most_recent_unprocessed.get('id')}")
    print(f"  Title: {most_recent_unprocessed.get('title')}")
    print(f"  Status: {most_recent_unprocessed.get('processing_status', 'N/A')}")
    
    # Try to add it to processing queue
    print(f"\n=== SOLUTION ===")
    print(f"The file needs to be added to the processing queue. You can either:")
    print(f"1. Enable the auto-queue trigger in the database")
    print(f"2. Manually add the file to the processing queue via API")
    print(f"3. Call the /api/v2/files/process endpoint with the file ID")
    
    print(f"\nTo manually queue this file, use:")
    print(f"POST /api/v2/files/{most_recent_unprocessed.get('id')}/process")
#!/usr/bin/env python3
import os
from supabase import create_client, Client
import json

# Supabase credentials from the .env.local file
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

# Create Supabase client
supabase: Client = create_client(url, key)

print("=== FILE DATABASE STATUS CHECK ===\n")

try:
    # 1. Count total files
    total_files = supabase.table('files').select('id', count='exact').execute()
    print(f"1. Total files in database: {total_files.count if hasattr(total_files, 'count') else len(total_files.data)}")
    
    # 2. Count files by processed status
    processed_true = supabase.table('files').select('id', count='exact').eq('processed', True).execute()
    processed_false = supabase.table('files').select('id', count='exact').eq('processed', False).execute()
    
    print(f"\n2. Files by processed status:")
    print(f"   - Processed = true: {processed_true.count if hasattr(processed_true, 'count') else len(processed_true.data)}")
    print(f"   - Processed = false: {processed_false.count if hasattr(processed_false, 'count') else len(processed_false.data)}")
    
    # 3. Show most recent 5 files
    recent_files = supabase.table('files').select('id, filename, processed, created_at, updated_at').order('created_at', desc=True).limit(5).execute()
    
    print(f"\n3. Most recent 5 files:")
    if recent_files.data:
        for file in recent_files.data:
            print(f"   - ID: {file['id']}")
            print(f"     Filename: {file['filename']}")
            print(f"     Processed: {file['processed']}")
            print(f"     Created: {file['created_at']}")
            print(f"     Updated: {file['updated_at']}")
            print()
    else:
        print("   No files found")
    
    # 4. Check if processing_queue table exists
    print("4. Checking for processing_queue table...")
    try:
        queue_check = supabase.table('processing_queue').select('id', count='exact').limit(1).execute()
        print("   - processing_queue table EXISTS")
        
        # 5. Count entries in processing_queue
        queue_count = supabase.table('processing_queue').select('id', count='exact').execute()
        print(f"\n5. Entries in processing_queue: {queue_count.count if hasattr(queue_count, 'count') else len(queue_count.data)}")
        
        # Show some queue entries if they exist
        if queue_count.count > 0 or len(queue_count.data) > 0:
            queue_entries = supabase.table('processing_queue').select('*').limit(5).execute()
            print("\n   Recent queue entries:")
            for entry in queue_entries.data[:5]:
                print(f"   - {json.dumps(entry, indent=4)}")
    except Exception as e:
        print(f"   - processing_queue table DOES NOT EXIST or error: {str(e)}")
        print("\n5. Cannot count entries in processing_queue (table doesn't exist)")

except Exception as e:
    print(f"Error connecting to database or executing queries: {str(e)}")
    print("\nTrying alternative approach with raw SQL...")

print("\n=== END OF STATUS CHECK ===")
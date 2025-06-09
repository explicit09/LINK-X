#!/usr/bin/env python3
import os
from supabase import create_client, Client
import json

# Supabase credentials
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

# Create Supabase client
supabase: Client = create_client(url, key)

print("=== DATABASE SCHEMA CHECK ===\n")

# Check common table names
tables_to_check = ['files', 'file_chunks', 'courses', 'modules', 'users', 'profiles', 
                   'processing_queue', 'embeddings', 'study_plans', 'gamification_profiles']

print("Checking for existence of tables:\n")
for table_name in tables_to_check:
    try:
        result = supabase.table(table_name).select('*').limit(1).execute()
        count_result = supabase.table(table_name).select('id', count='exact').execute()
        count = count_result.count if hasattr(count_result, 'count') else len(count_result.data)
        print(f"✓ {table_name}: EXISTS (rows: {count})")
        
        # Show columns if table exists and has data
        if result.data and len(result.data) > 0:
            print(f"  Columns: {', '.join(result.data[0].keys())}")
    except Exception as e:
        print(f"✗ {table_name}: NOT FOUND or ERROR")

# Check specifically for files table structure
print("\n\n=== FILES TABLE STRUCTURE ===")
try:
    # Get a sample row to see structure
    sample = supabase.table('files').select('*').limit(1).execute()
    if sample.data and len(sample.data) > 0:
        print("\nSample row structure:")
        for key, value in sample.data[0].items():
            print(f"  - {key}: {type(value).__name__} (example: {str(value)[:50]}...)")
    else:
        # Try to insert a test file to see what columns are expected
        print("\nNo files found. Table exists but is empty.")
        print("Columns available for 'files' table cannot be determined without data.")
except Exception as e:
    print(f"Error accessing files table: {str(e)}")

# Check for file_chunks if files exist
print("\n\n=== FILE_CHUNKS TABLE ===")
try:
    chunks_sample = supabase.table('file_chunks').select('*').limit(5).execute()
    if chunks_sample.data:
        print(f"Found {len(chunks_sample.data)} file chunks")
        print("Sample chunk structure:")
        if chunks_sample.data[0]:
            for key in chunks_sample.data[0].keys():
                print(f"  - {key}")
except Exception as e:
    print(f"Error accessing file_chunks table: {str(e)}")

print("\n=== END OF SCHEMA CHECK ===")
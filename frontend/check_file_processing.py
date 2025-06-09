#!/usr/bin/env python3
"""
Check the processing status of recently uploaded files in Supabase
"""
import os
import sys
from datetime import datetime, timedelta
from supabase import create_client
import json

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'https://jfutbxgkplrkyyucxhjn.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_ANON_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM')

# Use service key if available, otherwise use anon key
API_KEY = SUPABASE_SERVICE_KEY if SUPABASE_SERVICE_KEY else SUPABASE_ANON_KEY

if not API_KEY:
    print("Error: No Supabase API key found in environment variables")
    sys.exit(1)

# Create Supabase client
supabase = create_client(SUPABASE_URL, API_KEY)

def check_recent_files():
    """Check files uploaded in the last 24 hours"""
    try:
        # Get today's date
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        
        print(f"\n=== Checking files uploaded since {yesterday} ===\n")
        
        # Query files table for recent uploads
        files_response = supabase.table('files').select(
            'id', 'filename', 'created_at', 'processed', 's3_key', 'file_size'
        ).gte('created_at', str(yesterday)).order('created_at', desc=True).execute()
        
        if not files_response.data:
            print("No files uploaded in the last 24 hours.")
            return
        
        print(f"Found {len(files_response.data)} files uploaded recently:\n")
        
        for file in files_response.data:
            print(f"File: {file['filename']}")
            print(f"  ID: {file['id']}")
            print(f"  Created: {file['created_at']}")
            print(f"  Processed: {file['processed']}")
            print(f"  S3 Key: {file['s3_key']}")
            print(f"  Size: {file.get('file_size', 'N/A')} bytes")
            
            # Check file_chunks for this file
            chunks_response = supabase.table('file_chunks').select(
                'id', 'chunk_index', 'created_at'
            ).eq('file_id', file['id']).order('chunk_index').execute()
            
            if chunks_response.data:
                print(f"  Chunks: {len(chunks_response.data)} chunks found")
                print(f"    First chunk created: {chunks_response.data[0]['created_at']}")
                print(f"    Last chunk created: {chunks_response.data[-1]['created_at']}")
            else:
                print(f"  Chunks: No chunks found")
            
            # Check processing_queue for this file
            queue_response = supabase.table('processing_queue').select(
                'id', 'status', 'created_at'
            ).eq('file_id', file['id']).execute()
            
            if queue_response.data:
                for queue_item in queue_response.data:
                    print(f"  Queue Status: {queue_item['status']}")
                    print(f"    Created: {queue_item['created_at']}")
            else:
                print(f"  Queue Status: Not in processing queue")
            
            print("-" * 60)
        
        # Check overall processing queue status
        print("\n=== Overall Processing Queue Status ===\n")
        
        statuses = ['pending', 'processing', 'completed', 'failed']
        for status in statuses:
            count_response = supabase.table('processing_queue').select(
                'id', count='exact'
            ).eq('status', status).execute()
            
            print(f"{status.capitalize()}: {count_response.count} items")
        
    except Exception as e:
        print(f"Error checking files: {e}")
        import traceback
        traceback.print_exc()

def check_embeddings():
    """Check if embeddings exist for recent files"""
    try:
        print("\n=== Checking Embeddings for Recent Files ===\n")
        
        # Get files from the last 24 hours
        yesterday = datetime.now().date() - timedelta(days=1)
        
        files_response = supabase.table('files').select(
            'id', 'filename'
        ).gte('created_at', str(yesterday)).execute()
        
        if not files_response.data:
            print("No recent files to check for embeddings.")
            return
        
        for file in files_response.data:
            # Check if chunks have embeddings
            chunks_with_embeddings = supabase.table('file_chunks').select(
                'id', count='exact'
            ).eq('file_id', file['id']).not_.is_('embedding', 'null').execute()
            
            total_chunks = supabase.table('file_chunks').select(
                'id', count='exact'
            ).eq('file_id', file['id']).execute()
            
            print(f"File: {file['filename']}")
            print(f"  Total chunks: {total_chunks.count}")
            print(f"  Chunks with embeddings: {chunks_with_embeddings.count}")
            
            if total_chunks.count > 0:
                percentage = (chunks_with_embeddings.count / total_chunks.count) * 100
                print(f"  Completion: {percentage:.1f}%")
            
            print()
            
    except Exception as e:
        print(f"Error checking embeddings: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_recent_files()
    check_embeddings()
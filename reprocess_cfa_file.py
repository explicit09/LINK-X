#!/usr/bin/env python3
"""Script to reprocess the CFA Research Challenge file to fix metadata issues"""

import sys
import os
import requests
import json

# Add the docker-image/src path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'docker-image', 'src'))

from core.supabase_config import get_supabase_client

def reprocess_cfa_file():
    """Reprocess the CFA Research Challenge file"""
    print("=== REPROCESSING CFA RESEARCH CHALLENGE FILE ===\n")
    
    # File ID from our investigation
    file_id = "fc3ecd8e-07ca-4a69-85c4-02734270c07c"
    
    print(f"File ID: {file_id}")
    print("Filename: 2025 CFA Research Challenge.pdf")
    
    # First, let's clear existing chunks to force a clean reprocess
    print("\n1. Clearing existing chunks...")
    try:
        supabase = get_supabase_client()
        
        # Delete existing chunks
        result = supabase.table('file_chunks').delete().eq('file_id', file_id).execute()
        print(f"   ✅ Deleted {len(result.data) if result.data else 0} existing chunks")
        
        # Delete existing embedding jobs
        result = supabase.table('embedding_jobs').delete().eq('file_id', file_id).execute()
        print(f"   ✅ Deleted {len(result.data) if result.data else 0} existing embedding jobs")
        
        # Clear processing queue entries
        result = supabase.table('processing_queue').delete().eq('file_id', file_id).execute()
        print(f"   ✅ Cleared {len(result.data) if result.data else 0} processing queue entries")
        
    except Exception as e:
        print(f"   ⚠️  Error clearing data: {e}")
    
    # Now trigger reprocessing using the enhanced file processing
    print("\n2. Triggering enhanced file processing...")
    try:
        # Import and call the enhanced processing directly
        from tasks.enhanced_file_processing import process_file_with_semantic_chunking
        
        # Call with force=True to ensure reprocessing
        result = process_file_with_semantic_chunking(file_id, force=True)
        
        print(f"   ✅ Processing result: {result}")
        
    except Exception as e:
        print(f"   ❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Check the results
    print("\n3. Checking results...")
    try:
        # Wait a moment for processing
        import time
        time.sleep(2)
        
        # Check chunks
        result = supabase.table('file_chunks').select('id, chunk_index, chunk_type, metadata, chunk_metadata').eq('file_id', file_id).order('chunk_index').limit(5).execute()
        
        if result.data:
            print(f"   ✅ Found {len(result.data)} new chunks")
            for i, chunk in enumerate(result.data):
                print(f"\n   Chunk {i}:")
                print(f"     chunk_type: {chunk.get('chunk_type')}")
                print(f"     metadata: {chunk.get('metadata')}")
                print(f"     chunk_metadata: {chunk.get('chunk_metadata')}")
        else:
            print("   ⚠️  No chunks found yet - processing may still be running")
            
    except Exception as e:
        print(f"   ❌ Error checking results: {e}")

if __name__ == "__main__":
    reprocess_cfa_file() 
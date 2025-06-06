#!/usr/bin/env python3
"""
Debug script to check file access and chunks
"""
import os
import sys
sys.path.insert(0, '/app/src')

from core.database_supabase import db_manager
from db.schema import File, FileChunk

def check_file_access(file_id):
    """Check if file exists and has chunks"""
    try:
        print(f"Checking file: {file_id}")
        
        with db_manager.get_session() as session:
            # Check if file exists
            file_obj = session.query(File).filter_by(id=file_id).first()
            if file_obj:
                print(f"✓ File found: {file_obj.title}")
                print(f"  Module ID: {file_obj.module_id}")
                print(f"  Filename: {file_obj.filename}")
                print(f"  Has S3 key: {hasattr(file_obj, 's3_key') and file_obj.s3_key}")
                print(f"  Has transcription: {hasattr(file_obj, 'transcription') and file_obj.transcription}")
            else:
                print("✗ File not found")
                return
            
            # Check chunks
            chunks = session.query(FileChunk).filter_by(file_id=file_id).order_by(FileChunk.chunk_index).all()
            print(f"  Chunks found: {len(chunks)}")
            
            if chunks:
                total_content_length = sum(len(chunk.content) for chunk in chunks)
                print(f"  Total content length: {total_content_length}")
                print(f"  First chunk preview: {chunks[0].content[:100]}...")
            else:
                print("  No chunks found - file may need processing")
                
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    # Initialize database
    from core.config import get_config
    config = get_config()
    
    # Test file ID
    file_id = "4d8c5dda-dc65-47f4-9656-08c75a7154ee"
    check_file_access(file_id)
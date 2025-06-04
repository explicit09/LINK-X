#!/usr/bin/env python3
"""
Test script to check file access
"""
import sys
import os
import json

# Add the src directory to Python path
sys.path.insert(0, '/app/src')

# Now import the modules
try:
    # Import Flask app
    from app import create_app
    
    app = create_app()
    
    with app.app_context():
        from services.file_service import FileService
        from db.schema import File, FileChunk
        from core.database import db
        
        file_service = FileService()
        file_id = "4d8c5dda-dc65-47f4-9656-08c75a7154ee"
        
        print(f"Testing file access for ID: {file_id}")
        
        # Try to get file directly
        try:
            result = db.session.execute(f"SELECT id, title, filename, module_id FROM files WHERE id = '{file_id}'")
            file_row = result.fetchone()
            if file_row:
                print(f"✓ File exists in database:")
                print(f"  ID: {file_row[0]}")
                print(f"  Title: {file_row[1]}")
                print(f"  Filename: {file_row[2]}")
                print(f"  Module ID: {file_row[3]}")
            else:
                print("✗ File not found in database")
                exit(1)
        except Exception as e:
            print(f"Database query error: {e}")
            exit(1)
        
        # Check chunks
        try:
            result = db.session.execute(f"SELECT COUNT(*) FROM file_chunks WHERE file_id = '{file_id}'")
            chunk_count = result.fetchone()[0]
            print(f"  Chunks: {chunk_count}")
            
            if chunk_count > 0:
                result = db.session.execute(f"SELECT chunk_index, LENGTH(content) FROM file_chunks WHERE file_id = '{file_id}' ORDER BY chunk_index LIMIT 3")
                chunks = result.fetchall()
                for chunk in chunks:
                    print(f"    Chunk {chunk[0]}: {chunk[1]} characters")
            else:
                print("  No chunks found")
        except Exception as e:
            print(f"Chunk query error: {e}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
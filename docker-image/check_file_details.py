#!/usr/bin/env python3
"""
Check specific file details using correct table names
"""
import sys
sys.path.insert(0, '/app/src')

from app import create_app

app = create_app()

with app.app_context():
    from core.database_supabase import db
    
    file_id = "4d8c5dda-dc65-47f4-9656-08c75a7154ee"
    
    try:
        print(f"Checking File table for ID: {file_id}")
        
        # Check File table (note the capital F)
        result = db.session.execute(f"SELECT id, title, filename, module_id FROM \"File\" WHERE id = '{file_id}'")
        file_row = result.fetchone()
        
        if file_row:
            print(f"✓ File found:")
            print(f"  ID: {file_row[0]}")
            print(f"  Title: {file_row[1]}")
            print(f"  Filename: {file_row[2]}")
            print(f"  Module ID: {file_row[3]}")
        else:
            print("✗ File not found")
            # Let's see what files do exist
            result = db.session.execute("SELECT id, title, filename FROM \"File\" LIMIT 5")
            existing_files = result.fetchall()
            print(f"Found {len(existing_files)} files in database:")
            for f in existing_files:
                print(f"  - {f[0]}: {f[1]} ({f[2]})")
            exit(1)
        
        # Check FileChunk table
        print(f"\nChecking FileChunk table:")
        result = db.session.execute(f"SELECT COUNT(*) FROM \"FileChunk\" WHERE file_id = '{file_id}'")
        chunk_count = result.fetchone()[0]
        print(f"  Chunks: {chunk_count}")
        
        if chunk_count > 0:
            result = db.session.execute(f"SELECT chunk_index, LENGTH(content) FROM \"FileChunk\" WHERE file_id = '{file_id}' ORDER BY chunk_index LIMIT 5")
            chunks = result.fetchall()
            total_length = 0
            for chunk in chunks:
                print(f"    Chunk {chunk[0]}: {chunk[1]} characters")
                total_length += chunk[1]
            print(f"  Total content (first 5 chunks): {total_length} characters")
            
            # Get a sample of content
            result = db.session.execute(f"SELECT content FROM \"FileChunk\" WHERE file_id = '{file_id}' ORDER BY chunk_index LIMIT 1")
            sample_content = result.fetchone()
            if sample_content:
                print(f"  Sample content: {sample_content[0][:200]}...")
        else:
            print("  No chunks found - this explains the personalization error!")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
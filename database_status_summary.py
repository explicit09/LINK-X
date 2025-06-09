#!/usr/bin/env python3
from supabase import create_client, Client
from datetime import datetime
import json

# Supabase credentials
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

# Create Supabase client
supabase: Client = create_client(url, key)

print("=" * 60)
print("DATABASE STATUS SUMMARY - " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
print("=" * 60)

# Summary data
summary = {
    "files": {
        "total": 0,
        "processed": 0,
        "unprocessed": 0,
        "recent": []
    },
    "processing_queue": {
        "total": 0,
        "by_status": {},
        "recent": []
    },
    "file_chunks": {
        "total": 0
    },
    "courses": {
        "total": 0
    },
    "modules": {
        "total": 0
    }
}

# 1. Files Analysis
try:
    # Total files
    total_files = supabase.table('files').select('id', count='exact').execute()
    summary["files"]["total"] = total_files.count if hasattr(total_files, 'count') else len(total_files.data)
    
    # Check if processed column exists by trying to query it
    try:
        processed_files = supabase.table('files').select('id', count='exact').eq('processed', True).execute()
        unprocessed_files = supabase.table('files').select('id', count='exact').eq('processed', False).execute()
        summary["files"]["processed"] = processed_files.count if hasattr(processed_files, 'count') else len(processed_files.data)
        summary["files"]["unprocessed"] = unprocessed_files.count if hasattr(unprocessed_files, 'count') else len(unprocessed_files.data)
        has_processed_column = True
    except:
        has_processed_column = False
        print("Note: 'processed' column not found in files table")
    
    # Recent files
    recent_files = supabase.table('files').select('*').order('created_at', desc=True).limit(5).execute()
    if recent_files.data:
        for file in recent_files.data:
            summary["files"]["recent"].append({
                "id": file.get('id'),
                "filename": file.get('filename', file.get('title', 'Unknown')),
                "created_at": file.get('created_at'),
                "processed": file.get('processed', 'N/A') if has_processed_column else 'N/A'
            })
except Exception as e:
    print(f"Error analyzing files: {str(e)}")

# 2. Processing Queue Analysis
try:
    # Total in queue
    queue_total = supabase.table('processing_queue').select('id', count='exact').execute()
    summary["processing_queue"]["total"] = queue_total.count if hasattr(queue_total, 'count') else len(queue_total.data)
    
    # By status
    statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled']
    for status in statuses:
        status_count = supabase.table('processing_queue').select('id', count='exact').eq('status', status).execute()
        summary["processing_queue"]["by_status"][status] = status_count.count if hasattr(status_count, 'count') else len(status_count.data)
    
    # Recent queue entries
    recent_queue = supabase.table('processing_queue').select('*').order('created_at', desc=True).limit(5).execute()
    if recent_queue.data:
        for entry in recent_queue.data:
            summary["processing_queue"]["recent"].append({
                "id": entry.get('id'),
                "file_id": entry.get('file_id'),
                "status": entry.get('status'),
                "created_at": entry.get('created_at'),
                "error_message": entry.get('error_message')
            })
except Exception as e:
    print(f"Error analyzing processing_queue: {str(e)}")

# 3. Other tables
try:
    chunks = supabase.table('file_chunks').select('id', count='exact').execute()
    summary["file_chunks"]["total"] = chunks.count if hasattr(chunks, 'count') else len(chunks.data)
except:
    pass

try:
    courses = supabase.table('courses').select('id', count='exact').execute()
    summary["courses"]["total"] = courses.count if hasattr(courses, 'count') else len(courses.data)
except:
    pass

try:
    modules = supabase.table('modules').select('id', count='exact').execute()
    summary["modules"]["total"] = modules.count if hasattr(modules, 'count') else len(modules.data)
except:
    pass

# Print Summary
print("\n📊 FILES TABLE:")
print(f"  Total files: {summary['files']['total']}")
if has_processed_column:
    print(f"  Processed: {summary['files']['processed']}")
    print(f"  Unprocessed: {summary['files']['unprocessed']}")
else:
    print("  ⚠️  'processed' column not found - run add_processed_column.sql to add it")

print("\n📋 PROCESSING QUEUE:")
print(f"  Total entries: {summary['processing_queue']['total']}")
print("  By status:")
for status, count in summary['processing_queue']['by_status'].items():
    print(f"    - {status}: {count}")

print("\n📄 OTHER TABLES:")
print(f"  File chunks: {summary['file_chunks']['total']}")
print(f"  Courses: {summary['courses']['total']}")
print(f"  Modules: {summary['modules']['total']}")

if summary['files']['recent']:
    print("\n🕐 RECENT FILES:")
    for file in summary['files']['recent']:
        print(f"  - {file['filename']} (ID: {file['id'][:8]}...)")
        print(f"    Created: {file['created_at']}")
        print(f"    Processed: {file['processed']}")

if summary['processing_queue']['recent']:
    print("\n🔄 RECENT PROCESSING QUEUE ENTRIES:")
    for entry in summary['processing_queue']['recent']:
        print(f"  - File ID: {entry['file_id'][:8]}... | Status: {entry['status']}")
        if entry['error_message']:
            print(f"    Error: {entry['error_message'][:50]}...")

print("\n" + "=" * 60)

# SQL queries to run
print("\n📝 RECOMMENDED SQL QUERIES:")
print("\n1. To add 'processed' column to files table:")
print("   ALTER TABLE files ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;")
print("\n2. To check files with processing status:")
print("""   SELECT f.id, f.filename, pq.status as queue_status, f.processed
   FROM files f
   LEFT JOIN processing_queue pq ON f.id = pq.file_id
   ORDER BY f.created_at DESC
   LIMIT 10;""")
print("\n3. To mark files as processed based on queue:")
print("""   UPDATE files f
   SET processed = TRUE
   FROM processing_queue pq
   WHERE f.id = pq.file_id
   AND pq.status = 'completed';""")

print("\n" + "=" * 60)
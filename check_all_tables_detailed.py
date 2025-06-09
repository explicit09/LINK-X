#!/usr/bin/env python3
from supabase import create_client, Client
import json

# Supabase credentials
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

# Create Supabase client
supabase: Client = create_client(url, key)

print("=== COMPREHENSIVE TABLE CHECK ===\n")

# List of table names to try (both uppercase and lowercase)
table_variants = [
    "files", "Files", "File", "file",
    "file_chunks", "FileChunk", "FileChunks", "file_chunk",
    "processing_queue", "ProcessingQueue",
    "courses", "Course", "Courses",
    "modules", "Module", "Modules",
    "users", "User", "Users",
    "profiles", "Profile", "Profiles",
    "enrollments", "Enrollment", "Enrollments"
]

# Check each table variant
found_tables = []
for table_name in table_variants:
    try:
        result = supabase.table(table_name).select('*').limit(1).execute()
        count_result = supabase.table(table_name).select('id', count='exact').execute()
        count = count_result.count if hasattr(count_result, 'count') else len(count_result.data)
        
        print(f"✓ '{table_name}': EXISTS (rows: {count})")
        found_tables.append(table_name)
        
        # If we have data, show the structure
        if result.data and len(result.data) > 0:
            print(f"  Columns: {', '.join(result.data[0].keys())}")
        elif table_name.lower() in ['file', 'files']:
            # For empty file tables, try to understand structure
            print(f"  (Empty table, attempting column discovery...)")
            
    except Exception as e:
        # Only print if it's not a simple 'table not found' error
        error_str = str(e)
        if 'relation' not in error_str and 'does not exist' not in error_str:
            print(f"✗ '{table_name}': ERROR - {error_str}")

# Now check the actual File/files table structure
print("\n\n=== FILE TABLE DETAILED CHECK ===")
file_table_name = None
for name in ['File', 'files', 'file', 'Files']:
    try:
        supabase.table(name).select('id').limit(1).execute()
        file_table_name = name
        print(f"File table found as: '{name}'")
        break
    except:
        pass

if file_table_name:
    print(f"\nChecking structure of '{file_table_name}' table:")
    
    # Try to discover columns by testing common ones
    test_columns = [
        'id', 'module_id', 'title', 'filename', 'file_type', 'file_size',
        'file_data', 'transcription', 'created_at', 'updated_at',
        'user_id', 'course_id', 's3_url', 's3_key', 'storage_path',
        'supabase_storage_path', 'processed', 'processing_status',
        'view_count_raw', 'view_count_personalized', 'chat_count'
    ]
    
    existing_columns = []
    for col in test_columns:
        try:
            supabase.table(file_table_name).select(col).limit(1).execute()
            existing_columns.append(col)
        except:
            pass
    
    print(f"Discovered columns: {', '.join(existing_columns)}")
    
    # Try to get all data with discovered columns
    if existing_columns:
        try:
            all_data = supabase.table(file_table_name).select(','.join(existing_columns)).execute()
            print(f"\nTotal records in {file_table_name} table: {len(all_data.data)}")
            
            if all_data.data:
                print(f"\nMost recent file:")
                most_recent = sorted(all_data.data, key=lambda x: x.get('created_at', ''), reverse=True)[0]
                for k, v in most_recent.items():
                    print(f"  {k}: {v}")
        except Exception as e:
            print(f"Error fetching all data: {str(e)}")

# Check processing queue with correct case
print("\n\n=== PROCESSING QUEUE DETAILED CHECK ===")
pq_table_name = None
for name in ['processing_queue', 'ProcessingQueue']:
    try:
        supabase.table(name).select('id').limit(1).execute()
        pq_table_name = name
        print(f"Processing queue table found as: '{name}'")
        break
    except:
        pass

if pq_table_name:
    try:
        pq_all = supabase.table(pq_table_name).select('*').execute()
        print(f"Total records in processing queue: {len(pq_all.data)}")
        
        if pq_all.data:
            print("\nProcessing queue columns:")
            print(f"  {', '.join(pq_all.data[0].keys())}")
            
            # Show recent entries
            print("\nRecent processing queue entries:")
            for item in pq_all.data[:3]:
                print(f"  - File ID: {item.get('file_id')}, Status: {item.get('status')}, Error: {item.get('error_message', 'None')}")
    except Exception as e:
        print(f"Error checking processing queue: {str(e)}")
#!/usr/bin/env python3
import os
from supabase import create_client, Client
import json

# Supabase credentials
url = "https://jfutbxgkplrkyyucxhjn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM"

# Create Supabase client
supabase: Client = create_client(url, key)

print("=== FILE ACCESS PERMISSIONS CHECK ===\n")

# First, let's check if we can access files table
print("1. Testing basic file table access:")
try:
    result = supabase.table('files').select('id, title, filename, uploaded_by, created_by, module_id').limit(5).execute()
    if result.data:
        print(f"✓ Can access files table. Found {len(result.data)} files")
        for file in result.data:
            print(f"  - File: {file.get('title', 'N/A')} (ID: {file.get('id', 'N/A')})")
            print(f"    Uploaded by: {file.get('uploaded_by', 'N/A')}")
            print(f"    Created by: {file.get('created_by', 'N/A')}")
            print(f"    Module ID: {file.get('module_id', 'N/A')}")
    else:
        print("✓ Can access files table but no files found")
except Exception as e:
    print(f"✗ Error accessing files table: {str(e)}")

# Check modules table for course relationship
print("\n2. Checking module-course relationships:")
try:
    modules = supabase.table('modules').select('id, title, course_id').limit(5).execute()
    if modules.data:
        print(f"✓ Found {len(modules.data)} modules")
        for module in modules.data:
            print(f"  - Module: {module.get('title', 'N/A')} (ID: {module.get('id', 'N/A')})")
            print(f"    Course ID: {module.get('course_id', 'N/A')}")
except Exception as e:
    print(f"✗ Error accessing modules table: {str(e)}")

# Check enrollments to see course access
print("\n3. Checking course enrollments:")
try:
    enrollments = supabase.table('enrollments').select('id, user_id, course_id, role').limit(5).execute()
    if enrollments.data:
        print(f"✓ Found {len(enrollments.data)} enrollments")
        for enrollment in enrollments.data:
            print(f"  - User: {enrollment.get('user_id', 'N/A')} enrolled in Course: {enrollment.get('course_id', 'N/A')}")
            print(f"    Role: {enrollment.get('role', 'N/A')}")
except Exception as e:
    print(f"✗ Error accessing enrollments table: {str(e)}")

# Check if courses table has creator info
print("\n4. Checking course creators:")
try:
    courses = supabase.table('courses').select('id, title, creator_id').limit(5).execute()
    if courses.data:
        print(f"✓ Found {len(courses.data)} courses")
        for course in courses.data:
            print(f"  - Course: {course.get('title', 'N/A')} (ID: {course.get('id', 'N/A')})")
            print(f"    Creator: {course.get('creator_id', 'N/A')}")
except Exception as e:
    print(f"✗ Error accessing courses table: {str(e)}")

# Test file access with joins
print("\n5. Testing file access with course enrollment check:")
try:
    # This query simulates what the RLS policy might check
    files_with_access = supabase.table('files').select(
        'id, title, filename, module_id, modules!inner(course_id, courses!inner(id, title))'
    ).limit(5).execute()
    
    if files_with_access.data:
        print(f"✓ Can access files with module/course info. Found {len(files_with_access.data)} files")
        for file in files_with_access.data:
            print(f"  - File: {file.get('title', 'N/A')}")
            if 'modules' in file:
                print(f"    Course: {file['modules'].get('courses', {}).get('title', 'N/A')}")
    else:
        print("✓ Query succeeded but no files found")
except Exception as e:
    print(f"✗ Error with joined query: {str(e)}")

print("\n=== RECOMMENDATION ===")
print("""
If students cannot view their uploaded files, the issue might be:

1. Missing RLS policies on the 'files' table
2. Files not properly associated with modules/courses
3. Missing 'uploaded_by' or 'created_by' fields
4. Enrollment records not properly set up

To fix:
1. Ensure files have 'uploaded_by' field set to the student's user ID
2. Add RLS policy: Students can view files they uploaded
3. Add RLS policy: Students can view files in courses they're enrolled in
4. Verify enrollment records exist for students
""")
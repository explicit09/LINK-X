#!/usr/bin/env python3
"""
Check which table is used for student file uploads
"""
import os
import sys
from sqlalchemy import create_engine, text
import json

# Database connection from docker-compose.yml
DATABASE_URL = "postgresql://postgres:CoralX2024Database@localhost:5432/coralx"

def check_tables():
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if files table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'files'
                );
            """))
            files_exists = result.scalar()
            
            # Check if educational_materials table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'educational_materials'
                );
            """))
            edu_materials_exists = result.scalar()
            
            print(f"✓ 'files' table exists: {files_exists}")
            print(f"✓ 'educational_materials' table exists: {edu_materials_exists}")
            
            # Get files table structure
            if files_exists:
                print("\n=== FILES TABLE STRUCTURE ===")
                result = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'files'
                    ORDER BY ordinal_position;
                """))
                for row in result:
                    print(f"  - {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
                
                # Count records
                result = conn.execute(text("SELECT COUNT(*) FROM files"))
                count = result.scalar()
                print(f"\nTotal records in files table: {count}")
                
                # Check recent uploads
                result = conn.execute(text("""
                    SELECT id, title, filename, uploaded_by, created_at, storage_path, storage_bucket
                    FROM files
                    ORDER BY created_at DESC
                    LIMIT 5
                """))
                recent_files = result.fetchall()
                if recent_files:
                    print("\nRecent files:")
                    for f in recent_files:
                        print(f"  - {f[1]} ({f[2]}) by {f[3]} at {f[4]}")
                        print(f"    Storage: {f[6]}/{f[5]}")
            
            # Check educational_materials if exists
            if edu_materials_exists:
                print("\n=== EDUCATIONAL_MATERIALS TABLE STRUCTURE ===")
                result = conn.execute(text("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'educational_materials'
                    ORDER BY ordinal_position
                    LIMIT 10;
                """))
                for row in result:
                    print(f"  - {row[0]}: {row[1]}")
                    
                # Count records
                result = conn.execute(text("SELECT COUNT(*) FROM educational_materials"))
                count = result.scalar()
                print(f"\nTotal records in educational_materials table: {count}")
                
    except Exception as e:
        print(f"Error: {str(e)}")
        print("Make sure the database is running and accessible")

if __name__ == "__main__":
    check_tables()
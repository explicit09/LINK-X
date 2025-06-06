#!/usr/bin/env python3
"""
Check what tables exist in the database
"""
import sys
sys.path.insert(0, '/app/src')

from app import create_app

app = create_app()

with app.app_context():
    from core.database_supabase import db
    
    try:
        # Get all table names
        result = db.session.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = [row[0] for row in result.fetchall()]
        
        print(f"Found {len(tables)} tables:")
        for table in sorted(tables):
            print(f"  - {table}")
            
        # Also check for files-related tables
        print("\nLooking for file-related tables:")
        for table in tables:
            if 'file' in table.lower():
                print(f"  ✓ {table}")
                
        # Check specific table that might be the right one
        if 'file' not in [t.lower() for t in tables]:
            print("\n⚠️ No 'files' table found. Checking for alternatives...")
            # Try to find the actual files table name
            for table in tables:
                try:
                    result = db.session.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND column_name IN ('filename', 'title', 'module_id')")
                    cols = [row[0] for row in result.fetchall()]
                    if len(cols) >= 2:
                        print(f"  Potential files table: {table} (has columns: {cols})")
                except:
                    pass
                    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
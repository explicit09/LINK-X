#!/usr/bin/env python3

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment
load_dotenv()

# Database setup
POSTGRES_URL = os.getenv("POSTGRES_URL")
if not POSTGRES_URL:
    print("ERROR: POSTGRES_URL not set")
    exit(1)

engine = create_engine(POSTGRES_URL, pool_pre_ping=True, pool_recycle=1800)
Session = sessionmaker(bind=engine, expire_on_commit=False)

def check_files_status():
    """Check which files have missing FAISS indexing data"""
    db = Session()
    try:
        # Query files and their FAISS status
        query = text("""
            SELECT 
                f.id,
                f.title,
                f.filename,
                f.file_type,
                f.file_size,
                f.created_at,
                CASE 
                    WHEN f.index_faiss IS NULL THEN 'NO'
                    ELSE 'YES'
                END as has_faiss,
                CASE 
                    WHEN f.index_pkl IS NULL THEN 'NO'
                    ELSE 'YES'
                END as has_pkl
            FROM "File" f
            ORDER BY f.created_at DESC
            LIMIT 20
        """)
        
        result = db.execute(query)
        files = result.mappings().all()
        
        print("=== Recent Files Status ===")
        print(f"{'ID':<36} {'Title':<30} {'Type':<15} {'FAISS':<6} {'PKL':<6} {'Created'}")
        print("-" * 120)
        
        problematic_count = 0
        for file in files:
            status = "✅" if file['has_faiss'] == 'YES' and file['has_pkl'] == 'YES' else "❌"
            if status == "❌":
                problematic_count += 1
            
            file_id = str(file['id'])
            title = str(file['title'])[:29] if file['title'] else "Unknown"
            file_type = str(file['file_type'])[:14] if file['file_type'] else "Unknown"
            created = str(file['created_at']) if file['created_at'] else "Unknown"
            
            print(f"{file_id:<36} {title:<30} {file_type:<15} {file['has_faiss']:<6} {file['has_pkl']:<6} {created} {status}")
        
        print(f"\n📊 Summary:")
        print(f"Total files checked: {len(files)}")
        print(f"Files missing FAISS data: {problematic_count}")
        
        if problematic_count > 0:
            print(f"\n⚠️  Found {problematic_count} files that are missing FAISS indexing!")
            print("These files will timeout when trying to use 'Ask AI' feature.")
            print("\nRecommended actions:")
            print("1. Re-upload these files")
            print("2. Or run a batch FAISS processing job")
            
        return problematic_count > 0
            
    except Exception as e:
        print(f"Error checking files: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    check_files_status() 
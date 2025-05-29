#!/usr/bin/env python3
"""
Pre-flight check for pgvector migration.
Run this before starting the migration to ensure everything is ready.
"""
import os
import sys
import psycopg2
from datetime import datetime

def check_environment():
    """Check environment variables."""
    print("🔍 Checking environment...")
    
    postgres_url = os.getenv("POSTGRES_URL")
    if not postgres_url:
        print("  ❌ POSTGRES_URL not set!")
        return False
    else:
        print("  ✅ POSTGRES_URL is set")
    
    # Check if we can connect
    try:
        conn = psycopg2.connect(postgres_url)
        conn.close()
        print("  ✅ Database connection successful")
    except Exception as e:
        print(f"  ❌ Database connection failed: {e}")
        return False
    
    return True

def check_current_state(conn):
    """Check current database state."""
    print("\n📊 Checking current state...")
    
    with conn.cursor() as cur:
        # Check if FAISS columns exist
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('Course', 'File') 
            AND column_name IN ('index_pkl', 'index_faiss')
            ORDER BY table_name, column_name
        """)
        
        faiss_cols = cur.fetchall()
        if faiss_cols:
            print("  ⚠️  FAISS columns found (will be removed):")
            for col in faiss_cols:
                print(f"    - {col[0]}")
        else:
            print("  ℹ️  FAISS columns already removed")
        
        # Check FileChunk table
        cur.execute("SELECT COUNT(*) FROM \"FileChunk\"")
        chunk_count = cur.fetchone()[0]
        print(f"  📁 FileChunk rows: {chunk_count:,}")
        
        if chunk_count == 0:
            print("  ⚠️  No chunks found - vector index won't be created")
        
        # Check existing indexes
        cur.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'FileChunk'
        """)
        
        indexes = [row[0] for row in cur.fetchall()]
        print(f"  🗂️  Existing indexes: {', '.join(indexes) if indexes else 'None'}")
        
        # Check pgvector extension
        cur.execute("""
            SELECT 1 
            FROM pg_extension 
            WHERE extname = 'vector'
        """)
        
        if cur.fetchone():
            print("  ✅ pgvector extension installed")
        else:
            print("  ❌ pgvector extension NOT installed!")
            return False
    
    return True

def check_disk_space(conn):
    """Check available disk space."""
    print("\n💾 Checking disk space...")
    
    with conn.cursor() as cur:
        # Get database size
        cur.execute("""
            SELECT pg_size_pretty(pg_database_size(current_database()))
        """)
        db_size = cur.fetchone()[0]
        print(f"  Database size: {db_size}")
        
        # Estimate space needed for migration
        cur.execute("""
            SELECT 
                pg_size_pretty(pg_total_relation_size('\"FileChunk\"')) as filechunk_size,
                pg_size_pretty(pg_total_relation_size('\"Course\"')) as course_size,
                pg_size_pretty(pg_total_relation_size('\"File\"')) as file_size
        """)
        
        sizes = cur.fetchone()
        print(f"  Table sizes - FileChunk: {sizes[0]}, Course: {sizes[1]}, File: {sizes[2]}")
        
    return True

def check_active_connections(conn):
    """Check for active connections."""
    print("\n👥 Checking active connections...")
    
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE state = 'active') as active,
                COUNT(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
            FROM pg_stat_activity
            WHERE datname = current_database()
            AND pid != pg_backend_pid()
        """)
        
        stats = cur.fetchone()
        print(f"  Total connections: {stats[0]}")
        print(f"  Active queries: {stats[1]}")
        print(f"  Waiting connections: {stats[2]}")
        
        if stats[1] > 10:
            print("  ⚠️  High number of active queries - consider waiting")
    
    return True

def main():
    """Run all pre-flight checks."""
    print("=== PgVector Migration Pre-flight Check ===")
    print(f"Started at: {datetime.now()}\n")
    
    # Check environment
    if not check_environment():
        print("\n❌ Environment check failed!")
        sys.exit(1)
    
    # Connect to database
    try:
        conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
        
        # Run checks
        if not check_current_state(conn):
            print("\n❌ State check failed!")
            sys.exit(1)
        
        check_disk_space(conn)
        check_active_connections(conn)
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    
    print("\n✅ All pre-flight checks passed!")
    print("\nNext steps:")
    print("1. Run migration step 1 (create indexes): python migrate_to_pgvector.py")
    print("2. Schedule maintenance window")
    print("3. Follow MIGRATION_EXECUTION_GUIDE.md")
    
    print(f"\nCompleted at: {datetime.now()}")

if __name__ == "__main__":
    main()
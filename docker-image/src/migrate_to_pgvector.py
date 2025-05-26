#!/usr/bin/env python3
"""
Safe migration script to remove FAISS and optimize pgvector.
Run this during a maintenance window.
"""
import os
import sys
import argparse
import psycopg2
from datetime import datetime

def get_connection():
    """Get database connection from environment."""
    postgres_url = os.getenv("POSTGRES_URL")
    if not postgres_url:
        raise RuntimeError("POSTGRES_URL not set")
    return psycopg2.connect(postgres_url)

def step_1_create_indexes_concurrently(conn):
    """Create indexes concurrently - can be run before maintenance."""
    print("Step 1: Creating indexes concurrently...")
    
    indexes = [
        ("idx_filechunk_course_id", '"FileChunk" (course_id)'),
        ("idx_filechunk_file_id", '"FileChunk" (file_id)'),
        # Note: created_at index will be created after adding the column
    ]
    
    with conn.cursor() as cur:
        for idx_name, idx_def in indexes:
            # Check if index exists
            cur.execute("""
                SELECT 1 FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname = %s
            """, (idx_name,))
            
            if cur.fetchone():
                print(f"  Index {idx_name} already exists, skipping...")
            else:
                print(f"  Creating index {idx_name}...")
                # Must commit before CONCURRENTLY
                conn.commit()
                conn.autocommit = True
                try:
                    cur.execute(f"CREATE INDEX CONCURRENTLY {idx_name} ON {idx_def}")
                    print(f"  ✓ Index {idx_name} created")
                except Exception as e:
                    print(f"  ✗ Failed to create {idx_name}: {e}")
                finally:
                    conn.autocommit = False

def create_created_at_index(conn):
    """Create the created_at index after the column is added."""
    print("  Creating created_at index...")
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # Check if index exists
            cur.execute("""
                SELECT 1 FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname = 'idx_filechunk_created_at'
            """)
            
            if cur.fetchone():
                print("  Index idx_filechunk_created_at already exists, skipping...")
            else:
                cur.execute('CREATE INDEX CONCURRENTLY idx_filechunk_created_at ON "FileChunk" (created_at)')
                print("  ✓ Index idx_filechunk_created_at created")
    except Exception as e:
        print(f"  ✗ Failed to create created_at index: {e}")
    finally:
        conn.autocommit = False

def step_2_check_chunk_count(conn):
    """Check if we have enough chunks for vector index."""
    with conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "FileChunk"')
        count = cur.fetchone()[0]
        print(f"\nStep 2: FileChunk count check")
        print(f"  Current chunks: {count}")
        if count < 1000:
            print("  ⚠️  Warning: Less than 1000 chunks. Vector index will be less effective.")
        return count

def step_3_maintenance_migration(conn, auto_confirm=False):
    """Main migration - must be run during maintenance window."""
    print("\nStep 3: Main migration (MAINTENANCE WINDOW REQUIRED)")
    print("  ⚠️  This will lock tables briefly. Ensure uploads are disabled!")
    
    if auto_confirm:
        print("  Auto-confirming migration...")
        response = "yes"
    else:
        response = input("  Continue with migration? (yes/no): ")
    
    if response.lower() != 'yes':
        print("  Migration cancelled.")
        return False
    
    try:
        with conn.cursor() as cur:
            # Add new columns if needed
            print("  Adding new columns...")
            cur.execute("""
                ALTER TABLE "FileChunk" 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS chunk_metadata JSONB
            """)
            
            # Optimize storage
            print("  Optimizing vector storage...")
            cur.execute('ALTER TABLE "FileChunk" ALTER COLUMN embedding SET STORAGE PLAIN')
            
            # Drop FAISS columns
            print("  Dropping FAISS columns from Course...")
            cur.execute("""
                ALTER TABLE "Course" 
                DROP COLUMN IF EXISTS index_pkl,
                DROP COLUMN IF EXISTS index_faiss
            """)
            
            print("  Dropping FAISS columns from File...")
            cur.execute("""
                ALTER TABLE "File"
                DROP COLUMN IF EXISTS index_pkl,
                DROP COLUMN IF EXISTS index_faiss
            """)
            
            conn.commit()
            
            # Create the created_at index now that the column exists
            create_created_at_index(conn)
            
            print("  ✓ Migration completed successfully")
            return True
            
    except Exception as e:
        conn.rollback()
        print(f"  ✗ Migration failed: {e}")
        return False

def step_4_create_vector_index(conn, chunk_count):
    """Create vector index if we have enough data."""
    print("\nStep 4: Vector index creation")
    
    if chunk_count < 100:
        print("  Skipping vector index - not enough data yet")
        return
    
    # Calculate optimal lists parameter
    lists = max(10, min(1000, int((chunk_count / 1000) ** 0.5 * 50)))
    
    print(f"  Creating HNSW index (recommended for PostgreSQL 16+)...")
    print(f"  Chunk count: {chunk_count}, calculated lists: {lists}")
    
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # Try HNSW first (better performance)
            try:
                cur.execute("""
                    CREATE INDEX CONCURRENTLY idx_filechunk_embedding_hnsw 
                    ON "FileChunk" 
                    USING hnsw (embedding vector_cosine_ops) 
                    WITH (m = 16, ef_construction = 64)
                """)
                print("  ✓ HNSW index created")
            except Exception as e:
                print(f"  HNSW failed ({e}), trying ivfflat...")
                cur.execute(f"""
                    CREATE INDEX CONCURRENTLY idx_filechunk_embedding_ivfflat
                    ON "FileChunk" 
                    USING ivfflat (embedding vector_cosine_ops) 
                    WITH (lists = {lists})
                """)
                print(f"  ✓ IVFFlat index created with lists={lists}")
                
    except Exception as e:
        print(f"  ✗ Vector index creation failed: {e}")
    finally:
        conn.autocommit = False

def step_5_vacuum_analyze(conn):
    """Vacuum and analyze tables."""
    print("\nStep 5: Vacuum and analyze")
    conn.autocommit = True
    
    tables = ["FileChunk", "Course", "File"]
    with conn.cursor() as cur:
        for table in tables:
            try:
                print(f"  Analyzing {table}...")
                cur.execute(f'ANALYZE "{table}"')
                print(f"  ✓ {table} analyzed")
            except Exception as e:
                print(f"  ✗ Failed to analyze {table}: {e}")
    
    conn.autocommit = False

def verify_migration(conn):
    """Verify migration was successful."""
    print("\nVerification:")
    with conn.cursor() as cur:
        # Check columns were dropped
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('Course', 'File') 
            AND column_name IN ('index_pkl', 'index_faiss')
        """)
        
        faiss_cols = cur.fetchall()
        if faiss_cols:
            print("  ✗ FAISS columns still exist:", faiss_cols)
            return False
        else:
            print("  ✓ FAISS columns successfully removed")
        
        # Check indexes exist
        cur.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'FileChunk'
        """)
        
        indexes = [row[0] for row in cur.fetchall()]
        print(f"  ✓ FileChunk indexes: {', '.join(indexes)}")
        
        return True

def main():
    """Run the migration."""
    parser = argparse.ArgumentParser(description='PgVector Migration Script')
    parser.add_argument('--auto-confirm', action='store_true', 
                       help='Auto-confirm migration without prompting')
    parser.add_argument('--step', type=int, choices=[1, 2, 3, 4, 5], 
                       help='Run only a specific step')
    args = parser.parse_args()
    
    print("=== PgVector Migration Script ===")
    print(f"Started at: {datetime.now()}")
    
    conn = get_connection()
    
    try:
        # Step 1: Create regular indexes (can be done before maintenance)
        if not args.step or args.step == 1:
            step_1_create_indexes_concurrently(conn)
        
        # Step 2: Check data volume
        if not args.step or args.step == 2:
            chunk_count = step_2_check_chunk_count(conn)
        else:
            # Still need chunk count for later steps
            with conn.cursor() as cur:
                cur.execute('SELECT COUNT(*) FROM "FileChunk"')
                chunk_count = cur.fetchone()[0]
        
        # Step 3: Main migration (requires maintenance window)
        if not args.step or args.step == 3:
            migration_success = step_3_maintenance_migration(conn, args.auto_confirm)
        else:
            migration_success = True
            
        if migration_success:
            
            # Step 4: Create vector index if enough data
            if not args.step or args.step == 4:
                step_4_create_vector_index(conn, chunk_count)
            
            # Step 5: Vacuum and analyze
            if not args.step or args.step == 5:
                step_5_vacuum_analyze(conn)
            
            # Verify (only if running all steps or step 3/4/5)
            if not args.step or args.step in [3, 4, 5]:
                if verify_migration(conn):
                    print("\n✅ Migration completed successfully!")
                    print("Next steps:")
                    print("1. Deploy the updated code without FAISS references")
                    print("2. Run load tests to verify performance")
                    print("3. Re-enable uploads")
                else:
                    print("\n⚠️  Migration completed with warnings")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        conn.close()
    
    print(f"\nCompleted at: {datetime.now()}")

if __name__ == "__main__":
    main()
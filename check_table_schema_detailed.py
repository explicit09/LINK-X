#!/usr/bin/env python3
import psycopg2
from psycopg2.extras import RealDictCursor
import os

# Try to connect directly to the database
# Using the Supabase project URL components
db_params = {
    'host': 'db.jfutbxgkplrkyyucxhjn.supabase.co',
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres',  # This might need to be updated
    'port': '5432'
}

print("=== DETAILED TABLE SCHEMA CHECK ===\n")

try:
    # Try environment variables first
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        conn = psycopg2.connect(db_url)
    else:
        # Try with guessed parameters
        conn = psycopg2.connect(**db_params)
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get files table schema
    print("FILES TABLE SCHEMA:")
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'files'
        ORDER BY ordinal_position;
    """)
    
    columns = cur.fetchall()
    if columns:
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']}, default: {col['column_default']})")
    else:
        print("  No schema information found for 'files' table")
    
    # Get processing_queue table schema
    print("\n\nPROCESSING_QUEUE TABLE SCHEMA:")
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'processing_queue'
        ORDER BY ordinal_position;
    """)
    
    columns = cur.fetchall()
    if columns:
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']}, default: {col['column_default']})")
    else:
        print("  No schema information found for 'processing_queue' table")
    
    # Get all tables in the public schema
    print("\n\nALL TABLES IN DATABASE:")
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    
    tables = cur.fetchall()
    for table in tables:
        print(f"  - {table['table_name']}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Could not connect directly to PostgreSQL: {str(e)}")
    print("\nFalling back to Supabase REST API approach...")
    
    # Use REST API approach
    import requests
    
    headers = {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM'
    }
    
    # Try to get table information via REST API
    url = "https://jfutbxgkplrkyyucxhjn.supabase.co/rest/v1/"
    
    # Get files table info
    try:
        response = requests.get(url + "files?limit=0", headers=headers)
        print(f"\nFiles table REST API response: {response.status_code}")
    except Exception as e:
        print(f"REST API error: {str(e)}")

print("\n=== END OF DETAILED SCHEMA CHECK ===")
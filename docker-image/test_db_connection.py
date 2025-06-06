#!/usr/bin/env python3
"""Test database connection to Supabase"""
import os
import psycopg2
from psycopg2 import sql

# Connection parameters from the URL you provided
# postgresql://postgres:[YOUR-PASSWORD]@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres
# With the actual password: DjGJCVNYksijOQuG

print("Testing database connections...")

# Try different host formats
hosts = [
    # Format 1: Direct host as provided
    {
        "host": "db.torsffahnivnzcnjnxgc.supabase.co",
        "port": 5432,
        "database": "postgres",
        "user": "postgres",
        "password": "DjGJCVNYksijOQuG"
    },
    # Format 2: AWS pooler (the one that was working before)
    {
        "host": "aws-0-us-east-2.pooler.supabase.com",
        "port": 6543,
        "database": "postgres",
        "user": "postgres.torsffahnivnzcnjnxgc",
        "password": "DjGJCVNYksijOQuG"
    }
]

for i, params in enumerate(hosts):
    print(f"\nTesting connection {i+1}: {params['host']}:{params['port']}")
    try:
        conn = psycopg2.connect(**params)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"✓ Connected successfully!")
        print(f"  PostgreSQL version: {version[0][:50]}...")
        
        # Check for users table
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            )
        """)
        has_users_table = cursor.fetchone()[0]
        print(f"  Users table exists: {has_users_table}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
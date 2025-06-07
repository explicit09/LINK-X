#!/usr/bin/env python3
"""
Test database and API connections
"""
import os
import sys
sys.path.append('./src')

from dotenv import load_dotenv
load_dotenv('.env')

print("Testing connections...\n")

# Test 1: Direct PostgreSQL connection
print("1. Testing PostgreSQL connection via SQLAlchemy")
try:
    from sqlalchemy import create_engine, text
    
    # Try Supabase database URL
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print(f"   DATABASE_URL found: {database_url[:30]}...")
        engine = create_engine(database_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM file_chunks")).scalar()
            print(f"   ✅ Connected! file_chunks count: {result}")
    else:
        print("   ❌ DATABASE_URL not found")
        
except Exception as e:
    print(f"   ❌ PostgreSQL connection failed: {e}")

# Test 2: Supabase client
print("\n2. Testing Supabase client")
try:
    from supabase import create_client
    
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    print(f"   URL: {url[:30]}...")
    print(f"   Key: {'SET' if key else 'NOT SET'}")
    
    # Try with service role key
    supabase = create_client(url, key)
    
    # Test a simple query
    result = supabase.table('file_chunks').select('count', count='exact').execute()
    print(f"   ✅ Supabase client connected!")
    
except Exception as e:
    print(f"   ❌ Supabase client failed: {e}")
    
    # Try with anon key
    print("\n   Trying with anon key...")
    try:
        anon_key = os.getenv('SUPABASE_ANON_KEY')
        if anon_key:
            supabase = create_client(url, anon_key)
            result = supabase.table('file_chunks').select('count', count='exact').execute()
            print(f"   ✅ Connected with anon key!")
        else:
            print("   ❌ No anon key found")
    except Exception as e2:
        print(f"   ❌ Anon key also failed: {e2}")

# Test 3: Check embedding progress using SQLAlchemy
print("\n3. Checking embedding status via SQL")
try:
    if database_url:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
                    COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings,
                    COUNT(*) as total
                FROM file_chunks
            """)).first()
            
            print(f"   Total chunks: {result.total}")
            print(f"   With embeddings: {result.with_embeddings}")
            print(f"   Without embeddings: {result.without_embeddings}")
            
            if result.total > 0:
                percent = (result.with_embeddings / result.total) * 100
                print(f"   Completion: {percent:.1f}%")
                
except Exception as e:
    print(f"   ❌ Failed to check embeddings: {e}")

# Test 4: OpenAI
print("\n4. Testing OpenAI")
try:
    from openai import OpenAI
    
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        client = OpenAI(api_key=api_key)
        
        # Quick test
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Reply with OK"}],
            max_tokens=5
        )
        
        print(f"   ✅ OpenAI connected: {response.choices[0].message.content}")
    else:
        print("   ❌ No OpenAI API key")
        
except Exception as e:
    print(f"   ❌ OpenAI failed: {e}")

print("\n✅ = Working, ❌ = Not working")
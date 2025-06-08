#!/usr/bin/env python3
"""
Test script to verify Supabase authentication configuration
"""
import os
import sys
import logging

# Add the src directory to path
sys.path.insert(0, './src')

# Set up basic logging
logging.basicConfig(level=logging.DEBUG)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv('.env')
    print("✅ Loaded .env file")
except ImportError:
    print("⚠️ python-dotenv not available, using system env")

# Check if Supabase variables are loaded
print('SUPABASE_URL:', os.getenv('SUPABASE_URL', 'NOT SET'))
print('SUPABASE_JWT_SECRET exists:', bool(os.getenv('SUPABASE_JWT_SECRET')))
print('SUPABASE_ANON_KEY exists:', bool(os.getenv('SUPABASE_ANON_KEY')))

# Test auth service initialization
try:
    from services.auth.supabase_auth_service import get_auth_service
    auth_service = get_auth_service()
    print('✅ Auth service initialized:', auth_service is not None)
    
    # Test if we can create a client
    if hasattr(auth_service, 'client') and auth_service.client:
        print('✅ Supabase client created successfully')
    else:
        print('❌ Supabase client is None')
        
except Exception as e:
    print('❌ Auth service error:', e)
    import traceback
    traceback.print_exc()

# Test simple auth service
try:
    from services.auth.simple_auth_service import get_simple_auth_service
    simple_auth = get_simple_auth_service()
    print('✅ Simple auth service initialized:', simple_auth is not None)
except Exception as e:
    print('❌ Simple auth service error:', e)
    import traceback
    traceback.print_exc()

print("\nTest completed.") 
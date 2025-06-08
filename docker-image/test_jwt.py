#!/usr/bin/env python3
"""
Test JWT token verification with Supabase secret
"""
import os
import sys
import jwt
from datetime import datetime

# Set environment variables
os.environ['SUPABASE_JWT_SECRET'] = 'EBdk62TNJ2Ku7oMGN4ZXCjIOsg17P9PydhA9/orqUYV+cADaT/ZbTFMpCo90FfG05StLcKdrfH9zDeqLI2xIRg=='

# Add src to path
sys.path.insert(0, './src')

# Test token from the logs (this is the one that failed)
test_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IlgzZnVuZVpMbnZnbzRrTTYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3RvcnNmZmFobml2bnpjbmpueGdjLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5ZGJhNzNhNy1hNzJhLTQ5YzQtOGJhNy1hNzJhNDljNDhiYTciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzMzNjI5NzY5LCJpYXQiOjE3MzM2MjYxNjksImVtYWlsIjoidGFkaXdhc2FuZGVyc29uQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzMzNjI2MTY5fV0sInNlc3Npb25faWQiOiJkNzJhNzNhNy1hNzJhLTQ5YzQtOGJhNy1hNzJhNDljNDhiYTcifQ.wZDPyZkW3KcDIBjEMAM5iA-WkCx2EksCuU32VgrIF8M"

print("Testing JWT token verification...")
print(f"Token: {test_token[:50]}...")

# Check expiration first
try:
    # Decode without verification to check expiration
    unverified = jwt.decode(test_token, options={"verify_signature": False})
    exp_timestamp = unverified.get('exp')
    if exp_timestamp:
        exp_date = datetime.fromtimestamp(exp_timestamp)
        now = datetime.now()
        print(f"Token expires: {exp_date}")
        print(f"Current time: {now}")
        print(f"Token expired: {exp_date < now}")
        
        if exp_date < now:
            print("❌ TOKEN IS EXPIRED - This is why authentication is failing!")
            sys.exit(1)
    
    print("✅ Token is not expired")
    
except Exception as e:
    print(f"❌ Error checking expiration: {e}")

# Test with our simple auth service
try:
    from services.auth.simple_auth_service import get_simple_auth_service
    auth_service = get_simple_auth_service()
    
    print(f"JWT Secret configured: {bool(auth_service.jwt_secret)}")
    print(f"JWT Secret length: {len(auth_service.jwt_secret) if auth_service.jwt_secret else 0}")
    
    user = auth_service.verify_token(test_token)
    if user:
        print(f"✅ Token verification successful!")
        print(f"User ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
    else:
        print("❌ Token verification failed")
        
except Exception as e:
    print(f"❌ Error with simple auth service: {e}")
    import traceback
    traceback.print_exc()

print("\nTest completed.") 
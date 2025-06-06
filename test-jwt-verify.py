#!/usr/bin/env python3
import jwt
import sys

# The JWT secret from our configuration
JWT_SECRET = "EBdk62TNJ2Ku7oMGN4ZXCjIOsg17P9PydhA9/orqUYV+cADaT/ZbTFMpCo90FfG05StLcKdrfH9zDeqLI2xIRg=="

# Test token - you'll need to replace this with a real token from the browser
test_token = sys.argv[1] if len(sys.argv) > 1 else "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMzc3MzcsImV4cCI6MjA2NDcxMzczN30.RSplRmOfX5noj_MDpRIRRgUbUYSvlaCXyUGc8PUiySA"

print(f"Testing JWT verification...")
print(f"Token: {test_token[:50]}...")
print(f"Secret: {JWT_SECRET[:20]}...")

try:
    # Try to decode without verification first to see the payload
    unverified = jwt.decode(test_token, options={"verify_signature": False})
    print("\nUnverified payload:")
    for key, value in unverified.items():
        print(f"  {key}: {value}")
    
    # Now try with verification
    print("\nVerifying with secret...")
    verified = jwt.decode(
        test_token,
        JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_exp": True, "verify_aud": False}
    )
    print("✓ Token verified successfully!")
    print("\nVerified payload:")
    for key, value in verified.items():
        print(f"  {key}: {value}")
        
except jwt.InvalidTokenError as e:
    print(f"✗ Token verification failed: {e}")
except Exception as e:
    print(f"✗ Error: {e}")
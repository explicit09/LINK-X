"""
Test Supabase authentication flow
"""
import os
import jwt

# Mock Supabase token for testing
jwt_secret = 'EBdk62TNJ2Ku7oMGN4ZXCjIOsg17P9PydhA9/orqUYV+cADaT/ZbTFMpCo90FfG05StLcKdrfH9zDeqLI2xIRg=='

# Let's decode a sample token to see what's in it
sample_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYzhjYTQ3NS04ZDg3LTQ1MTAtODY2Zi0xZmI3Y2YyZDdjMjEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3NDkxODI2MzcsImV4cCI6MTc0OTE4NjIzN30.00oA7BwWUem-VsLys9YfXSZx1KV4tEf8NTtlfwT4hxY"

try:
    # Decode without verification to see contents
    payload = jwt.decode(sample_token, options={"verify_signature": False})
    print("Token payload:")
    for key, value in payload.items():
        print(f"  {key}: {value}")
    
    # Try to verify with our secret
    try:
        verified = jwt.decode(sample_token, jwt_secret, algorithms=['HS256'])
        print("\nToken verified successfully!")
    except jwt.ExpiredSignatureError:
        print("\nToken is expired")
    except Exception as e:
        print(f"\nToken verification failed: {e}")
        
except Exception as e:
    print(f"Error decoding token: {e}")
    
# Test database lookup
print("\nTesting database lookup...")
import psycopg2

conn = psycopg2.connect('postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')
cur = conn.cursor()

# Check our test user
cur.execute("""
    SELECT id, email, firebase_uid, created_at
    FROM users
    WHERE id = %s OR firebase_uid = %s
""", ('0c8ca475-8d87-4510-866f-1fb7cf2d7c21', '0c8ca475-8d87-4510-866f-1fb7cf2d7c21'))

user = cur.fetchone()
if user:
    print(f"User found:")
    print(f"  ID: {user[0]}")
    print(f"  Email: {user[1]}")
    print(f"  Firebase UID: {user[2]}")
    print(f"  Created: {user[3]}")
else:
    print("User not found in database")

cur.close()
conn.close()
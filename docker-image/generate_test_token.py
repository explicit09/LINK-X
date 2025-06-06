"""
Generate a test JWT token for Supabase authentication
"""
import jwt
import os
from datetime import datetime, timedelta

# Get JWT secret from environment
jwt_secret = os.getenv('SUPABASE_JWT_SECRET', 'EBdk62TNJ2Ku7oMGN4ZXCjIOsg17P9PydhA9/orqUYV+cADaT/ZbTFMpCo90FfG05StLcKdrfH9zDeqLI2xIRg==')

# Test user data
user_data = {
    'sub': '0c8ca475-8d87-4510-866f-1fb7cf2d7c21',  # Our test user ID
    'email': 'test@example.com',
    'role': 'authenticated',
    'aud': 'authenticated',
    'iat': datetime.utcnow(),
    'exp': datetime.utcnow() + timedelta(hours=1)
}

# Generate token
token = jwt.encode(user_data, jwt_secret, algorithm='HS256')
print(f"Bearer {token}")
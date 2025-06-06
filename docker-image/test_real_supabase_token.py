"""
Test with a real Supabase token structure
"""
import jwt
import json
from datetime import datetime, timedelta
import uuid

# Supabase JWT secret
jwt_secret = 'EBdk62TNJ2Ku7oMGN4ZXCjIOsg17P9PydhA9/orqUYV+cADaT/ZbTFMpCo90FfG05StLcKdrfH9zDeqLI2xIRg=='

# Create a token that looks like a real Supabase auth token
# Based on Supabase's typical JWT structure
payload = {
    "aud": "authenticated",
    "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
    "iat": int(datetime.utcnow().timestamp()),
    "iss": "https://torsffahnivnzcnjnxgc.supabase.co/auth/v1",
    "sub": str(uuid.uuid4()),  # New user ID
    "email": "frontend@test.com",
    "phone": "",
    "app_metadata": {
        "provider": "email",
        "providers": ["email"]
    },
    "user_metadata": {
        "full_name": "Frontend Test User"
    },
    "role": "authenticated",
    "aal": "aal1",
    "amr": [
        {
            "method": "password",
            "timestamp": int(datetime.utcnow().timestamp())
        }
    ],
    "session_id": str(uuid.uuid4())
}

# Generate token
token = jwt.encode(payload, jwt_secret, algorithm='HS256')
print("Supabase-style JWT token:")
print(f"Bearer {token}")
print("\nToken claims:")
print(json.dumps(payload, indent=2))

# Test verification
try:
    verified = jwt.decode(
        token, 
        jwt_secret, 
        algorithms=['HS256'],
        options={
            "verify_exp": True,
            "verify_aud": False,  # Don't verify audience
            "verify_iss": False   # Don't verify issuer
        }
    )
    print("\nToken verified successfully!")
    print(f"User ID: {verified['sub']}")
    print(f"Email: {verified['email']}")
except Exception as e:
    print(f"\nToken verification failed: {e}")
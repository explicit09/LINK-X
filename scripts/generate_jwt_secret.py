#!/usr/bin/env python3
"""Generate secure JWT secret key"""

import secrets
import sys

def generate_jwt_secret():
    """Generate a cryptographically secure JWT secret key"""
    # Generate 64-byte (512-bit) URL-safe secret
    secret = secrets.token_urlsafe(64)
    
    print("Generated JWT Secret Key:")
    print("=" * 60)
    print(secret)
    print("=" * 60)
    print()
    print("To use this key:")
    print("1. Add to your .env file:")
    print(f"   JWT_SECRET_KEY={secret}")
    print()
    print("2. Or export as environment variable:")
    print(f"   export JWT_SECRET_KEY='{secret}'")
    print()
    print("IMPORTANT: Keep this key secret and never commit it to version control!")

if __name__ == "__main__":
    generate_jwt_secret()
#!/usr/bin/env python3
"""
Generate secure secrets for production environment
Run: python3 scripts/generate_secrets.py
"""

import secrets
import string
import base64
import os
from cryptography.fernet import Fernet
from datetime import datetime


def generate_secret_key(length=32):
    """Generate a URL-safe secret key"""
    return secrets.token_urlsafe(length)


def generate_password(length=24):
    """Generate a strong password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_jwt_secret():
    """Generate a JWT secret key"""
    return base64.b64encode(os.urandom(64)).decode('utf-8')


def generate_encryption_key():
    """Generate Fernet encryption key"""
    return Fernet.generate_key().decode('utf-8')


def main():
    print("🔐 LEARN-X Production Secrets Generator")
    print("=" * 50)
    print(f"Generated at: {datetime.utcnow().isoformat()}Z")
    print("\n⚠️  IMPORTANT: Save these secrets securely!")
    print("⚠️  Never commit them to version control!")
    print("\n" + "=" * 50 + "\n")
    
    # Flask Secret Key
    print("# Flask Configuration")
    print(f"SECRET_KEY={generate_secret_key()}")
    print()
    
    # Database Password
    print("# Database Configuration")
    print(f"DB_PASSWORD={generate_password()}")
    print()
    
    # Redis Password
    print("# Redis Configuration")
    print(f"REDIS_PASSWORD={generate_password(32)}")
    print()
    
    # JWT Secrets
    print("# JWT Configuration")
    print(f"JWT_SECRET_KEY={generate_jwt_secret()}")
    print(f"JWT_REFRESH_SECRET={generate_jwt_secret()}")
    print()
    
    # Encryption Keys
    print("# Encryption Keys")
    print(f"ENCRYPTION_KEY={generate_encryption_key()}")
    print(f"BACKUP_ENCRYPTION_KEY={generate_encryption_key()}")
    print()
    
    # API Keys (placeholders)
    print("# API Keys (replace with actual values)")
    print(f"INTERNAL_API_KEY={generate_secret_key(48)}")
    print(f"WEBHOOK_SIGNING_SECRET={generate_secret_key(32)}")
    print()
    
    # Session Keys
    print("# Session Configuration")
    print(f"SESSION_ENCRYPTION_KEY={generate_secret_key(32)}")
    print(f"CSRF_SECRET_KEY={generate_secret_key(32)}")
    print()
    
    # Admin Credentials
    print("# Initial Admin User")
    print(f"ADMIN_EMAIL=admin@learnx.com")
    print(f"ADMIN_PASSWORD={generate_password(32)}")
    print()
    
    print("=" * 50)
    print("\n✅ Secrets generated successfully!")
    print("\nNext steps:")
    print("1. Copy these values to your .env.production file")
    print("2. Store the .env.production file securely")
    print("3. Set up secret management (AWS Secrets Manager, HashiCorp Vault, etc.)")
    print("4. Rotate these secrets regularly")


if __name__ == "__main__":
    main()
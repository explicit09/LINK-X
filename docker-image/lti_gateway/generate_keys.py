#!/usr/bin/env python3
"""
Generate RSA key pair for LTI 1.3 JWT signing
SECURITY: Run this once, store keys securely
"""

import json
import os
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import uuid

def generate_key_pair():
    """Generate RSA key pair for LTI 1.3"""
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Get public key
    public_key = private_key.public_key()
    
    # Serialize private key
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Serialize public key
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return private_pem, public_pem, private_key, public_key

def create_jwks(public_key, key_id=None):
    """Create JWKS from public key"""
    if key_id is None:
        key_id = str(uuid.uuid4())
    
    # Get public key numbers
    public_numbers = public_key.public_key().public_numbers()
    
    # Convert to base64url
    import base64
    
    def int_to_base64url(value):
        """Convert integer to base64url"""
        # Convert to bytes with proper padding
        byte_length = (value.bit_length() + 7) // 8
        value_bytes = value.to_bytes(byte_length, 'big')
        # Base64url encode (no padding)
        return base64.urlsafe_b64encode(value_bytes).decode('ascii').rstrip('=')
    
    n = int_to_base64url(public_numbers.n)
    e = int_to_base64url(public_numbers.e)
    
    jwks = {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "kid": key_id,
                "n": n,
                "e": e,
                "alg": "RS256"
            }
        ]
    }
    
    return jwks, key_id

def main():
    """Generate keys and save to files"""
    print("🔑 Generating LTI 1.3 RSA key pair...")
    
    # Create configs directory if it doesn't exist
    os.makedirs('configs', exist_ok=True)
    
    # Generate key pair
    private_pem, public_pem, private_key, public_key = generate_key_pair()
    
    # Create JWKS
    jwks, key_id = create_jwks(private_key)
    
    # Save private key
    with open('configs/private.key', 'wb') as f:
        f.write(private_pem)
    print("✅ Private key saved to configs/private.key")
    
    # Save public key
    with open('configs/public.key', 'wb') as f:
        f.write(public_pem)
    print("✅ Public key saved to configs/public.key")
    
    # Save JWKS
    with open('configs/public.jwks', 'w') as f:
        json.dump(jwks, f, indent=2)
    print("✅ JWKS saved to configs/public.jwks")
    
    print(f"\n🔑 Key ID: {key_id}")
    print("\n🚨 SECURITY REMINDERS:")
    print("1. Store private.key securely (AWS Secrets Manager/Vault)")
    print("2. Never commit private.key to git")
    print("3. Rotate keys quarterly")
    print("4. Use different keys for dev/staging/prod")
    
    # Create .gitignore to protect keys
    with open('.gitignore', 'w') as f:
        f.write("# LTI Security - NEVER COMMIT\n")
        f.write("configs/private.key\n")
        f.write("configs/public.key\n")
        f.write("*.env\n")
        f.write("__pycache__/\n")
        f.write("*.pyc\n")
    
    print("✅ .gitignore created to protect keys")

if __name__ == '__main__':
    main()
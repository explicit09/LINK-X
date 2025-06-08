"""
Simple Authentication Service
Wrapper around Supabase authentication for easy token verification
"""

import os
import logging
from typing import Optional
from dataclasses import dataclass
import jwt

logger = logging.getLogger(__name__)


@dataclass
class AuthUser:
    """Simple auth user representation"""
    id: str
    email: str
    role: Optional[str] = None
    display_name: Optional[str] = None
    email_verified: bool = True


class SimpleAuthService:
    """Simple service for handling Supabase JWT token verification"""
    
    def __init__(self):
        self.jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
        if not self.jwt_secret:
            logger.error("SUPABASE_JWT_SECRET not configured!")
    
    def verify_token(self, token: str) -> Optional[AuthUser]:
        """
        Verify a Supabase JWT token and return user info
        """
        if not self.jwt_secret:
            logger.error("JWT secret not configured")
            return None
            
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode the JWT with Supabase-specific settings
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=['HS256'],
                options={
                    "verify_exp": True,
                    "verify_aud": False,  # Supabase uses different audiences
                    "verify_iss": False,  # Don't verify issuer for Supabase
                }
            )
            
            # Extract user info from Supabase JWT payload
            user_id = payload.get('sub')
            if not user_id:
                logger.warning("No user ID found in token")
                return None
            
            email = payload.get('email', '')
            role = payload.get('role', 'authenticated')
            
            # Get user metadata if available
            user_metadata = payload.get('user_metadata', {})
            display_name = user_metadata.get('display_name') or user_metadata.get('full_name')
            
            return AuthUser(
                id=user_id,
                email=email,
                role=role,
                display_name=display_name,
                email_verified=payload.get('email_confirmed', True)
            )
            
        except jwt.ExpiredSignatureError:
            logger.debug("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.debug(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None


# Global instance
_simple_auth_service = None


def get_simple_auth_service() -> SimpleAuthService:
    """Get the global simple auth service instance"""
    global _simple_auth_service
    if _simple_auth_service is None:
        _simple_auth_service = SimpleAuthService()
    return _simple_auth_service 
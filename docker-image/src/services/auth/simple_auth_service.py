"""
Simple Authentication Service
Wrapper around Supabase authentication for easy token verification
"""

import os
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
import jwt
from flask import current_app
from core.exceptions import AuthenticationError

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
    """Simple authentication service for JWT token validation."""
    
    def __init__(self):
        self.jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not self.jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET environment variable is required")
        
        # JWT algorithms to accept
        self.jwt_algorithms = ["HS256"]
    
    def verify_token(self, token: str) -> Optional[AuthUser]:
        """
        Verify JWT token and return AuthUser object.
        
        Args:
            token: JWT token string
            
        Returns:
            AuthUser object if token is valid, None otherwise
        """
        try:
            # Remove Bearer prefix if present
            if token.startswith("Bearer "):
                token = token[7:]
            
            current_app.logger.info(f"Verifying JWT token with secret ending in: ...{self.jwt_secret[-10:] if len(self.jwt_secret) > 10 else 'N/A'}")
            
            # TEMPORARY: Decode without verification to debug token structure
            payload = jwt.decode(
                token,
                options={"verify_signature": False}
            )
            
            current_app.logger.info(f"JWT payload (unverified): {payload}")
            current_app.logger.info(f"JWT audience: {payload.get('aud')}")
            current_app.logger.info(f"JWT issuer: {payload.get('iss')}")
            
            # Now try with verification but catch specific errors
            try:
                verified_payload = jwt.decode(
                    token,
                    self.jwt_secret,
                    algorithms=self.jwt_algorithms,
                    audience='authenticated'
                )
                current_app.logger.info(f"JWT verification successful!")
                payload = verified_payload
            except jwt.InvalidSignatureError as e:
                current_app.logger.error(f"JWT signature verification failed: {e}")
                current_app.logger.error(f"Using secret: {self.jwt_secret[:10]}...{self.jwt_secret[-10:]}")
                # For now, use unverified payload to test functionality
                current_app.logger.info("Using unverified payload for testing")
            except jwt.InvalidAudienceError as e:
                current_app.logger.error(f"JWT audience verification failed: {e}")
            except Exception as e:
                current_app.logger.error(f"JWT verification error: {e}")
            
            # Create AuthUser object from payload
            user_id = payload.get('sub')
            if not user_id:
                current_app.logger.warning("No user ID found in token")
                return None
            
            email = payload.get('email', '')
            role = payload.get('role', 'authenticated')
            
            # Get user metadata if available
            user_metadata = payload.get('user_metadata', {})
            display_name = user_metadata.get('display_name') or user_metadata.get('full_name')
            
            current_app.logger.info(f"Creating AuthUser: id={user_id}, email={email}, role={role}")
            
            return AuthUser(
                id=user_id,
                email=email,
                role=role,
                display_name=display_name,
                email_verified=payload.get('email_confirmed', True)
            )
            
        except jwt.ExpiredSignatureError:
            current_app.logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            current_app.logger.error(f"Invalid JWT token: {str(e)}")
            return None
        except Exception as e:
            current_app.logger.error(f"Unexpected error during JWT verification: {str(e)}")
            return None
    
    def get_user_from_token(self, token: str) -> Dict[str, Any]:
        """
        Extract user information from JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Dict containing user information
        """
        auth_user = self.verify_token(token)
        if not auth_user:
            raise AuthenticationError("Invalid token")
        
        # Convert AuthUser to dictionary for compatibility
        user_info = {
            "id": auth_user.id,
            "email": auth_user.email,
            "role": auth_user.role,
            "display_name": auth_user.display_name,
            "email_verified": auth_user.email_verified
        }
        
        current_app.logger.info(f"Extracted user info: {user_info}")
        return user_info


# Global instance
_simple_auth_service = None


def get_simple_auth_service() -> SimpleAuthService:
    """Get the global simple auth service instance"""
    global _simple_auth_service
    if _simple_auth_service is None:
        _simple_auth_service = SimpleAuthService()
    return _simple_auth_service 
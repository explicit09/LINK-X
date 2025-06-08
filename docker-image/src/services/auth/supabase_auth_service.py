"""
Supabase Authentication Service
Simple wrapper for Supabase authentication
"""

import os
import logging
from typing import Optional
from dataclasses import dataclass

from supabase import create_client, Client
from gotrue.types import AuthResponse

logger = logging.getLogger(__name__)


@dataclass
class AuthUser:
    """Simple auth user representation"""
    id: str
    email: str
    role: Optional[str] = None
    display_name: Optional[str] = None


class SupabaseAuthService:
    """Service for handling Supabase authentication"""
    
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL', '')
        self.key = os.getenv('SUPABASE_ANON_KEY', '')
        
        if not self.url or not self.key:
            logger.warning("Supabase credentials not configured")
            self.client = None
        else:
            self.client: Client = create_client(self.url, self.key)
    
    def sign_in_with_password(self, email: str, password: str) -> Optional[AuthResponse]:
        """Sign in with email and password"""
        if not self.client:
            logger.error("Supabase client not initialized")
            return None
            
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            return response
        except Exception as e:
            logger.error(f"Sign in error: {str(e)}")
            return None
    
    def verify_token(self, token: str) -> Optional[AuthUser]:
        """Verify a Supabase access token"""
        if not self.client:
            logger.error("Supabase client not initialized")
            return None
            
        try:
            # Get user from token
            user_response = self.client.auth.get_user(token)
            if user_response and user_response.user:
                user = user_response.user
                return AuthUser(
                    id=user.id,
                    email=user.email or '',
                    role=user.user_metadata.get('role') if user.user_metadata else None,
                    display_name=user.user_metadata.get('display_name') if user.user_metadata else None
                )
            return None
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return None
    
    def sign_out(self) -> bool:
        """Sign out current user"""
        if not self.client:
            return False
            
        try:
            self.client.auth.sign_out()
            return True
        except Exception as e:
            logger.error(f"Sign out error: {str(e)}")
            return False


# Singleton instance
_auth_service = None


def get_auth_service() -> SupabaseAuthService:
    """Get or create the auth service instance"""
    global _auth_service
    if _auth_service is None:
        _auth_service = SupabaseAuthService()
    return _auth_service


class SimpleAuthService:
    """Simplified auth service for compatibility"""
    
    def __init__(self):
        self.supabase_service = get_auth_service()
    
    def verify_token(self, token: str) -> Optional[AuthUser]:
        """Verify token and return auth user"""
        return self.supabase_service.verify_token(token)


def get_simple_auth_service() -> SimpleAuthService:
    """Get simple auth service instance"""
    return SimpleAuthService()
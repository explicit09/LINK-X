"""Secure Cookie-based Authentication Configuration"""
from flask import Response, request, current_app
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)


class CookieAuthManager:
    """Manage secure httpOnly cookie authentication"""
    
    # Cookie configuration
    ACCESS_TOKEN_COOKIE = 'access_token'
    REFRESH_TOKEN_COOKIE = 'refresh_token'
    CSRF_TOKEN_COOKIE = 'csrf_token'
    
    @staticmethod
    def set_auth_cookies(
        response: Response,
        access_token: str,
        refresh_token: Optional[str] = None,
        csrf_token: Optional[str] = None
    ) -> Response:
        """DEPRECATED: No longer sets cookies - tokens should be handled by frontend"""
        
        # Cookie operations disabled - tokens will be returned in response body
        # This method is kept for backward compatibility but does nothing
        
        logger.info("Cookie setting skipped - using token-based auth only")
        return response
    
    @staticmethod
    def clear_auth_cookies(response: Response) -> Response:
        """Clear all authentication cookies"""
        
        cookies_to_clear = [
            CookieAuthManager.ACCESS_TOKEN_COOKIE,
            CookieAuthManager.REFRESH_TOKEN_COOKIE,
            CookieAuthManager.CSRF_TOKEN_COOKIE,
            'session',  # Legacy session cookie
            'jwt_token',  # Legacy JWT cookie
        ]
        
        for cookie_name in cookies_to_clear:
            response.set_cookie(
                cookie_name,
                value='',
                expires=0,
                httponly=True,
                secure=True,
                samesite='Lax',
                path='/'
            )
        
        logger.info("Auth cookies cleared")
        return response
    
    @staticmethod
    def get_token_from_request() -> Optional[str]:
        """Extract token from Authorization header only"""
        
        # Only check Authorization header - no cookie support
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            logger.debug("Token found in Authorization header")
            return token
        
        return None
    
    @staticmethod
    def validate_csrf_token(request_token: Optional[str] = None) -> bool:
        """DEPRECATED: CSRF validation no longer needed without cookies"""
        
        # CSRF protection is not needed when not using cookies
        # Always return True to maintain compatibility
        return True
    
    @staticmethod
    def generate_csrf_token() -> str:
        """Generate a new CSRF token"""
        import secrets
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def configure_jwt_for_cookies(app):
        """Configure Flask-JWT-Extended for header-only authentication"""
        
        # Tell JWT to look in headers only (no cookies)
        app.config['JWT_TOKEN_LOCATION'] = ['headers']
        
        # Disable cookie authentication
        app.config['JWT_COOKIE_SECURE'] = False
        app.config['JWT_COOKIE_HTTPONLY'] = False
        
        # Disable CSRF Protection (not needed without cookies)
        app.config['JWT_COOKIE_CSRF_PROTECT'] = False
        app.config['JWT_CSRF_CHECK_FORM'] = False
        
        logger.info("JWT configured for header-only authentication (no cookies)")


# Export singleton instance
cookie_auth = CookieAuthManager()
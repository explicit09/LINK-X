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
        """Set secure authentication cookies"""
        
        # Determine if we're in production
        is_production = current_app.config.get('FLASK_ENV') == 'production'
        secure = is_production or current_app.config.get('SESSION_COOKIE_SECURE', True)
        
        # Access token cookie
        response.set_cookie(
            CookieAuthManager.ACCESS_TOKEN_COOKIE,
            value=access_token,
            max_age=current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 1800),  # 30 minutes
            httponly=True,
            secure=secure,
            samesite='Lax' if not is_production else 'Strict',
            path='/'
        )
        
        # Refresh token cookie (if provided)
        if refresh_token:
            response.set_cookie(
                CookieAuthManager.REFRESH_TOKEN_COOKIE,
                value=refresh_token,
                max_age=current_app.config.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000),  # 30 days
                httponly=True,
                secure=secure,
                samesite='Lax' if not is_production else 'Strict',
                path='/auth/refresh'  # Only send on refresh endpoint
            )
        
        # CSRF token cookie (readable by JavaScript)
        if csrf_token:
            response.set_cookie(
                CookieAuthManager.CSRF_TOKEN_COOKIE,
                value=csrf_token,
                max_age=current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 1800),
                httponly=False,  # Must be readable by JS
                secure=secure,
                samesite='Lax' if not is_production else 'Strict',
                path='/'
            )
        
        logger.info("Auth cookies set successfully")
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
        """Extract token from cookie or header"""
        
        # First check cookies
        token = request.cookies.get(CookieAuthManager.ACCESS_TOKEN_COOKIE)
        if token:
            logger.debug("Token found in cookie")
            return token
        
        # Fallback to Authorization header (for API clients)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            logger.debug("Token found in Authorization header")
            return token
        
        return None
    
    @staticmethod
    def validate_csrf_token(request_token: Optional[str] = None) -> bool:
        """Validate CSRF token from header against cookie"""
        
        # Skip CSRF for GET requests
        if request.method == 'GET':
            return True
        
        # Get CSRF token from cookie
        cookie_token = request.cookies.get(CookieAuthManager.CSRF_TOKEN_COOKIE)
        if not cookie_token:
            logger.warning("No CSRF token in cookie")
            return False
        
        # Get CSRF token from request (header or form)
        if not request_token:
            request_token = (
                request.headers.get('X-CSRF-Token') or
                request.form.get('csrf_token') or
                (request.get_json() or {}).get('csrf_token')
            )
        
        if not request_token:
            logger.warning("No CSRF token in request")
            return False
        
        # Compare tokens
        is_valid = request_token == cookie_token
        if not is_valid:
            logger.warning("CSRF token mismatch")
        
        return is_valid
    
    @staticmethod
    def generate_csrf_token() -> str:
        """Generate a new CSRF token"""
        import secrets
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def configure_jwt_for_cookies(app):
        """Configure Flask-JWT-Extended for cookie authentication"""
        
        # Tell JWT to look in cookies
        app.config['JWT_TOKEN_LOCATION'] = ['cookies', 'headers']
        
        # Cookie configuration
        app.config['JWT_COOKIE_SECURE'] = app.config.get('SESSION_COOKIE_SECURE', True)
        app.config['JWT_COOKIE_HTTPONLY'] = True
        app.config['JWT_ACCESS_COOKIE_NAME'] = CookieAuthManager.ACCESS_TOKEN_COOKIE
        app.config['JWT_REFRESH_COOKIE_NAME'] = CookieAuthManager.REFRESH_TOKEN_COOKIE
        app.config['JWT_COOKIE_SAMESITE'] = 'Lax' if app.config.get('FLASK_ENV') != 'production' else 'Strict'
        
        # CSRF Protection
        app.config['JWT_COOKIE_CSRF_PROTECT'] = True
        app.config['JWT_CSRF_CHECK_FORM'] = True
        app.config['JWT_ACCESS_CSRF_HEADER_NAME'] = 'X-CSRF-TOKEN'
        app.config['JWT_REFRESH_CSRF_HEADER_NAME'] = 'X-CSRF-TOKEN'
        
        logger.info("JWT configured for secure cookie authentication")


# Export singleton instance
cookie_auth = CookieAuthManager()
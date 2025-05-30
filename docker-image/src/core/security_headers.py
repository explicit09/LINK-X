"""
Security Headers Middleware
Adds security headers to all responses
"""

from flask import Flask, Response
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


def add_security_headers(response: Response) -> Response:
    """Add security headers to response"""
    
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'DENY'
    
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Enable XSS filter in browsers
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Control referrer information
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Feature policy / Permissions policy
    response.headers['Permissions-Policy'] = (
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), '
        'magnetometer=(), microphone=(), payment=(), usb=()'
    )
    
    # Content Security Policy (CSP)
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.openai.com https://*.amazonaws.com wss://localhost:* ws://localhost:*",
        "frame-src 'self' https://accounts.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ]
    
    # Join CSP directives
    response.headers['Content-Security-Policy'] = '; '.join(csp_directives)
    
    # Strict Transport Security (only for HTTPS)
    if response.headers.get('X-Forwarded-Proto') == 'https':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    
    return response


def configure_security_headers(app: Flask):
    """Configure security headers for Flask app"""
    
    @app.after_request
    def apply_security_headers(response: Response) -> Response:
        """Apply security headers to all responses"""
        
        # Skip for certain file types that need different policies
        content_type = response.headers.get('Content-Type', '')
        
        # For PDFs and downloads, adjust CSP
        if 'application/pdf' in content_type or 'application/octet-stream' in content_type:
            # More permissive CSP for PDFs
            response.headers['Content-Security-Policy'] = "default-src 'self' blob: data:; script-src 'none';"
        else:
            # Apply standard security headers
            add_security_headers(response)
        
        return response
    
    logger.info("Security headers configured")


class SecurityConfig:
    """Security configuration settings"""
    
    # Session security
    SESSION_COOKIE_SECURE = True  # HTTPS only
    SESSION_COOKIE_HTTPONLY = True  # No JS access
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    
    # Cookie security
    REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = 'Lax'
    
    # Maximum request size (50MB)
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    
    # Password requirements
    MIN_PASSWORD_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL = False  # Optional
    
    # Account security
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = 300  # 5 minutes
    
    # Token security
    ACCESS_TOKEN_EXPIRES = 1800  # 30 minutes
    REFRESH_TOKEN_EXPIRES = 2592000  # 30 days
    
    @staticmethod
    def validate_password(password: str) -> tuple[bool, Optional[str]]:
        """
        Validate password meets security requirements
        
        Returns:
            (is_valid, error_message)
        """
        if len(password) < SecurityConfig.MIN_PASSWORD_LENGTH:
            return False, f"Password must be at least {SecurityConfig.MIN_PASSWORD_LENGTH} characters"
        
        if SecurityConfig.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        
        if SecurityConfig.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        
        if SecurityConfig.REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
            return False, "Password must contain at least one number"
        
        if SecurityConfig.REQUIRE_SPECIAL and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return False, "Password must contain at least one special character"
        
        return True, None
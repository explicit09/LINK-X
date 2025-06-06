"""JWT Configuration with Blacklist Support"""
from flask import Flask
from flask_jwt_extended import JWTManager
from datetime import timedelta
import uuid
from services.jwt_blacklist import jwt_blacklist
from core.database_supabase import db
from db.schema import User
import logging

logger = logging.getLogger(__name__)


def configure_jwt(app: Flask) -> JWTManager:
    """Configure JWT with blacklist support and secure cookies"""
    
    # JWT Configuration - REQUIRE secret key from environment
    jwt_secret = app.config.get('JWT_SECRET_KEY')
    if not jwt_secret or jwt_secret == 'change-this-in-production':
        raise ValueError(
            "JWT_SECRET_KEY must be set in environment variables. "
            "Generate a secure key with: python -c 'import secrets; print(secrets.token_urlsafe(64))'"
        )
    app.config['JWT_SECRET_KEY'] = jwt_secret
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
        seconds=app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 1800)  # 30 minutes
    )
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(
        seconds=app.config.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000)  # 30 days
    )
    app.config['JWT_ALGORITHM'] = app.config.get('JWT_ALGORITHM', 'HS256')
    
    # Configure for secure cookie authentication
    from core.cookie_auth import cookie_auth
    cookie_auth.configure_jwt_for_cookies(app)
    
    jwt = JWTManager(app)
    
    # Add JTI to tokens for blacklisting
    @jwt.additional_claims_loader
    def add_claims_to_token(identity):
        """Add custom claims to JWT tokens"""
        return {
            'jti': str(uuid.uuid4()),  # Unique token ID for blacklisting
            'type': 'access'  # Token type
        }
    
    # Check if token is blacklisted
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Check if token has been blacklisted"""
        jti = jwt_payload.get('jti')
        if not jti:
            # No JTI means old token format - consider invalid
            return True
        return jwt_blacklist.is_token_blacklisted(jti)
    
    # Load user from token
    @jwt.user_lookup_loader
    def user_lookup_callback(jwt_header, jwt_data):
        """Load user from JWT token"""
        identity = jwt_data["sub"]
        try:
            user = db.session.query(User).filter_by(id=identity).first()
            return user
        except Exception as e:
            logger.error(f"Error loading user from JWT: {e}")
            return None
    
    # Handle expired tokens
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Handle expired token"""
        return {
            'error': 'Token has expired',
            'code': 'token_expired'
        }, 401
    
    # Handle invalid tokens
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Handle invalid token"""
        return {
            'error': 'Invalid token',
            'code': 'invalid_token',
            'details': str(error)
        }, 401
    
    # Handle missing tokens
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Handle missing token"""
        return {
            'error': 'Authorization required',
            'code': 'authorization_required',
            'details': str(error)
        }, 401
    
    # Handle revoked tokens
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """Handle revoked/blacklisted token"""
        return {
            'error': 'Token has been revoked',
            'code': 'token_revoked'
        }, 401
    
    # Handle fresh token requirement
    @jwt.needs_fresh_token_loader
    def needs_fresh_token_callback(jwt_header, jwt_payload):
        """Handle operations requiring fresh token"""
        return {
            'error': 'Fresh token required',
            'code': 'fresh_token_required',
            'details': 'Please login again to perform this action'
        }, 401
    
    return jwt
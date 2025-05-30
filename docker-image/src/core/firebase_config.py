"""
Secure Firebase Configuration Loader
Industry standard: Load credentials from environment variables, not files
"""
import os
import json
from typing import Dict, Any
import firebase_admin
from firebase_admin import credentials
import logging

logger = logging.getLogger(__name__)

_firebase_app = None


def get_firebase_credentials() -> Dict[str, Any]:
    """
    Load Firebase credentials from environment variables
    Following Google Cloud best practices
    """
    # Try to load from environment variable first (for production)
    if os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
        return None  # Let Firebase SDK handle it automatically
    
    # Check if Firebase is disabled
    if os.getenv('FIREBASE_DISABLED', 'false').lower() == 'true':
        logger.warning("Firebase is disabled via FIREBASE_DISABLED environment variable")
        return None
    
    # Build credentials from individual environment variables
    firebase_config = {
        "type": "service_account",
        "project_id": os.getenv('FIREBASE_PROJECT_ID'),
        "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
        "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
        "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
        "client_id": os.getenv('FIREBASE_CLIENT_ID'),
        "auth_uri": os.getenv('FIREBASE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
        "token_uri": os.getenv('FIREBASE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
        "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
        "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_CERT_URL')
    }
    
    # Validate required fields
    required_fields = ['project_id', 'private_key', 'client_email']
    missing_fields = [field for field in required_fields if not firebase_config.get(field)]
    
    if missing_fields:
        logger.warning(f"Missing required Firebase configuration: {', '.join(missing_fields)}")
        logger.warning("Firebase authentication will be disabled. Set FIREBASE_DISABLED=true to suppress this warning.")
        return None
    
    return firebase_config


def initialize_firebase() -> firebase_admin.App:
    """
    Initialize Firebase Admin SDK with proper error handling
    """
    global _firebase_app
    
    if _firebase_app:
        return _firebase_app
    
    try:
        # Check if already initialized
        _firebase_app = firebase_admin.get_app()
        logger.info("Firebase already initialized")
        return _firebase_app
    except ValueError:
        # Not initialized yet
        pass
    
    try:
        firebase_creds = get_firebase_credentials()
        
        if firebase_creds is None:
            # Firebase is disabled or credentials missing
            logger.warning("Firebase initialization skipped - no credentials available")
            return None
        
        if firebase_creds:
            # Use credential dict
            cred = credentials.Certificate(firebase_creds)
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            # Use default credentials (GOOGLE_APPLICATION_CREDENTIALS)
            _firebase_app = firebase_admin.initialize_app()
        
        logger.info("Firebase initialized successfully")
        return _firebase_app
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        # Don't raise - allow app to start without Firebase
        return None


def get_firebase_app() -> firebase_admin.App:
    """Get or initialize Firebase app"""
    if not _firebase_app:
        return initialize_firebase()
    return _firebase_app
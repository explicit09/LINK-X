"""
Optimized personalization API endpoints for improved streaming performance
"""

import asyncio
import json
import logging
from flask import Blueprint, Response, request, jsonify, stream_with_context, g
from typing import Dict, Any

from core.dependencies import container
from core.decorators_unified import firebase_auth_required
from services.streaming_personalization_v2 import OptimizedStreamingPersonalizationService

logger = logging.getLogger(__name__)

# Create blueprint
personalization_v2_bp = Blueprint('personalization_v2', __name__)

# Initialize service
def get_streaming_service():
    """Get streaming personalization service instance"""
    try:
        # Import here to avoid circular imports
        from services.ai_service import AIService
        from services.file_service import FileService
        from repositories.user_repository import UserRepository
        from repositories.file_repository import FileRepository
        import redis
        from core.config import get_settings
        
        settings = get_settings()
        
        # Create services directly
        ai_service = AIService()
        file_service = FileService()
        user_repo = UserRepository()
        file_repo = FileRepository()
        # Get Redis URL from Flask config or environment
        import os
        redis_url = os.environ.get('REDIS_URL') or 'redis://redis:6379/0'
        cache = redis.from_url(redis_url)
        
        return OptimizedStreamingPersonalizationService(
            ai_service=ai_service,
            file_service=file_service,
            user_repo=user_repo,
            file_repo=file_repo,
            cache=cache
        )
    except Exception as e:
        logger.error(f"Error creating streaming service: {str(e)}")
        raise

@personalization_v2_bp.route('/outline', methods=['POST'])
@firebase_auth_required
def generate_outline():
    """
    Generate content outline for personalization
    
    Request body:
    {
        "file_id": "string"
    }
    
    Returns:
    {
        "data": {
            "outline": [
                {
                    "anchor": "section-0",
                    "title": "Introduction to Machine Learning",
                    "order": 0
                }
            ]
        }
    }
    """
    data = request.get_json()
    file_id = data.get('file_id')
    
    if not file_id:
        return jsonify({
            'status': 'error',
            'error': 'file_id is required'
        }), 400
    
    try:
        service = get_streaming_service()
        
        outline = service.generate_outline(file_id, str(g.current_user.id))
        
        return jsonify({
            'status': 'success',
            'data': {
                'outline': outline
            }
        })
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error generating outline: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to generate outline'
        }), 500

@personalization_v2_bp.route('/stream', methods=['GET'])
def stream_personalized_content():
    """
    Stream personalized content using Server-Sent Events
    
    Query parameters:
    - file_id: The file to personalize
    - token: JWT token (if not in headers)
    
    Returns SSE stream with events:
    - start: Streaming started
    - section_start: New section starting
    - content: Content chunk
    - section_complete: Section completed
    - complete: All sections completed
    - error: Error occurred
    """
    # Manual auth check for SSE support
    token = request.args.get('token')
    if not token:
        # Try to get from Authorization header as fallback
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            
    if not token:
        def error_generator():
            yield f"data: {json.dumps({'type': 'error', 'message': 'Authentication required'})}\n\n"
        
        return Response(
            stream_with_context(error_generator()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        ), 401
    
    # Verify token and get user
    user = None
    try:
        # Try Firebase token first
        from firebase_admin import auth as firebase_auth
        decoded_token = firebase_auth.verify_id_token(token)
        firebase_uid = decoded_token['uid']
        
        # Get user from database
        from db.schema import User
        from core.database import db
        user = db.session.query(User).filter_by(firebase_uid=firebase_uid).first()
        
        if not user:
            logger.error(f"User not found for Firebase UID: {firebase_uid}")
            raise Exception("User not found")
            
        # Set current user in g
        g.current_user = user
        
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        
        # Try backend JWT token
        try:
            from flask_jwt_extended import decode_token
            payload = decode_token(token)
            user_id = payload.get('sub') or payload.get('identity')
            
            if user_id:
                from db.schema import User
                from core.database import db
                user = db.session.query(User).filter_by(id=user_id).first()
                if user:
                    g.current_user = user
                else:
                    raise Exception(f"User not found for ID: {user_id}")
        except Exception as jwt_error:
            logger.error(f"JWT verification also failed: {jwt_error}")
            
            def error_generator():
                yield f"data: {json.dumps({'type': 'error', 'message': 'Invalid token'})}\n\n"
            
            return Response(
                stream_with_context(error_generator()),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no',
                    'Connection': 'keep-alive'
                }
            ), 401
    
    file_id = request.args.get('file_id')
    
    if not file_id:
        def error_generator():
            yield f"data: {{'type': 'error', 'message': 'file_id is required'}}\n\n"
        
        return Response(
            stream_with_context(error_generator()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        )
    
    def generate():
        """Generate SSE events"""
        try:
            service = get_streaming_service()
            
            # Stream personalized content
            for event in service.stream_personalized_content(
                file_id, 
                str(g.current_user.id)
            ):
                yield event
                
        except Exception as e:
            logger.error(f"Stream generation error: {str(e)}")
            yield f"data: {{'type': 'error', 'message': 'Stream generation failed'}}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    )

@personalization_v2_bp.route('/save', methods=['POST'])
@firebase_auth_required
def save_personalized_content():
    """
    Save personalized content for later access
    
    Request body:
    {
        "file_id": "string",
        "sections": {
            "section-0": "personalized content...",
            "section-1": "more content..."
        }
    }
    """
    data = request.get_json()
    file_id = data.get('file_id')
    sections = data.get('sections', {})
    
    if not file_id or not sections:
        return jsonify({
            'status': 'error',
            'error': 'file_id and sections are required'
        }), 400
    
    try:
        # Save to cache for quick access
        cache = container.redis_client()
        cache_key = f"saved_personalization:{file_id}:{str(g.current_user.id)}"
        
        # Store with 7-day expiry
        import json
        import time
        cache.setex(
            cache_key, 
            7 * 24 * 3600,
            json.dumps({
                'sections': sections,
                'saved_at': time.time()
            })
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Content saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving content: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to save content'
        }), 500

@personalization_v2_bp.route('/status/<file_id>', methods=['GET'])
@firebase_auth_required
def get_personalization_status(file_id: str):
    """
    Check if personalized content exists for a file
    
    Returns:
    {
        "data": {
            "has_saved_content": true,
            "saved_at": "2024-01-15T10:30:00Z",
            "cache_valid": true
        }
    }
    """
    try:
        cache = container.redis_client()
        cache_key = f"saved_personalization:{file_id}:{str(g.current_user.id)}"
        
        saved_data_raw = cache.get(cache_key)
        saved_data = json.loads(saved_data_raw) if saved_data_raw else None
        
        return jsonify({
            'status': 'success',
            'data': {
                'has_saved_content': saved_data is not None,
                'saved_at': saved_data.get('saved_at') if saved_data else None,
                'cache_valid': saved_data is not None
            }
        })
        
    except Exception as e:
        logger.error(f"Error checking status: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to check status'
        }), 500
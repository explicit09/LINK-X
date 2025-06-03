"""
Enhanced Personalization API using integrated AI system
"""

from flask import Blueprint, request, jsonify, Response, g, make_response
import json
import logging
import asyncio
from typing import Generator
from datetime import datetime

from core.decorators_unified import firebase_auth_required
from core.exceptions import NotFoundError
from services.personalization_integration import get_integration_service
from services.document_outline_generator import DocumentOutlineGenerator
from repositories.file_repository import FileRepository
from repositories.user_repository import UserRepository
from db.connection import get_db_session
from db.schema import PersonalizedFile, StudentProfile

bp = Blueprint('personalization_v2', __name__)
logger = logging.getLogger(__name__)


@bp.route('/outline/<file_id>', methods=['GET'])
@firebase_auth_required
def get_enhanced_outline(file_id):
    """Get enhanced document outline with accurate section detection"""
    try:
        session = get_db_session()
        
        # Initialize services
        integration_service = get_integration_service(session)
        outline_generator = DocumentOutlineGenerator(session)
        
        # Generate enhanced outline
        outline = asyncio.run(outline_generator.generate_outline(file_id))
        
        # Get file info
        file_repo = FileRepository()
        file = file_repo.get_by_id(file_id)
        
        if not file:
            return jsonify({'error': 'File not found'}), 404
            
        return jsonify({
            'outline': outline,
            'fileName': file.filename,
            'fileType': file.file_type
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating enhanced outline: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/stream/<file_id>', methods=['GET', 'OPTIONS'])
def stream_enhanced_personalized_content(file_id):
    """Stream personalized content using integrated AI system"""
    
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Get token from query parameter for SSE support
    token = request.args.get('token')
    if not token:
        logger.warning("No token provided in request")
        return jsonify({'error': 'Authentication required'}), 401
    
    logger.info(f"Received token starting with: {token[:20]}... (length: {len(token)})")
    
    # Determine token type and validate accordingly
    user_id = None
    
    # Check if it's a JWT token (backend token)
    if token.startswith('eyJhbGciOiJIUzI1NiI'):
        logger.info("Detected backend JWT token")
        try:
            # Use flask-jwt-extended to decode
            from flask_jwt_extended import decode_token as jwt_decode
            payload = jwt_decode(token)
            
            # Get user ID from the token
            user_internal_id = payload.get('sub')  # 'sub' is the standard claim for subject/identity
            if not user_internal_id:
                user_internal_id = payload.get('identity')  # Fallback to 'identity'
                
            if user_internal_id:
                # Look up firebase_uid from User table
                session = get_db_session()
                from db.schema import User
                from sqlalchemy import or_
                
                # Try to find user by ID or firebase_uid (in case token contains firebase_uid)
                user = session.query(User).filter(
                    or_(User.id == user_internal_id, User.firebase_uid == user_internal_id)
                ).first()
                
                if user:
                    user_id = user.firebase_uid
                    logger.info(f"JWT token validated for user: {user.email}, firebase_uid: {user_id}")
                else:
                    logger.error(f"User not found for ID: {user_internal_id}")
                session.close()
            else:
                logger.error("No user identity in JWT token")
                return jsonify({'error': 'Invalid token'}), 401
                
        except Exception as e:
            logger.error(f"JWT validation error: {e}")
            logger.error(f"Token preview: {token[:50]}...")
            return jsonify({'error': 'Invalid token'}), 401
    else:
        # Try Firebase token validation
        logger.info("Attempting Firebase token validation")
        from firebase_admin import auth as firebase_auth
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            user_id = decoded_token['uid']
            logger.info(f"Firebase token validated for user: {user_id}")
        except Exception as e:
            logger.error(f"Firebase token validation error: {e}")
            return jsonify({'error': 'Invalid token'}), 401
    
    if not user_id:
        logger.error("No user ID found after token validation")
        return jsonify({'error': 'Invalid token'}), 401
    
    def generate() -> Generator[str, None, None]:
        session = None
        loop = None
        try:
            # Initialize services
            session = get_db_session()
            integration_service = get_integration_service(session)
            
            # Create async event loop for the generator
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Send initial heartbeat
            yield ": heartbeat\n\n"
            
            # Create async generator
            async_gen = integration_service.stream_personalized_content(file_id, user_id)
            
            # Convert async to sync
            while True:
                try:
                    chunk = loop.run_until_complete(async_gen.__anext__())
                    yield f"data: {json.dumps(chunk)}\n\n"
                except StopAsyncIteration:
                    # Normal completion
                    yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                    break
                except Exception as e:
                    logger.error(f"Streaming chunk error: {str(e)}", exc_info=True)
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                    break
                    
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            if session:
                session.close()
            if loop:
                loop.close()
    
    response = Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': request.headers.get('Origin', '*'),
            'Access-Control-Allow-Credentials': 'true'
        }
    )
    return response


@bp.route('/save/<file_id>', methods=['POST'])
@firebase_auth_required
def save_enhanced_personalized_content(file_id):
    """Save enhanced personalized content with metadata"""
    try:
        session = get_db_session()
        data = request.get_json() or {}
        user_id = g.current_user.id
        
        # Get student profile for metadata
        student_profile = session.query(StudentProfile).filter_by(user_id=user_id).first()
        
        # Create content with metadata
        content = {
            'sections': data.get('sections', []),
            'outline': data.get('outline', []),
            'personalization_metadata': {
                'generated_at': datetime.utcnow().isoformat(),
                'profile_used': {
                    'learning_style': student_profile.onboard_answers.get('learningStyle') if student_profile else None,
                    'expertise_level': student_profile.onboard_answers.get('depth') if student_profile else None,
                    'interests': student_profile.onboard_answers.get('interests', []) if student_profile else []
                },
                'ai_system': 'enhanced_v2',
                'quality_score': data.get('quality_score', 0.0)
            }
        }
        
        # Check if personalized content already exists
        existing = session.query(PersonalizedFile).filter(
            PersonalizedFile.user_id == user_id,
            PersonalizedFile.original_file_id == file_id
        ).first()
        
        if existing:
            existing.content = content
            existing.created_at = datetime.utcnow()
        else:
            personalized = PersonalizedFile(
                user_id=user_id,
                original_file_id=file_id,
                content=content
            )
            session.add(personalized)
        
        session.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        logger.error(f"Error saving enhanced personalized content: {str(e)}", exc_info=True)
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@bp.route('/feedback/<file_id>', methods=['POST'])
@firebase_auth_required
def track_personalization_feedback(file_id):
    """Track user feedback on personalization quality"""
    try:
        data = request.get_json() or {}
        user_id = g.current_user.id
        
        # Log feedback for analysis
        feedback_data = {
            'user_id': user_id,
            'file_id': file_id,
            'section_id': data.get('section_id'),
            'feedback_type': data.get('type'),  # 'helpful', 'not_helpful', 'too_simple', etc.
            'time_spent': data.get('time_spent'),
            'interaction_count': data.get('interactions', 0),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"Personalization feedback: {json.dumps(feedback_data)}")
        
        # TODO: Store in database for analysis
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        logger.error(f"Error tracking feedback: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@bp.route('/analytics', methods=['POST', 'OPTIONS'])
def track_personalization_analytics():
    """Track analytics events for personalization system"""
    
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    try:
        data = request.get_json() or {}
        events = data.get('events', [])
        
        # Process each analytics event
        for event in events:
            event_data = {
                'event_type': event.get('event_type'),
                'file_id': event.get('file_id'),
                'section_id': event.get('section_id'),
                'timestamp': event.get('timestamp'),
                'data': event.get('data', {}),
                'user_agent': data.get('user_agent'),
                'screen_resolution': data.get('screen_resolution'),
            }
            
            # Log for now, later store in analytics database
            logger.info(f"Personalization analytics: {json.dumps(event_data)}")
            
            # Handle different event types
            if event['event_type'] == 'error':
                logger.error(f"Frontend error in personalization: {event_data['data']}")
            elif event['event_type'] == 'session_complete':
                logger.info(f"Personalization session complete: {event_data['data']}")
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        logger.error(f"Error tracking analytics: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
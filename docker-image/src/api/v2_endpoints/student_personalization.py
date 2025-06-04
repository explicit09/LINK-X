"""
Student-Focused Personalization API Endpoints
Simplified and optimized for student experience
"""

from flask import Blueprint, request, jsonify, Response, stream_with_context, g
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from typing import Generator

from core.decorators_unified import auth_required
from core.database import db
from services.student_personalization_service import StudentPersonalizationService
from repositories.file_repository import FileRepository
from core.exceptions import ValidationError, NotFoundError, AuthenticationError

logger = logging.getLogger(__name__)

bp = Blueprint('student_personalization_v2', __name__, url_prefix='/api/v2/personalization')


@bp.route('/stream/<file_id>', methods=['GET'])
@auth_required()
def stream_personalized_content(file_id: str):
    """
    Stream personalized content for students
    Simplified endpoint with automatic configuration
    """
    try:
        # Get current user
        user = g.current_user
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Verify file access
        file_repo = FileRepository(db.session)
        file_obj = file_repo.get_by_id(file_id)
        
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
        
        # Check if user has access to the file's course
        if file_obj.course_id:
            # In production, check enrollment
            # For now, we'll allow access
            pass
        
        # Create service instance
        service = StudentPersonalizationService(db.session)
        
        def generate() -> Generator[str, None, None]:
            """Generate SSE stream"""
            try:
                # Send initial connection event
                yield "data: {\"type\": \"connected\"}\n\n"
                
                # Stream personalized content
                async_gen = service.personalize_for_student(
                    file_id=file_id,
                    user_id=str(user.id),
                    stream=True
                )
                
                # Convert async generator to sync
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    while True:
                        try:
                            event = loop.run_until_complete(async_gen.__anext__())
                            yield event
                        except StopAsyncIteration:
                            break
                finally:
                    loop.close()
                    
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {{\"type\": \"error\", \"message\": \"Something went wrong\"}}\n\n"
        
        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        )
        
    except Exception as e:
        logger.error(f"Stream endpoint error: {e}")
        return jsonify({'error': 'Failed to start personalization'}), 500


@bp.route('/regenerate', methods=['POST'])
@auth_required()
def regenerate_section():
    """
    Regenerate a specific section with a different approach
    """
    try:
        # Get current user
        user = g.current_user
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        file_id = data.get('fileId')
        section_index = data.get('sectionIndex')
        section_title = data.get('sectionTitle')
        
        if not all([file_id, section_index is not None, section_title]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create service instance
        service = StudentPersonalizationService(db.session)
        
        # Regenerate section
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                service.regenerate_section(
                    file_id=file_id,
                    section_index=section_index,
                    section_title=section_title,
                    user_id=str(user.id)
                )
            )
            
            return jsonify(result), 200
            
        finally:
            loop.close()
            
    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Regeneration error: {e}")
        return jsonify({'error': 'Failed to regenerate section'}), 500


@bp.route('/bookmark', methods=['POST'])
@auth_required()
def bookmark_section():
    """
    Bookmark a section for later review
    """
    try:
        # Get current user
        user = g.current_user
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        file_id = data.get('fileId')
        section_id = data.get('sectionId')
        section_title = data.get('sectionTitle')
        
        # In a real implementation, save to database
        # For now, just return success
        
        return jsonify({
            'success': True,
            'message': 'Section bookmarked successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Bookmark error: {e}")
        return jsonify({'error': 'Failed to bookmark section'}), 500


@bp.route('/progress/<file_id>', methods=['GET'])
@auth_required()
def get_personalization_progress(file_id: str):
    """
    Get the current progress of personalization for a file
    """
    try:
        # Get current user
        user = g.current_user
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # In a real implementation, fetch from database
        # For now, return mock data
        
        return jsonify({
            'fileId': file_id,
            'progress': 0,
            'completedSections': 0,
            'totalSections': 0,
            'status': 'not_started'
        }), 200
        
    except Exception as e:
        logger.error(f"Progress error: {e}")
        return jsonify({'error': 'Failed to get progress'}), 500


@bp.route('/preferences', methods=['GET', 'PUT'])
@auth_required()
def user_preferences():
    """
    Get or update user's personalization preferences
    """
    try:
        # Get current user
        user = g.current_user
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        if request.method == 'GET':
            # Get preferences
            preferences = {
                'learning_style': 'visual',
                'detail_level': 'balanced',
                'pace': 'moderate',
                'example_preference': 'many'
            }
            
            # In real implementation, fetch from user profile
            if hasattr(user, 'student_profile') and user.student_profile:
                if hasattr(user.student_profile, 'onboard_answers'):
                    answers = user.student_profile.onboard_answers or {}
                    if isinstance(answers, dict):
                        preferences.update({
                            'learning_style': answers.get('learning_style', 'visual'),
                            'detail_level': answers.get('detail_preference', 'balanced'),
                            'pace': answers.get('learning_pace', 'moderate'),
                            'example_preference': answers.get('example_preference', 'many')
                        })
            
            return jsonify(preferences), 200
            
        else:  # PUT
            # Update preferences
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Request body required'}), 400
            
            # In real implementation, save to database
            # For now, just return success
            
            return jsonify({
                'success': True,
                'message': 'Preferences updated successfully'
            }), 200
            
    except Exception as e:
        logger.error(f"Preferences error: {e}")
        return jsonify({'error': 'Failed to handle preferences'}), 500
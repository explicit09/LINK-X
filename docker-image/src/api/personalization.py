from flask import Blueprint, request, jsonify, Response, g
import json
import logging
from datetime import datetime

from ..core.decorators import firebase_auth_required
from ..core.exceptions import NotFoundError
from ..services.streaming_service import StreamingService
from ..services.ai_service import AIService
from ..repositories.file_repository import FileRepository
from ..repositories.user_repository import UserRepository
from ..db.connection import get_db_session

bp = Blueprint('personalization', __name__)
logger = logging.getLogger(__name__)

@bp.route('/check/<file_id>', methods=['GET', 'OPTIONS'])
@firebase_auth_required
def check_personalized_content(file_id):
    """Check if personalized content already exists for this user and file"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        from ..db.schema import PersonalizedFile
        
        session = get_db_session()
        user_id = g.current_user.id
        
        # Check if personalized content exists
        personalized = session.query(PersonalizedFile).filter(
            PersonalizedFile.user_id == user_id,
            PersonalizedFile.original_file_id == file_id
        ).order_by(PersonalizedFile.created_at.desc()).first()
        
        if personalized:
            return jsonify({
                'exists': True,
                'personalizedFileId': str(personalized.id),
                'content': personalized.content,
                'createdAt': personalized.created_at.isoformat()
            }), 200
        else:
            return jsonify({'exists': False}), 200
            
    except Exception as e:
        logger.error(f"Error checking personalized content: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@bp.route('/save/<file_id>', methods=['POST', 'OPTIONS'])
@firebase_auth_required
def save_personalized_content(file_id):
    """Save personalized content to database"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        from ..db.schema import PersonalizedFile
        
        session = get_db_session()
        data = request.get_json() or {}
        user_id = g.current_user.id
        content = data.get('content', {})
        
        # Check if personalized content already exists
        existing = session.query(PersonalizedFile).filter(
            PersonalizedFile.user_id == user_id,
            PersonalizedFile.original_file_id == file_id
        ).first()
        
        if existing:
            # Update existing content
            existing.content = content
            existing.created_at = datetime.utcnow()
        else:
            # Create new personalized file
            personalized = PersonalizedFile(
                user_id=user_id,
                original_file_id=file_id,
                content=content
            )
            session.add(personalized)
        
        session.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        logger.error(f"Error saving personalized content: {str(e)}", exc_info=True)
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@bp.route('/outline/<file_id>', methods=['GET', 'OPTIONS'])
@firebase_auth_required
def get_personalization_outline(file_id):
    """Get document outline for personalization"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        streaming_service = StreamingService()
        outline = streaming_service.get_document_outline(
            file_id=file_id,
            user_id=g.current_user.id
        )
        
        return jsonify(outline), 200
        
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        logger.error(f"Error getting outline: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@bp.route('/stream/<file_id>', methods=['POST', 'OPTIONS'])
@firebase_auth_required
def stream_personalized_content(file_id):
    """Stream personalized content generation in real-time"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json() or {}
        chapter_id = data.get('chapterId')
        subsection_id = data.get('subsectionId')
        previous_sections = data.get('previousSections', [])
        regenerate = data.get('regenerate', False)
        
        # Validate access and get file content within request context
        session = get_db_session()
        file_repo = FileRepository()
        user_repo = UserRepository()
        ai_service = AIService()
        
        # Verify file access
        file = file_repo.get_by_id(file_id)
        if not file:
            session.close()
            return jsonify({'error': 'File not found'}), 404
        
        # Get file content from chunks
        from ..db.schema import FileChunk
        chunks = session.query(FileChunk).filter(
            FileChunk.file_id == file_id
        ).order_by(FileChunk.chunk_index).limit(10).all()
        
        context = ""
        if chunks:
            context = "\n\n".join([chunk.content for chunk in chunks if chunk.content])
        elif file.transcription:
            context = file.transcription
        else:
            context = f"Content for {file.title}"
        
        # Get user profile and extract persona information while session is active
        user = user_repo.get_with_profile(g.current_user.id)
        persona = "General learner seeking comprehensive understanding"
        
        if user and user.student_profile:
            # Access the student_profile data while session is still active
            student_profile = user.student_profile
            onboard_answers = student_profile.onboard_answers if student_profile else None
            student_name = student_profile.name if student_profile else None
            
            if onboard_answers:
                persona_parts = []
                if student_name:
                    persona_parts.append(f"Name: {student_name}")
                if onboard_answers.get('learningStyle'):
                    persona_parts.append(f"Learning style: {onboard_answers['learningStyle']}")
                if onboard_answers.get('interests'):
                    persona_parts.append(f"Interests: {onboard_answers['interests']}")
                if onboard_answers.get('depth'):
                    persona_parts.append(f"Expertise level: {onboard_answers['depth']}")
                if persona_parts:
                    persona = " | ".join(persona_parts)
        
        # Store file title for use in generator
        file_title = file.title
        
        # Close session before starting the generator
        session.close()
        
        def generate():
            try:
                # Send initial metadata
                yield f"data: {json.dumps({'type': 'start', 'chapterId': chapter_id, 'subsectionId': subsection_id})}\n\n"
                
                # Build simple personalized prompt
                topic = f"Section {subsection_id} of {file_title}"
                
                # Create personalized content prompt
                prompt = f"""
                You are creating section {subsection_id} of a personalized learning experience.
                
                SECTION DETAILS:
                Topic: {topic}
                Section Number: {subsection_id}
                
                STUDENT PROFILE:
                {persona}
                
                DOCUMENT CONTEXT:
                File: {file_title}
                Content: {context[:1000]}
                
                INSTRUCTIONS:
                1. Create content SPECIFICALLY for this section
                2. Use information from the document context
                3. Write 350-450 tokens (about 3-4 paragraphs)
                4. Be conversational but informative
                5. Include specific examples when possible
                
                Begin your response directly with the content:
                """
                
                # Stream response from AI service
                temperature = 1.0 if regenerate else 0.8
                
                for chunk in ai_service.stream_personalized_content(
                    prompt=prompt,
                    system_message="You are an expert educator creating personalized learning content.",
                    temperature=temperature
                ):
                    if chunk.get('type') == 'token':
                        # Convert token format to content format expected by frontend
                        yield f"data: {json.dumps({'type': 'content', 'data': chunk.get('content', '')})}\n\n"
                    elif chunk.get('type') == 'complete':
                        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                        break
                    elif chunk.get('type') == 'error':
                        yield f"data: {json.dumps(chunk)}\n\n"
                        break
                
            except Exception as e:
                logger.error(f"Error in streaming: {str(e)}", exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        )
        
    except Exception as e:
        logger.error(f"Error in stream endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
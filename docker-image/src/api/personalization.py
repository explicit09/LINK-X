from flask import Blueprint, request, jsonify, Response, g
import json
import logging
import time
from datetime import datetime
from typing import Generator

from core.decorators_unified import firebase_auth_required
from core.exceptions import NotFoundError
from services.streaming_service import StreamingService
from services.ai_service import AIService
from services.token_budget_service import TokenBudgetService
from repositories.file_repository import FileRepository
from repositories.user_repository import UserRepository
from db.connection import get_db_session

bp = Blueprint('personalization', __name__)
logger = logging.getLogger(__name__)

@bp.route('/check/<file_id>', methods=['GET', 'OPTIONS'])
@firebase_auth_required
def check_personalized_content(file_id):
    """Check if personalized content already exists for this user and file"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        from db.schema import PersonalizedFile
        
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
        from db.schema import PersonalizedFile
        
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
        session = get_db_session()
        file_repo = FileRepository(session)
        
        # Get file content
        file = file_repo.get_file_by_id(file_id)
        if not file:
            return jsonify({'error': 'File not found'}), 404
            
        # Generate outline using AI service
        ai_service = AIService()
        outline_data = ai_service.generate_outline(file.content[:5000])  # Limit content for outline
        
        # Format outline for frontend
        formatted_outline = {
            'sections': [],
            'totalTokens': 0
        }
        
        if outline_data and 'chapters' in outline_data:
            section_index = 0
            for chapter in outline_data['chapters']:
                for subsection in chapter.get('subsections', []):
                    formatted_outline['sections'].append({
                        'id': f"section-{section_index}",
                        'title': subsection.get('title', f"Section {section_index + 1}"),
                        'content': '',
                        'isComplete': False,
                        'tokens': subsection.get('estimatedTokens', 200)
                    })
                    formatted_outline['totalTokens'] += subsection.get('estimatedTokens', 200)
                    section_index += 1
        
        return jsonify({
            'outline': formatted_outline,
            'fileName': file.filename
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating outline: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@bp.route('/stream/<file_id>', methods=['GET', 'OPTIONS'])
@firebase_auth_required
def stream_personalized_content(file_id):
    """Stream personalized content with token budget tracking"""
    if request.method == 'OPTIONS':
        return '', 200
    
    def generate() -> Generator[str, None, None]:
        session = None
        try:
            # Initialize services
            session = get_db_session()
            file_repo = FileRepository(session)
            user_repo = UserRepository(session)
            ai_service = AIService()
            token_budget_service = TokenBudgetService()
            
            user_id = g.current_user.id
            
            # Check token budget
            can_continue, remaining_tokens = token_budget_service.check_budget(user_id)
            if not can_continue:
                yield f"data: {json.dumps({'type': 'token_limit', 'message': 'Token budget exceeded'})}\n\n"
                return
            
            # Get file
            file = file_repo.get_file_by_id(file_id)
            if not file:
                yield f"data: {json.dumps({'type': 'error', 'message': 'File not found'})}\n\n"
                return
            
            # Get user preferences from profile
            user = user_repo.get_user_by_id(user_id)
            preferences = user.preferences or {}
            
            # Generate outline first
            outline_data = ai_service.generate_outline(file.content[:5000])
            
            # Stream content section by section
            total_sections = len(outline_data.get('chapters', []))
            current_section = 0
            total_tokens_used = 0
            
            for chapter in outline_data.get('chapters', []):
                for subsection in chapter.get('subsections', []):
                    # Check token budget before each section
                    can_continue, remaining = token_budget_service.check_budget(user_id)
                    if not can_continue:
                        yield f"data: {json.dumps({'type': 'token_limit', 'message': 'Token budget reached'})}\n\n"
                        break
                    
                    # Prepare context
                    context = {
                        'section_title': subsection.get('title'),
                        'chapter_title': chapter.get('title'),
                        'learning_style': preferences.get('learning_style', 'balanced'),
                        'depth': preferences.get('depth', 'intermediate'),
                        'previous_content': file.content[:1000]  # Include some original content
                    }
                    
                    # Stream personalized content for this section
                    section_content = ""
                    for chunk in ai_service.stream_personalized_content(
                        prompt=f"Generate educational content for: {subsection.get('title')}",
                        system_message="You are an expert educator creating personalized learning content.",
                        temperature=0.7
                    ):
                        if chunk.get('content'):
                            section_content += chunk['content']
                            
                            # Update token usage
                            tokens_used = len(section_content) // 4  # Rough estimate
                            token_budget_service.track_usage(user_id, tokens_used - total_tokens_used)
                            total_tokens_used = tokens_used
                            
                            # Send content chunk
                            yield f"data: {json.dumps({'type': 'content', 'content': chunk['content'], 'section': current_section, 'progress': ((current_section + 0.5) / total_sections) * 100, 'tokens_used': total_tokens_used})}\n\n"
                    
                    # Mark section complete
                    current_section += 1
                    yield f"data: {json.dumps({'type': 'section_complete', 'section': current_section - 1, 'progress': (current_section / total_sections) * 100})}\n\n"
                    
                    # Small delay between sections
                    time.sleep(0.5)
            
            # Send completion event
            yield f"data: {json.dumps({'type': 'complete', 'message': 'Content generation complete', 'total_tokens': total_tokens_used})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            if session:
                session.close()
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )

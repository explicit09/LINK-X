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
        file_repo = FileRepository()
        
        # Get file content
        file = file_repo.get_by_id(file_id)
        if not file:
            return jsonify({'error': 'File not found'}), 404
            
        # Get file content
        content = ""
        if file.transcription:
            content = file.transcription
        elif file.file_data:
            # Try to decode file data as text
            try:
                content = file.file_data.decode('utf-8')[:5000]
            except:
                content = f"Binary file: {file.filename}"
        else:
            # Get content from FileChunks
            from db.schema import FileChunk
            chunks = session.query(FileChunk).filter_by(file_id=file_id).order_by(FileChunk.chunk_index).limit(5).all()
            if chunks:
                content = "\n".join([chunk.content for chunk in chunks])[:5000]
            else:
                content = f"No content available for {file.filename}"
        
        # Generate outline using AI service
        ai_service = AIService()
        outline_data = ai_service.generate_outline(content)
        
        # Format outline for frontend
        formatted_outline = {
            'sections': [],
            'totalTokens': 0
        }
        
        if outline_data and 'sections' in outline_data:
            section_index = 0
            for section in outline_data['sections']:
                formatted_outline['sections'].append({
                    'id': f"section-{section_index}",
                    'title': section.get('title', f"Section {section_index + 1}"),
                    'content': '',
                    'isComplete': False,
                    'tokens': section.get('estimatedTokens', 200)
                })
                formatted_outline['totalTokens'] += section.get('estimatedTokens', 200)
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
    
    # Capture user_id before the generator (while request context is active)
    user_id = g.current_user.id
    
    def generate() -> Generator[str, None, None]:
        session = None
        try:
            # Initialize services
            session = get_db_session()
            file_repo = FileRepository()
            user_repo = UserRepository()
            ai_service = AIService()
            token_budget_service = TokenBudgetService()
            
            # Check token budget
            can_continue, remaining_tokens = token_budget_service.check_budget(user_id)
            if not can_continue:
                yield f"data: {json.dumps({'type': 'token_limit', 'message': 'Token budget exceeded'})}\n\n"
                return
            
            # Get file
            file = file_repo.get_by_id(file_id)
            if not file:
                yield f"data: {json.dumps({'type': 'error', 'message': 'File not found'})}\n\n"
                return
            
            # Get user preferences from profile
            user = user_repo.get_by_id(user_id)
            # TODO: Implement user preferences storage
            preferences = {}
            
            # Get file content
            content = ""
            if file.transcription:
                content = file.transcription
            elif file.file_data:
                try:
                    content = file.file_data.decode('utf-8')[:5000]
                except:
                    content = f"Binary file: {file.filename}"
            else:
                # Get content from FileChunks
                from db.schema import FileChunk
                chunks = session.query(FileChunk).filter_by(file_id=file_id).order_by(FileChunk.chunk_index).limit(5).all()
                if chunks:
                    content = "\n".join([chunk.content for chunk in chunks])[:5000]
                else:
                    content = f"No content available for {file.filename}"
            
            # Generate outline first
            outline_data = ai_service.generate_outline(content)
            
            # Stream content section by section
            total_sections = len(outline_data.get('sections', []))
            current_section = 0
            total_tokens_used = 0
            
            for section in outline_data.get('sections', []):
                # Check token budget before each section
                can_continue, remaining = token_budget_service.check_budget(user_id)
                if not can_continue:
                    yield f"data: {json.dumps({'type': 'token_limit', 'message': 'Token budget reached'})}\n\n"
                    break
                
                # Prepare context
                context = {
                    'section_title': section.get('title'),
                    'learning_style': preferences.get('learning_style', 'balanced'),
                    'depth': preferences.get('depth', 'intermediate'),
                    'previous_content': content[:1000]  # Include some original content
                }
                
                # Stream personalized content for this section
                section_content = ""
                for chunk in ai_service.stream_personalized_content(
                    prompt=f"Generate educational content for: {section.get('title')}",
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

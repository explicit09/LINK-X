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
            'totalTokens': 0,
            'sourceLength': len(content),
            'estimatedSections': 0
        }
        
        if outline_data and 'sections' in outline_data:
            section_index = 0
            for section in outline_data['sections']:
                # Provide more detailed section information
                section_data = {
                    'id': f"section-{section_index}",
                    'title': section.get('title', f"Section {section_index + 1}"),
                    'description': section.get('description', ''),
                    'content': '',
                    'isComplete': False,
                    'tokens': section.get('estimatedTokens', 200),
                    'difficulty': section.get('difficulty', 'medium'),
                    'topics': section.get('topics', [])
                }
                formatted_outline['sections'].append(section_data)
                formatted_outline['totalTokens'] += section.get('estimatedTokens', 200)
                section_index += 1
            
            formatted_outline['estimatedSections'] = len(formatted_outline['sections'])
        else:
            # Fallback: create basic sections from content if outline generation fails
            logger.warning("No sections found in outline_data, creating fallback sections")
            content_chunks = content.split('\n\n') if content else []
            chunk_size = max(1, len(content_chunks) // 3)  # Create 3 sections by default
            
            for i in range(min(3, len(content_chunks) // chunk_size + 1)):
                start_idx = i * chunk_size
                end_idx = min((i + 1) * chunk_size, len(content_chunks))
                chunk_content = '\n\n'.join(content_chunks[start_idx:end_idx])
                
                if chunk_content.strip():
                    formatted_outline['sections'].append({
                        'id': f"section-{i}",
                        'title': f"Section {i + 1}",
                        'description': chunk_content[:100] + "..." if len(chunk_content) > 100 else chunk_content,
                        'content': '',
                        'isComplete': False,
                        'tokens': len(chunk_content) // 4,  # Rough estimate
                        'difficulty': 'medium',
                        'topics': []
                    })
                    formatted_outline['totalTokens'] += len(chunk_content) // 4
            
            formatted_outline['estimatedSections'] = len(formatted_outline['sections'])
        
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
            logger.info(f"Generated outline with {len(outline_data.get('sections', []))} sections for file {file_id}")
            
            # Send outline information to frontend
            yield f"data: {json.dumps({'type': 'outline', 'sections': len(outline_data.get('sections', [])), 'message': 'Outline generated, starting content creation'})}\n\n"
            
            # Stream content section by section
            total_sections = len(outline_data.get('sections', []))
            current_section = 0
            total_tokens_used = 0
            
            # Split content into chunks for better section mapping
            content_chunks = content.split('\n\n') if content else []
            chunk_size = max(1, len(content_chunks) // max(1, total_sections))
            
            for section in outline_data.get('sections', []):
                # Check token budget before each section
                can_continue, remaining = token_budget_service.check_budget(user_id)
                if not can_continue:
                    yield f"data: {json.dumps({'type': 'token_limit', 'message': 'Token budget reached'})}\n\n"
                    break
                
                # Send section start notification
                yield f"data: {json.dumps({'type': 'section_start', 'section': current_section, 'title': section.get('title'), 'progress': (current_section / total_sections) * 100})}\n\n"
                
                # Extract relevant content for this section
                start_idx = current_section * chunk_size
                end_idx = min((current_section + 1) * chunk_size, len(content_chunks))
                section_source_content = '\n\n'.join(content_chunks[start_idx:end_idx])
                
                # If no specific content available, use the section from outline
                if not section_source_content.strip():
                    section_source_content = section.get('content', section.get('description', ''))
                    
                logger.info(f"Processing section {current_section}: '{section.get('title')}' with {len(section_source_content)} chars of source content")
                
                # Build comprehensive prompt with source material
                detailed_prompt = f"""
Create personalized educational content based on the following source material:

SECTION TOPIC: {section.get('title', 'Educational Content')}

SOURCE CONTENT:
{section_source_content[:2000]}

PERSONALIZATION REQUIREMENTS:
- Learning Style: {preferences.get('learning_style', 'balanced')}
- Depth Level: {preferences.get('depth', 'intermediate')}
- Make it engaging and interactive
- Include practical examples when possible
- Break down complex concepts into digestible parts

Please generate comprehensive, well-structured educational content that builds upon the source material while adapting to the specified learning preferences.
"""
                
                # Build personalization system message
                system_message = f"""You are an expert educator creating personalized learning content. 

Your role is to:
1. Transform the provided source material into engaging, personalized educational content
2. Adapt the complexity and presentation style to match the learner's preferences
3. Maintain accuracy while making content more accessible and engaging
4. Include examples, analogies, and practical applications
5. Structure content with clear headings and logical flow

Learning Style: {preferences.get('learning_style', 'balanced')}
Depth: {preferences.get('depth', 'intermediate')}
"""
                
                # Stream personalized content for this section
                section_content = ""
                for chunk in ai_service.stream_personalized_content(
                    prompt=detailed_prompt,
                    system_message=system_message,
                    temperature=0.7
                ):
                    if chunk.get('content'):
                        section_content += chunk['content']
                        
                        # Update token usage
                        tokens_used = len(section_content) // 4  # Rough estimate
                        token_budget_service.track_usage(user_id, tokens_used - total_tokens_used)
                        total_tokens_used = tokens_used
                        
                        # Send content chunk with section info
                        yield f"data: {json.dumps({'type': 'content', 'content': chunk['content'], 'section': current_section, 'section_title': section.get('title'), 'progress': ((current_section + 0.5) / total_sections) * 100, 'tokens_used': total_tokens_used})}\n\n"
                
                # Mark section complete
                current_section += 1
                yield f"data: {json.dumps({'type': 'section_complete', 'section': current_section - 1, 'section_title': section.get('title'), 'progress': (current_section / total_sections) * 100})}\n\n"
                
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

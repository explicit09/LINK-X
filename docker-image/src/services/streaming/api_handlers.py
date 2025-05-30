"""
API handlers for streaming personalization endpoints
"""
import logging
from typing import Optional, Dict, Any
from flask import Response, request, jsonify

from sqlalchemy.orm import Session
from .data_processor import DataProcessor
from .recommendation_engine import RecommendationEngine
from .streaming_handler import StreamingHandler

logger = logging.getLogger(__name__)


class PersonalizationAPI:
    """API handlers for personalization endpoints"""
    
    def __init__(self, db_session_factory, openai_client):
        self.Session = db_session_factory
        self.openai_client = openai_client
        self.recommendation_engine = RecommendationEngine()
        self.streaming_handler = StreamingHandler(openai_client)
        self.logger = logging.getLogger(__name__)
    
    def check_personalized_content(self, file_id: str) -> tuple:
        """Check if personalized content exists for user and file"""
        if request.method == 'OPTIONS':
            return '', 204
        
        db = None
        try:
            db = self.Session()
            processor = DataProcessor(db)
            
            # Get user info
            firebase_uid = request.cookies.get('firebase_uid')
            if not firebase_uid:
                self.logger.warning("No firebase_uid in cookies, using anonymous access")
                return jsonify({'exists': False}), 200
            
            user_id, _ = processor.get_user_info(firebase_uid)
            if not user_id:
                return jsonify({'exists': False}), 200
            
            # Check for existing content
            existing_content = processor.check_personalized_content(user_id, file_id)
            if existing_content:
                return jsonify(existing_content), 200
            
            return jsonify({'exists': False}), 200
            
        except Exception as e:
            self.logger.error(f"Error checking personalized content: {str(e)}", exc_info=True)
            return jsonify({'error': str(e)}), 500
        finally:
            if db:
                db.close()
    
    def save_personalized_content(self, file_id: str) -> tuple:
        """Save personalized content to database"""
        if request.method == 'OPTIONS':
            return '', 204
        
        db = None
        try:
            db = self.Session()
            processor = DataProcessor(db)
            data = request.get_json() or {}
            
            # Get user info
            firebase_uid = request.cookies.get('firebase_uid')
            if not firebase_uid:
                self.logger.warning("No firebase_uid in cookies for save operation")
                return jsonify({'error': 'Authentication required'}), 401
            
            user_id, _ = processor.get_user_info(firebase_uid)
            if not user_id:
                return jsonify({'error': 'User not found'}), 404
            
            # Save content
            content = data.get('content', {})
            success = processor.save_personalized_content(user_id, file_id, content)
            
            if success:
                return jsonify({'success': True}), 200
            else:
                return jsonify({'error': 'Failed to save content'}), 500
            
        except Exception as e:
            self.logger.error(f"Error saving personalized content: {str(e)}", exc_info=True)
            return jsonify({'error': str(e)}), 500
        finally:
            if db:
                db.close()
    
    def get_personalization_outline(self, file_id: str) -> tuple:
        """Get document outline for skeleton UI"""
        if request.method == 'OPTIONS':
            return '', 204
        
        db = None
        try:
            db = self.Session()
            processor = DataProcessor(db)
            
            self.logger.info(f"Getting outline for file_id: {file_id}")
            
            # Get document outline
            outline = processor.get_document_outline(file_id)
            
            return jsonify(outline), 200
            
        except Exception as e:
            self.logger.error(f"Error generating outline: {str(e)}", exc_info=True)
            # Return minimal outline on error
            return jsonify({
                "fileId": file_id,
                "fileName": "Document",
                "chapters": [
                    {
                        "id": "chapter-1",
                        "title": "Introduction & Overview",
                        "estimatedTokens": 2000,
                        "subsections": [
                            {"id": "1.1", "title": "Getting Started", "estimatedTokens": 500},
                            {"id": "1.2", "title": "Core Concepts", "estimatedTokens": 600},
                            {"id": "1.3", "title": "Key Objectives", "estimatedTokens": 500},
                            {"id": "1.4", "title": "Learning Path", "estimatedTokens": 400}
                        ]
                    }
                ],
                "totalEstimatedTokens": 2000
            }), 200
        finally:
            if db:
                db.close()
    
    def stream_personalized_content(self, file_id: str) -> Response:
        """Stream personalized content generation"""
        if request.method == 'OPTIONS':
            return '', 204
        
        db = None
        try:
            db = self.Session()
            processor = DataProcessor(db)
            
            self.logger.info(f"Streaming personalized content for file_id: {file_id}")
            
            # Get request data
            data = request.get_json() or {}
            chapter_id = data.get('chapterId')
            subsection_id = data.get('subsectionId')
            previous_sections = data.get('previousSections', [])
            regenerate = data.get('regenerate', False)
            
            # Get user info
            firebase_uid = request.cookies.get('firebase_uid')
            user_id, student_profile = processor.get_user_info(firebase_uid)
            
            # Get persona string
            persona = student_profile.to_persona() if student_profile else "General learner seeking comprehensive understanding"
            
            # Get file context
            context, file_name = processor.get_file_context(file_id)
            
            # Extract keywords
            keywords = self.recommendation_engine.extract_keywords(context)
            
            # Get section topics
            section_topics = self.recommendation_engine.get_section_topics(
                subsection_id, file_name, keywords
            )
            
            section_info = section_topics.get(
                subsection_id,
                {
                    "topic": f"Section {subsection_id} of {file_name}",
                    "focus": "Personalized learning content"
                }
            )
            
            # Build prompt
            prompt, system_message = self.recommendation_engine.build_prompt(
                subsection_id=subsection_id,
                topic=section_info.topic,
                focus=section_info.focus,
                persona=persona,
                file_name=file_name,
                context=context,
                previous_sections=previous_sections,
                regenerate=regenerate
            )
            
            # Get temperature
            temperature = self.recommendation_engine.get_generation_temperature(regenerate)
            
            # Close DB before streaming
            db.close()
            db = None
            
            # Generate stream
            def generate():
                yield from self.streaming_handler.generate_personalized_stream(
                    chapter_id=chapter_id,
                    subsection_id=subsection_id,
                    prompt=prompt,
                    system_message=system_message,
                    temperature=temperature
                )
            
            return Response(generate(), mimetype='text/event-stream')
            
        except Exception as e:
            self.logger.error(f"Error in stream endpoint: {str(e)}", exc_info=True)
            return jsonify({'error': str(e)}), 500
        finally:
            if db:
                db.close()
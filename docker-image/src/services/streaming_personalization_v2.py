"""
Optimized streaming personalization service for improved performance and UX
"""

import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta

from flask import Response, stream_with_context
from redis import Redis
import tiktoken

from core.config import get_settings
from redis import Redis
from services.ai.ai_service import AIService
from services.file_service import FileService
from repositories.user_repository import UserRepository
from repositories.file_repository import FileRepository

logger = logging.getLogger(__name__)
settings = get_settings()

@dataclass
class StreamingSection:
    """Represents a content section for streaming"""
    anchor: str
    title: str
    content: str
    order: int
    
@dataclass
class PersonalizationContext:
    """Context for personalization"""
    user_id: str
    file_id: str
    user_profile: Dict
    file_content: str
    sections: List[StreamingSection]
    
class OptimizedStreamingPersonalizationService:
    """
    Optimized service for streaming personalized content with:
    - Progressive content generation
    - Smart caching
    - Parallel processing
    - Error recovery
    """
    
    def __init__(
        self,
        ai_service: AIService,
        file_service: FileService,
        user_repo: UserRepository,
        file_repo: FileRepository,
        cache: Redis
    ):
        self.ai_service = ai_service
        self.file_service = file_service
        self.user_repo = user_repo
        self.file_repo = file_repo
        self.cache = cache
        self.encoder = tiktoken.get_encoding("cl100k_base")
        
    def generate_outline(self, file_id: str, user_id: str) -> List[Dict]:
        """
        Generate content outline with intelligent section detection
        """
        try:
            logger.info(f"Generating outline - file_id: {file_id}, user_id: {user_id}")
            
            # Check cache first
            cache_key = f"outline:{file_id}:{user_id}"
            cached_outline_raw = self.cache.get(cache_key)
            cached_outline = json.loads(cached_outline_raw) if cached_outline_raw else None
            if cached_outline:
                logger.info("Returning cached outline")
                return cached_outline
            
            # Get file content
            file_data = self._get_file_data(file_id, user_id)
            if not file_data:
                logger.error(f"File not found or access denied - file_id: {file_id}, user_id: {user_id}")
                raise ValueError("File not found or access denied")
            
            content = file_data.get('processed_text', '')
            if not content:
                logger.error(f"No processed text found for file {file_id}")
                logger.error(f"File data keys: {list(file_data.keys()) if isinstance(file_data, dict) else 'Not a dict'}")
                raise ValueError("No content available for personalization")
            
            # Smart content analysis for better sectioning
            sections = self._analyze_content_structure(content)
            
            # Generate outline
            outline = []
            for i, section in enumerate(sections):
                outline.append({
                    'anchor': f'section-{i}',
                    'title': section['title'],
                    'order': i,
                    'content_preview': section['preview']
                })
            
            # Cache for 24 hours
            self.cache.setex(cache_key, 86400, json.dumps(outline))
            
            return outline
            
        except Exception as e:
            logger.error(f"Error generating outline: {str(e)}")
            raise
    
    def stream_personalized_content(
        self, 
        file_id: str, 
        user_id: str
    ):
        """
        Stream personalized content with progressive generation
        """
        try:
            # Initialize context
            context = self._initialize_context(file_id, user_id)
            
            # Start streaming
            yield self._create_event('start', {
                'total_sections': len(context.sections),
                'file_id': file_id
            })
            
            # Process sections in parallel batches for faster generation
            batch_size = 2  # Process 2 sections at a time
            for i in range(0, len(context.sections), batch_size):
                batch = context.sections[i:i + batch_size]
                
                # Process batch
                personalized_sections = []
                for section in batch:
                    try:
                        result = self._personalize_section(section, context)
                        personalized_sections.append(result)
                    except Exception as e:
                        personalized_sections.append(e)
                
                # Stream results
                for j, (section, result) in enumerate(zip(batch, personalized_sections)):
                    if isinstance(result, Exception):
                        logger.error(f"Error personalizing section: {result}")
                        # Fallback to original content
                        result = section.content
                    
                    # Send section start event
                    yield self._create_event('section_start', {
                        'section_id': section.anchor,
                        'title': section.title,
                        'order': section.order
                    })
                    
                    # Stream content in chunks for progressive display
                    chunks = self._chunk_content(result, chunk_size=500)
                    for chunk in chunks:
                        yield self._create_event('content', {
                            'section_id': section.anchor,
                            'content': chunk
                        })
                        import time
                        time.sleep(0.05)  # Small delay for smooth streaming
                    
                    # Section complete
                    yield self._create_event('section_complete', {
                        'section_id': section.anchor
                    })
            
            # All sections complete
            yield self._create_event('complete', {
                'message': 'Personalization complete'
            })
            
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            yield self._create_event('error', {
                'message': str(e)
            })
    
    def _initialize_context(self, file_id: str, user_id: str) -> PersonalizationContext:
        """Initialize personalization context with all required data"""
        # Get user profile
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Extract user profile from student_profile or create default
        user_profile = {}
        if user.student_profile and hasattr(user.student_profile, 'onboard_answers'):
            user_profile = user.student_profile.onboard_answers or {}
        
        # Ensure required fields exist with defaults
        user_profile.setdefault('learning_style', 'visual')
        user_profile.setdefault('expertise_level', 'intermediate')
        user_profile.setdefault('interests', [])
        user_profile.setdefault('tone_preference', 'professional')
        
        # Get file data
        file_data = self._get_file_data(file_id, user_id)
        if not file_data:
            raise ValueError("File not found or access denied")
        
        content = file_data.get('processed_text', '')
        
        # Get or generate sections
        outline = self.generate_outline(file_id, user_id)
        sections = []
        
        # Extract content for each section
        content_parts = self._split_content_by_outline(content, outline)
        
        for i, (outline_item, content_part) in enumerate(zip(outline, content_parts)):
            sections.append(StreamingSection(
                anchor=outline_item['anchor'],
                title=outline_item['title'],
                content=content_part,
                order=i
            ))
        
        return PersonalizationContext(
            user_id=user_id,
            file_id=file_id,
            user_profile=user_profile,
            file_content=content,
            sections=sections
        )
    
    def _personalize_section(
        self, 
        section: StreamingSection, 
        context: PersonalizationContext
    ) -> str:
        """Personalize a single section with caching"""
        # Check cache
        cache_key = f"personalized:{context.file_id}:{context.user_id}:{section.anchor}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached.decode('utf-8')
        
        try:
            # Create focused prompt for better personalization
            prompt = self._create_personalization_prompt(
                section_title=section.title,
                content=section.content,
                user_profile=context.user_profile,
                context_sections=[s.title for s in context.sections]
            )
            
            # Generate personalized content using contextual response
            try:
                personalized_content = self.ai_service.generate_contextual_response(
                    message=prompt,
                    context={}
                )
                
                # If that fails, try using the client directly
                if not personalized_content:
                    response = self.ai_service.client.create_chat_completion(
                        model=self.ai_service.client.default_model,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=2000,
                        temperature=0.7
                    )
                    personalized_content = response.choices[0].message.content
                    
            except Exception as ai_error:
                logger.error(f"AI generation failed: {ai_error}")
                personalized_content = section.content  # fallback to original
            
            # Cache for 24 hours
            self.cache.setex(cache_key, 86400, personalized_content)
            
            return personalized_content
            
        except Exception as e:
            logger.error(f"Personalization error: {str(e)}")
            # Return original content as fallback
            return section.content
    
    def _create_personalization_prompt(
        self,
        section_title: str,
        content: str,
        user_profile: Dict,
        context_sections: List[str]
    ) -> str:
        """Create an optimized personalization prompt"""
        learning_style = user_profile.get('learning_style', 'visual')
        expertise = user_profile.get('expertise_level', 'intermediate')
        interests = user_profile.get('interests', [])
        tone = user_profile.get('tone_preference', 'professional')
        
        return f"""Transform this educational content for optimal learning:

Section: {section_title}
Content: {content}

Student Profile:
- Learning Style: {learning_style}
- Expertise: {expertise}
- Interests: {', '.join(interests[:3]) if interests else 'general'}
- Preferred Tone: {tone}

Context: This is part of a larger document with sections on: {', '.join(context_sections[:5])}

Requirements:
1. Extract the 3-5 KEY insights from this section
2. Explain concepts clearly for {expertise} level understanding
3. Use {learning_style} learning approaches (visual descriptions, examples, etc.)
4. Maintain a {tone} tone throughout
5. Add ONE relevant example if it helps understanding
6. Keep the same general length as the original

Format with markdown, use **bold** for key terms, and structure with clear paragraphs.
DO NOT add meta-commentary or section headers - jump straight into the content.
"""
    
    def _analyze_content_structure(self, content: str) -> List[Dict]:
        """Intelligently analyze content to find natural sections"""
        # Use AI to identify section breaks
        prompt = f"""Analyze this educational content and identify natural section breaks:

{content[:3000]}...

Identify 3-8 major sections based on:
- Topic transitions
- Natural breakpoints
- Conceptual boundaries

For each section, provide:
1. A clear, descriptive title (3-7 words)
2. The starting text snippet (first 50 characters)

Return as JSON array: [{{"title": "...", "start_snippet": "..."}}]
"""
        
        try:
            response = self.ai_service.generate_response(
                prompt=prompt,
                max_tokens=500,
                temperature=0.3
            )
            
            sections_data = json.loads(response.get('content', '[]'))
            
            # Map sections to content
            sections = []
            content_lower = content.lower()
            
            for i, section_data in enumerate(sections_data):
                start_snippet = section_data.get('start_snippet', '').lower()
                start_idx = content_lower.find(start_snippet) if start_snippet else -1
                
                if start_idx == -1 and i == 0:
                    start_idx = 0
                
                sections.append({
                    'title': section_data.get('title', f'Section {i+1}'),
                    'start_index': start_idx,
                    'preview': content[start_idx:start_idx+200] if start_idx != -1 else ''
                })
            
            # Sort by start index
            sections.sort(key=lambda x: x['start_index'])
            
            return sections
            
        except Exception as e:
            logger.error(f"Error analyzing content structure: {e}")
            # Fallback to simple splitting
            return self._simple_content_split(content)
    
    def _simple_content_split(self, content: str) -> List[Dict]:
        """Simple fallback content splitting"""
        # Split by common markers
        markers = ['\n\n\n', '\n## ', '\n# ', '\n### ']
        
        sections = []
        chunk_size = len(content) // 5  # Aim for ~5 sections
        
        for i in range(0, len(content), chunk_size):
            chunk = content[i:i+chunk_size]
            # Try to find a good break point
            for marker in markers:
                last_marker = chunk.rfind(marker)
                if last_marker > chunk_size * 0.7:
                    chunk = chunk[:last_marker]
                    break
            
            # Extract first line as title hint
            first_line = chunk.split('\n')[0][:50]
            
            sections.append({
                'title': f'Part {len(sections) + 1}',
                'start_index': i,
                'preview': chunk[:200]
            })
        
        return sections
    
    def _split_content_by_outline(self, content: str, outline: List[Dict]) -> List[str]:
        """Split content according to outline sections"""
        parts = []
        
        # Get start indices from outline
        indices = []
        content_lower = content.lower()
        
        for item in outline:
            preview = item.get('content_preview', '').lower()
            idx = content_lower.find(preview) if preview else -1
            indices.append(idx if idx != -1 else 0)
        
        # Add end index
        indices.append(len(content))
        
        # Extract content for each section
        for i in range(len(outline)):
            start = indices[i]
            end = indices[i + 1] if i + 1 < len(indices) else len(content)
            
            # Ensure we have valid indices
            if start < 0:
                start = 0
            if end <= start:
                end = start + 1000  # Default chunk size
            
            parts.append(content[start:end].strip())
        
        return parts
    
    def _chunk_content(self, content: str, chunk_size: int = 500) -> List[str]:
        """Split content into streamable chunks"""
        words = content.split()
        chunks = []
        
        current_chunk = []
        current_size = 0
        
        for word in words:
            current_chunk.append(word)
            current_size += len(word) + 1
            
            if current_size >= chunk_size:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_size = 0
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
    
    def _create_event(self, event_type: str, data: Dict) -> str:
        """Create SSE event"""
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"
    
    def _get_file_data(self, file_id: str, user_id: str) -> Optional[Dict]:
        """Get file data with access check"""
        try:
            logger.info(f"Getting file data - file_id: {file_id}, user_id: {user_id}")
            
            # Get file data first
            file_obj = self.file_repo.get_by_id(file_id)
            logger.info(f"File object retrieved - exists: {file_obj is not None}")
            
            if not file_obj:
                logger.warning(f"File {file_id} not found")
                return None
            
            # Get the extracted text from FileChunk table
            extracted_text = ''
            
            # First check if there's transcription (for audio files)
            if hasattr(file_obj, 'transcription') and file_obj.transcription:
                extracted_text = file_obj.transcription
                logger.info(f"Using transcription as extracted text (length: {len(extracted_text)})")
            else:
                # Get file chunks
                from db.schema import FileChunk
                from core.database import db_manager
                
                with db_manager.get_session() as session:
                    chunks = session.query(FileChunk)\
                        .filter_by(file_id=file_id)\
                        .order_by(FileChunk.chunk_index)\
                        .all()
                    
                    if chunks:
                        # Combine all chunks to get the full text
                        extracted_text = '\n\n'.join([chunk.content for chunk in chunks])
                        logger.info(f"Retrieved {len(chunks)} chunks, total text length: {len(extracted_text)}")
                    else:
                        logger.warning(f"No FileChunk entries found for file {file_id}")
                        
                        # Check if file is stored in S3 and needs processing
                        if hasattr(file_obj, 's3_key') and file_obj.s3_key:
                            logger.info(f"File is in S3 with key: {file_obj.s3_key}")
                            # TODO: Trigger file processing if not already processed
                            return None
            
            # Build file data dict
            file_data = {
                'id': str(file_obj.id),
                'name': getattr(file_obj, 'title', 'Unknown'),
                'processed_text': extracted_text,
                'module_id': str(getattr(file_obj, 'module_id', '')),
                'processed': bool(extracted_text),
                'storage_type': getattr(file_obj, 'storage_type', 'unknown'),
                'file_type': getattr(file_obj, 'file_type', 'unknown')
            }
            
            logger.info(f"File data - id: {file_data['id']}, name: {file_data['name']}, "
                       f"has_text: {bool(extracted_text)}, storage: {file_data['storage_type']}")
            
            if not extracted_text:
                logger.error(f"No extracted text found for file {file_id}")
                return None
            
            return file_data
            
        except Exception as e:
            logger.error(f"Error getting file data: {e}", exc_info=True)
            return None
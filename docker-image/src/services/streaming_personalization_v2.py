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
from services.file_service_supabase import SupabaseFileService as FileService
from repositories.user_repository import UserRepository
from repositories.file_repository import FileRepository
from services.ai.hybrid_search_service import HybridSearchService
# Note: EmbeddingsService removed - Supabase handles embeddings automatically
from services.ai.hierarchical_rag_service import HierarchicalRAGService
from services.ai.adaptive_context_service import AdaptiveContextService
from core.prompt_manager import PromptManager
from core.critic_loop import CriticLoop
from services.personalization_memory import PersonalizationMemoryService

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
    course_id: Optional[str] = None
    
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
        
        # Initialize enhanced services
        embeddings_service = EmbeddingsService(ai_service.client)
        self.hybrid_search = HybridSearchService(embeddings_service)
        self.hierarchical_rag = HierarchicalRAGService(embeddings_service)
        self.adaptive_context = AdaptiveContextService(self.hierarchical_rag)
        self.prompt_manager = PromptManager()
        self.memory_service = PersonalizationMemoryService(cache)
        
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
            
            # Process sections with parallel outline generation and direct personalization
            import asyncio
            import concurrent.futures
            
            # Start parallel personalization for all sections
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                # Submit all personalization tasks in parallel
                personalization_futures = {}
                for section in context.sections:
                    future = executor.submit(self._personalize_section_sync, section, context)
                    personalization_futures[section.anchor] = (section, future)
                
                # Stream sections as they complete
                for section in context.sections:
                    try:
                        # Send section start event immediately
                        yield self._create_event('section_start', {
                            'section_id': section.anchor,
                            'title': section.title,
                            'order': section.order
                        })
                        
                        # Get the personalized content (wait for completion if needed)
                        section_obj, future = personalization_futures[section.anchor]
                        
                        try:
                            # Wait for personalization to complete (with timeout)
                            personalized_content = future.result(timeout=30)
                            
                            if personalized_content and personalized_content.strip():
                                # Stream ONLY personalized content
                                logger.info(f"Streaming personalized content for {section.anchor}")
                                personalized_chunks = self._chunk_content(personalized_content, chunk_size=200)
                                for chunk in personalized_chunks:
                                    yield self._create_event('content', {
                                        'section_id': section.anchor,
                                        'content': chunk
                                    })
                                    import time
                                    time.sleep(0.08)  # Smooth streaming
                            else:
                                # Fallback to original content only if personalization completely fails
                                logger.warning(f"Personalization failed for {section.anchor}, using original")
                                original_chunks = self._chunk_content(section.content, chunk_size=200)
                                for chunk in original_chunks:
                                    yield self._create_event('content', {
                                        'section_id': section.anchor,
                                        'content': chunk
                                    })
                                    import time
                                    time.sleep(0.05)
                        
                        except concurrent.futures.TimeoutError:
                            logger.error(f"Personalization timeout for {section.anchor}")
                            # Use original content as fallback
                            original_chunks = self._chunk_content(section.content, chunk_size=200)
                            for chunk in original_chunks:
                                yield self._create_event('content', {
                                    'section_id': section.anchor,
                                    'content': chunk
                                })
                        
                        except Exception as personalization_error:
                            logger.error(f"Personalization error for {section.anchor}: {personalization_error}")
                            # Use original content as fallback
                            original_chunks = self._chunk_content(section.content, chunk_size=200)
                            for chunk in original_chunks:
                                yield self._create_event('content', {
                                    'section_id': section.anchor,
                                    'content': chunk
                                })
                        
                        # Section complete
                        yield self._create_event('section_complete', {
                            'section_id': section.anchor
                        })
                        
                    except Exception as e:
                        logger.error(f"Error processing section {section.anchor}: {e}")
                        # Send error event but continue with next section
                        yield self._create_event('section_error', {
                            'section_id': section.anchor,
                            'error': str(e)
                        })
                        
                        # Try to stream original content as fallback
                        try:
                            chunks = self._chunk_content(section.content, chunk_size=200)
                            for chunk in chunks:
                                yield self._create_event('content', {
                                    'section_id': section.anchor,
                                    'content': chunk
                                })
                                import time
                                time.sleep(0.1)
                        except:
                            pass  # If even fallback fails, just continue
                        
                        # Mark section complete
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
            raw_profile = user.student_profile.onboard_answers or {}
            
            # Map database fields to expected personalization fields
            user_profile = {
                'user_id': user_id,  # Add user_id for memory service
                'learning_style': raw_profile.get('learningStyle', raw_profile.get('learning_style', 'visual')),
                'expertise_level': raw_profile.get('depth', 'intermediate'),  # depth -> expertise_level mapping
                'interests': self._normalize_interests(raw_profile.get('interests', [])),
                'tone_preference': raw_profile.get('traits', raw_profile.get('tone', 'professional')),
                'topics': self._normalize_topics(raw_profile.get('topics', [])),
                'schedule': raw_profile.get('schedule', 'flexible'),
                'job': raw_profile.get('job', '')
            }
            
            logger.info(f"User profile mapped: {user_profile}")
        
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
        
        context = PersonalizationContext(
            user_id=user_id,
            file_id=file_id,
            user_profile=user_profile,
            file_content=content,
            sections=sections,
            course_id=getattr(self, '_course_id', None)
        )
        
        return context
    
    def _personalize_section_sync(
        self, 
        section: StreamingSection, 
        context: PersonalizationContext
    ) -> str:
        """Synchronous wrapper for parallel personalization"""
        return self._personalize_section(section, context)
    
    def _personalize_section(
        self, 
        section: StreamingSection, 
        context: PersonalizationContext
    ) -> str:
        """Personalize a single section using RAG and YAML prompts with immediate impact"""
        # Check cache
        cache_key = f"personalized:{context.file_id}:{context.user_id}:{section.anchor}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached.decode('utf-8')
        
        try:
            # Add immediate personalization flag for first section
            is_first_section = section.order == 0
            
            # Extract opening for immediate personalization
            content_lines = section.content.split('\n')
            opening_sentences = '. '.join(section.content.split('.')[:3]) + '.'
            # Step 1: Use adaptive context with hierarchical RAG
            # Determine user expertise from profile
            user_expertise = self._get_user_expertise(context.user_profile)
            
            # Get adaptive context for this section
            search_results, context_window = self.adaptive_context.get_adaptive_context(
                query=section.title + " " + section.content[:200],
                user_expertise=user_expertise,
                max_tokens_budget=2000,  # Per section budget
                course_id=context.course_id
            )
            
            logger.info(f"Adaptive context for {section.anchor}: "
                       f"{len(search_results)} chunks, "
                       f"window: {context_window.max_tokens} tokens")
            
            # Combine relevant chunks based on context window
            relevant_chunks = []
            for result in search_results:
                chunk_info = f"[{result.chunk_type or 'content'}] {result.content}"
                relevant_chunks.append(chunk_info)
            
            relevant_context = "\n\n".join(relevant_chunks)
            
            # Step 2: Use enhanced YAML prompt template with context-aware personalization
            try:
                # Determine best interest match for this content
                primary_interest = self._select_primary_interest(section, context.user_profile)
                
                # Create enhanced context with learning preferences
                enhanced_profile = self._create_enhanced_profile(context.user_profile, section)
                
                # For first section or important sections, add extra emphasis on immediate personalization
                if is_first_section:
                    # Create an enhanced prompt that emphasizes immediate personalization
                    immediate_hook = self._generate_immediate_hook(primary_interest, section.title)
                    enhanced_content = f"IMPORTANT: Start with this hook: '{immediate_hook}'\n\n{section.content}"
                else:
                    enhanced_content = section.content
                
                # Load personalization prompt from YAML
                prompt_template = self.prompt_manager.get_prompt(
                    'natural_personalization',
                    section_title=section.title,
                    section_content=enhanced_content,
                    relevant_context=relevant_context,
                    user_profile=enhanced_profile,
                    learning_style=enhanced_profile.get('learning_style', 'visual'),
                    expertise_level=enhanced_profile.get('expertise_level', 'intermediate'),
                    interests=enhanced_profile.get('interests', []),
                    tone_preference=enhanced_profile.get('tone_preference', 'professional'),
                    primary_interest=primary_interest,
                    content_domain=self._identify_content_domain(section),
                    preferred_examples=self._generate_preferred_examples(enhanced_profile, section),
                    is_first_section=is_first_section
                )
            except:
                # Fallback to hardcoded prompt if YAML not available
                prompt_template = self._create_personalization_prompt(
                    section_title=section.title,
                    content=section.content,
                    user_profile=context.user_profile,
                    context_sections=[s.title for s in context.sections]
                )
            
            # Generate personalized content
            try:
                personalized_content = self.ai_service.generate_contextual_response(
                    message=prompt_template,
                    context={'relevant_chunks': relevant_context}
                )
                
                # If that fails, try using the client directly
                if not personalized_content:
                    response = self.ai_service.client.create_chat_completion(
                        model=self.ai_service.client.default_model,
                        messages=[{"role": "user", "content": prompt_template}],
                        max_tokens=2000,
                        temperature=0.7
                    )
                    personalized_content = response.choices[0].message.content
                    
            except Exception as ai_error:
                logger.error(f"AI generation failed: {ai_error}")
                personalized_content = section.content  # fallback to original
            
            # Quality validation (non-blocking)
            if personalized_content and personalized_content != section.content:
                self._schedule_quality_validation(
                    personalized_content,
                    section,
                    relevant_context,
                    cache_key
                )
            
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
    
    def _determine_search_intent(self, section: StreamingSection) -> str:
        """Determine search intent based on section characteristics"""
        content_lower = section.content.lower()
        title_lower = section.title.lower() if section.title else ""
        
        # Check for definition indicators
        if any(indicator in content_lower for indicator in ['is defined as', 'refers to', 'means']):
            return 'definition'
        elif any(indicator in title_lower for indicator in ['definition', 'what is', 'terminology']):
            return 'definition'
        
        # Check for example indicators
        elif any(indicator in content_lower for indicator in ['for example', 'for instance', 'such as']):
            return 'example'
        elif 'example' in title_lower:
            return 'example'
        
        # Check for factual content
        elif any(indicator in content_lower for indicator in ['research shows', 'studies indicate', 'according to']):
            return 'factual'
        
        # Default to explanation
        else:
            return 'explanation'
    
    def _normalize_interests(self, interests) -> List[str]:
        """Normalize interests field to a list of strings"""
        if isinstance(interests, str):
            # Split comma-separated interests
            return [interest.strip() for interest in interests.split(',') if interest.strip()]
        elif isinstance(interests, list):
            return [str(interest).strip() for interest in interests if str(interest).strip()]
        else:
            return []
    
    def _normalize_topics(self, topics) -> List[str]:
        """Normalize topics field to a list of strings"""
        if isinstance(topics, str):
            # Split comma-separated topics
            return [topic.strip() for topic in topics.split(',') if topic.strip()]
        elif isinstance(topics, list):
            return [str(topic).strip() for topic in topics if str(topic).strip()]
        else:
            return []
    
    def _select_primary_interest(self, section: StreamingSection, user_profile: Dict) -> str:
        """Select the most relevant interest for this content section"""
        interests = user_profile.get('interests', [])
        if not interests:
            return 'general'
        
        content_lower = (section.title + " " + section.content).lower()
        
        # Interest matching keywords
        interest_keywords = {
            'gaming': ['game', 'play', 'strategy', 'level', 'score', 'competition', 'player', 'system', 'algorithm', 'data'],
            'music': ['rhythm', 'pattern', 'composition', 'harmony', 'flow', 'tempo', 'beat', 'sound', 'frequency'],
            'basketball': ['team', 'strategy', 'performance', 'stats', 'competition', 'analytics', 'coordination', 'growth'],
            'sports': ['team', 'performance', 'competition', 'analytics', 'strategy', 'training', 'improvement'],
            'technology': ['system', 'process', 'innovation', 'development', 'analysis', 'optimization'],
            'programming': ['logic', 'structure', 'algorithm', 'process', 'optimization', 'development']
        }
        
        # Score each interest based on content relevance
        scores = {}
        for interest in interests:
            interest_lower = interest.lower()
            for key, keywords in interest_keywords.items():
                if key in interest_lower or interest_lower in key:
                    score = sum(1 for keyword in keywords if keyword in content_lower)
                    scores[interest] = scores.get(interest, 0) + score
        
        # Return highest scoring interest, or first if tied
        return max(scores.items(), key=lambda x: x[1])[0] if scores else interests[0]
    
    def _create_enhanced_profile(self, user_profile: Dict, section: StreamingSection) -> Dict:
        """Create enhanced profile with section-specific adaptations and learning history"""
        enhanced = user_profile.copy()
        
        # Add section-specific context
        enhanced['content_type'] = self._identify_content_domain(section)
        enhanced['section_complexity'] = self._assess_section_complexity(section)
        
        # Get learning insights from memory service
        user_id = enhanced.get('user_id')  # This will be set from context
        if user_id:
            learning_insights = self.memory_service.get_learning_insights(user_id)
            enhanced['preferred_interests'] = learning_insights.get('preferred_interests', [])
            enhanced['domain_familiarity'] = learning_insights.get('domain_familiarity', {})
            enhanced['learning_streak'] = learning_insights.get('learning_streak', 0)
        
        # Adjust expertise based on content domain and history
        base_expertise = user_profile.get('expertise_level', 'intermediate')
        domain_familiarity = enhanced.get('domain_familiarity', {}).get(enhanced['content_type'], 0)
        
        if enhanced['content_type'] in ['economics', 'finance'] and base_expertise == 'beginner':
            if domain_familiarity > 5:  # User has seen this domain before
                enhanced['adjusted_expertise'] = 'beginner-plus'
            else:
                enhanced['adjusted_expertise'] = 'beginner'
        
        return enhanced
    
    def _identify_content_domain(self, section: StreamingSection) -> str:
        """Identify the domain/subject of the content"""
        content_lower = (section.title + " " + section.content).lower()
        
        domain_keywords = {
            'economics': ['gdp', 'economy', 'market', 'price', 'income', 'spending', 'economic', 'fiscal'],
            'finance': ['investment', 'money', 'financial', 'capital', 'revenue', 'profit', 'budget'],
            'technology': ['system', 'software', 'algorithm', 'digital', 'tech', 'computer'],
            'science': ['research', 'analysis', 'data', 'study', 'method', 'theory', 'hypothesis'],
            'business': ['company', 'corporate', 'business', 'management', 'strategy', 'organization'],
            'mathematics': ['calculate', 'formula', 'equation', 'number', 'mathematical', 'quantitative']
        }
        
        for domain, keywords in domain_keywords.items():
            if sum(1 for keyword in keywords if keyword in content_lower) >= 2:
                return domain
        
        return 'general'
    
    def _assess_section_complexity(self, section: StreamingSection) -> str:
        """Assess the complexity level of a section"""
        content = section.content
        
        # Simple complexity indicators
        if len(content.split()) < 100:
            return 'simple'
        elif 'formula' in content.lower() or 'equation' in content.lower():
            return 'complex'
        elif content.count('.') > 10:  # Many sentences = detailed
            return 'detailed'
        else:
            return 'moderate'
    
    def _generate_preferred_examples(self, user_profile: Dict, section: StreamingSection) -> str:
        """Generate contextual examples based on user interests and content"""
        interests = user_profile.get('interests', [])
        content_domain = self._identify_content_domain(section)
        
        example_mappings = {
            ('economics', 'gaming'): "game economy systems, in-game marketplace dynamics, player trading behaviors",
            ('economics', 'music'): "music industry economics, streaming revenue models, concert ticket pricing",
            ('economics', 'basketball'): "sports economics, salary caps, team valuations, fan spending patterns",
            ('finance', 'gaming'): "game development budgets, esports prize pools, gaming company investments",
            ('finance', 'music'): "record label investments, artist revenue streams, music streaming profits",
            ('finance', 'basketball'): "team finances, player contracts, stadium investments, sponsorship deals",
            ('technology', 'gaming'): "game engine architecture, server infrastructure, player data analytics",
            ('technology', 'music'): "audio processing algorithms, streaming platforms, digital audio workstations",
            ('technology', 'basketball'): "player tracking systems, performance analytics, video analysis tools"
        }
        
        # Find best match
        for interest in interests:
            key = (content_domain, interest.lower())
            if key in example_mappings:
                return example_mappings[key]
        
        return "real-world applications, practical scenarios, everyday examples"
    
    def _generate_immediate_hook(self, primary_interest: str, section_title: str) -> str:
        """Generate an immediate, engaging hook based on user's primary interest"""
        interest_lower = primary_interest.lower()
        
        hooks = {
            'gaming': [
                "Picture this like loading into a new game level - ",
                "Think of this as unlocking a new skill tree - ",
                "Imagine you're strategizing for a boss battle - ",
                "It's like discovering a hidden game mechanic - ",
                "Consider this your next power-up - "
            ],
            'music': [
                "Think of this like composing a new track - ",
                "Imagine mixing the perfect beat - ",
                "It's like finding the rhythm in - ",
                "Picture tuning your instrument for - ",
                "Consider this like mastering a new chord progression - "
            ],
            'basketball': [
                "Think of this like drawing up a winning play - ",
                "Imagine coaching your team through - ",
                "It's like perfecting your shot for - ",
                "Picture analyzing game stats for - ",
                "Consider this your pre-game strategy for - "
            ]
        }
        
        # Find matching hooks
        for key, hook_list in hooks.items():
            if key in interest_lower:
                import random
                return random.choice(hook_list) + section_title.lower()
        
        # Default hook if no match
        return f"Let's dive into {section_title.lower()} with your perspective in mind - "
    
    def _get_user_expertise(self, user_profile: Dict) -> str:
        """Extract user expertise level from profile"""
        expertise = user_profile.get('expertise_level', 'intermediate')
        
        # Map from onboarding values to expertise levels
        expertise_lower = expertise.lower()
        if expertise_lower in ['beginner', 'novice', 'basic', 'quick']:
            return 'beginner'
        elif expertise_lower in ['intermediate', 'moderate', 'detailed']:
            return 'intermediate'
        elif expertise_lower in ['advanced', 'expert', 'professional', 'comprehensive']:
            return 'advanced'
        else:
            return 'intermediate'  # default
    
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
            
            # Get course_id for context
            course_id = None
            if hasattr(file_obj, 'module_id') and file_obj.module_id:
                from db.schema import Module
                from core.database_supabase import db_manager
                with db_manager.get_session() as session:
                    module = session.query(Module).filter_by(id=file_obj.module_id).first()
                    if module:
                        course_id = str(module.course_id)
            
            # Store course_id in instance for later use
            self._course_id = course_id
            
            # Get the extracted text from FileChunk table
            extracted_text = ''
            
            # First check if there's transcription (for audio files)
            if hasattr(file_obj, 'transcription') and file_obj.transcription:
                extracted_text = file_obj.transcription
                logger.info(f"Using transcription as extracted text (length: {len(extracted_text)})")
            else:
                # Get file chunks
                from db.schema import FileChunk
                from core.database_supabase import db_manager
                
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
                            # Trigger enhanced file processing
                            from tasks.enhanced_file_processing import process_file_with_semantic_chunking
                            process_file_with_semantic_chunking.delay(file_id)
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
    
    def _schedule_quality_validation(self, content: str, section: StreamingSection, 
                                   context: str, cache_key: str):
        """Schedule non-blocking quality validation"""
        try:
            # Import here to avoid circular imports
            from celery import current_app
            
            # Queue async validation task
            current_app.send_task(
                'tasks.quality_validation.validate_personalized_content',
                args=[content, section.content, context, cache_key],
                queue='quality_check'
            )
        except Exception as e:
            # Don't block on validation errors
            logger.debug(f"Quality validation scheduling failed: {e}")
    
    async def _validate_content_quality_async(self, content: str, original: str) -> float:
        """Async quality validation using critic loop"""
        try:
            critic_loop = CriticLoop()
            
            # Run critic evaluation
            result = await critic_loop.evaluate_personalization(
                personalized_content=content,
                original_content=original,
                criteria=['factual_accuracy', 'relevance', 'clarity']
            )
            
            # Log quality score
            quality_score = result.get('score', 0.0)
            if quality_score < 0.7:
                logger.warning(f"Low quality personalization detected: {quality_score}")
            
            return quality_score
            
        except Exception as e:
            logger.error(f"Quality validation error: {e}")
            return 0.0
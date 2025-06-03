"""
Personalization Integration Service
Bridges the gap between the existing AI infrastructure and personalization endpoints
"""

import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
import json
import re
import unicodedata
import yaml
import asyncio
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import select

from db.schema import StudentProfile, File, FileChunk, Course, Module, User
from core.enhanced_personalization import enhanced_personalization, PersonalizationContext
from core.fast_path_processor import fast_path_processor
from services.ai_service import AIService

logger = logging.getLogger(__name__)


class PersonalizationIntegrationService:
    """
    Integrates existing AI components for seamless personalization
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.ai_service = AIService()
        
    def map_student_profile(self, student_profile: StudentProfile) -> Dict[str, Any]:
        """
        Map database student profile to AI engine format
        """
        onboarding = student_profile.onboard_answers or {}
        
        # Extract all relevant preferences
        mapped_profile = {
            'name': student_profile.name,
            'learning_style': onboarding.get('learningStyle', 'visual'),
            'expertise_level': onboarding.get('depth', 'intermediate'),
            'interests': onboarding.get('interests', []),
            'profession': onboarding.get('background', ''),
            'tone_preference': onboarding.get('tone', 'casual'),
            'schedule': onboarding.get('schedule', 'flexible'),
            'topics': onboarding.get('topics', []),
            'want_quizzes': student_profile.want_quizzes,
            'model_preference': student_profile.model_preference
        }
        
        # Normalize values for AI engine
        mapped_profile = self._normalize_profile_values(mapped_profile)
        
        return mapped_profile
    
    def _normalize_profile_values(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize profile values to match AI engine expectations
        """
        # Map depth to expertise level
        depth_mapping = {
            'surface': 'beginner',
            'moderate': 'intermediate',
            'deep': 'advanced',
            'comprehensive': 'expert'
        }
        if profile.get('expertise_level') in depth_mapping:
            profile['expertise_level'] = depth_mapping[profile['expertise_level']]
            
        # Ensure tone preference is valid
        valid_tones = ['formal', 'casual', 'motivational', 'conversational', 'professional', 'friendly']
        if profile.get('tone_preference') not in valid_tones:
            profile['tone_preference'] = 'casual'
            
        # Ensure learning style is valid
        valid_styles = ['visual', 'auditory', 'kinesthetic', 'reading_writing', 'multimodal']
        if profile.get('learning_style') not in valid_styles:
            profile['learning_style'] = 'visual'
            
        return profile
    
    def _clean_text_content(self, text: str) -> str:
        """
        Clean and normalize text content to handle encoding and formatting issues
        """
        if not text:
            return ""
            
        # Normalize unicode characters
        text = unicodedata.normalize('NFKC', text)
        
        # Remove URLs and metadata first
        text = re.sub(r'https?://[^\s]+', '', text)
        text = re.sub(r'www\.[^\s]+', '', text)
        text = re.sub(r'\d{1,2}/\d{1,2}/\d{2,4}, \d{1,2}:\d{2} [AP]M', '', text)  # Remove timestamps
        text = re.sub(r'Page \d+ of \d+', '', text)  # Remove page numbers
        text = re.sub(r'\.pdf\b', '', text)  # Remove .pdf extensions
        text = re.sub(r'\.htm[l]?\b', '', text)  # Remove .htm/.html extensions
        
        # Remove SEC filing metadata
        text = re.sub(r'UNITED STATES\s*SECURITIES AND EXCHANGE COMMISSION', '', text)
        text = re.sub(r'Washington, D\.C\. \d+', '', text)
        text = re.sub(r'FORM \d+-[KQ]', '', text)
        text = re.sub(r'Commission file number:\s*\d+-\d+', '', text)
        
        # Fix broken text from PDF extraction
        # Handle cases where text is split incorrectly
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between camelCase
        text = re.sub(r'(\w)\.(\w)', r'\1. \2', text)  # Add space after periods
        
        # Fix common PDF extraction issues
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Fix broken mathematical symbols and formulas
        # Common corrupted symbols in PDF extraction
        text = text.replace('Ã', 'A')  # Common encoding error
        text = text.replace('â', '-')  # Em dash
        text = text.replace('ï¬', 'fi')  # Ligature
        text = text.replace('ï¬‚', 'fl')  # Ligature
        text = text.replace('â€™', "'")  # Right single quotation
        text = text.replace('â€œ', '"')  # Left double quotation
        text = text.replace('â€', '"')  # Right double quotation
        text = text.replace('â€"', '-')  # En dash
        text = text.replace('â€"', '--')  # Em dash
        
        # Clean up financial data formatting
        text = re.sub(r'\$\s*([0-9,]+)', r'$\1', text)  # Fix dollar amounts
        text = re.sub(r'([0-9]),\s*([0-9])', r'\1,\2', text)  # Fix number formatting
        
        # Fix mathematical notation issues
        text = re.sub(r'\$\s*\$', ' ', text)  # Remove empty math blocks
        text = re.sub(r'\$([^$]+)\$', r'$\1$', text)  # Ensure proper math block formatting
        
        # Remove checkbox symbols and form artifacts
        text = re.sub(r'[☐☑✓✗☒]', '', text)
        text = re.sub(r'Item \d+[A-Z]?', '', text)  # Remove Item references
        
        # Remove excessive whitespace and newlines
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Max 2 consecutive newlines
        text = text.strip()
        
        return text
    
    def _deduplicate_content(self, chunks: List[str]) -> List[str]:
        """
        Remove duplicate content from chunks while preserving order
        """
        if not chunks:
            return []
            
        # Clean all chunks first
        cleaned_chunks = [self._clean_text_content(chunk) for chunk in chunks]
        
        # Remove empty chunks
        cleaned_chunks = [chunk for chunk in cleaned_chunks if chunk.strip()]
        
        # Simple deduplication - remove exact duplicates
        seen = set()
        deduplicated = []
        
        for chunk in cleaned_chunks:
            # Use first 100 characters as a hash to detect near-duplicates
            chunk_hash = chunk[:100].strip().lower()
            if chunk_hash not in seen:
                seen.add(chunk_hash)
                deduplicated.append(chunk)
        
        return deduplicated
    
    def _combine_chunk_content(self, chunks: List[FileChunk]) -> str:
        """
        Intelligently combine chunk content with proper deduplication and cleaning
        """
        if not chunks:
            return ""
            
        # Extract raw content
        raw_contents = [chunk.content for chunk in chunks if chunk.content]
        
        # Deduplicate and clean
        cleaned_contents = self._deduplicate_content(raw_contents)
        
        # Combine with appropriate separators
        if len(cleaned_contents) == 1:
            return cleaned_contents[0]
        
        # For multiple chunks, use double newlines as separators
        combined = '\n\n'.join(cleaned_contents)
        
        # Final cleaning pass
        combined = self._clean_text_content(combined)
        
        # Limit length to prevent token overflow (max ~4000 words ≈ 5000 tokens)
        words = combined.split()
        if len(words) > 4000:
            combined = ' '.join(words[:4000]) + '\n\n[Content truncated to fit processing limits]'
            
        return combined
    
    def _extract_meaningful_title(self, content: str, chunk_index: int) -> str:
        """
        Extract meaningful titles from content using AI or heuristics
        """
        if not content:
            return f"Section {chunk_index + 1}"
            
        # Clean the content first
        cleaned = self._clean_text_content(content)
        
        # Common document section patterns to look for
        title_patterns = [
            (r'^# (.+)$', 1),  # Markdown headers
            (r'^## (.+)$', 1),
            (r'^### (.+)$', 1),
            (r'^(\d+\.\s+[A-Z][^.]+)$', 1),  # "1. Introduction"
            (r'^([A-Z][A-Z\s]+)$', 1),  # ALL CAPS TITLE
            (r'^([A-Z][^.!?]{10,80}[^.!?]*)$', 1),  # Title case without punctuation
            (r'^\s*ITEM\s+\d+[A-Z]?\s*[-–]\s*(.+)$', 1),  # "ITEM 1 - Business"
            (r'^\s*Part\s+[IVX]+\s*[-–]\s*(.+)$', 1),  # "Part I - Financial Information"
            (r'^(.{10,80}):$', 1),  # Ends with colon
        ]
        
        # Try to match common patterns
        lines = cleaned.split('\n')
        for line in lines[:10]:  # Check first 10 lines
            line = line.strip()
            if not line:
                continue
                
            for pattern, group in title_patterns:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    title = match.group(group).strip()
                    # Clean up the title
                    title = re.sub(r'\s+', ' ', title)
                    title = title.title() if title.isupper() else title
                    if 5 <= len(title) <= 100:
                        return title
        
        # Look for key topics in the content
        topic_keywords = {
            'business': 'Business Overview',
            'financial': 'Financial Information',
            'risk': 'Risk Factors',
            'management': 'Management Discussion',
            'properties': 'Properties',
            'legal': 'Legal Proceedings',
            'market': 'Market Analysis',
            'products': 'Products and Services',
            'operations': 'Operations',
            'executive': 'Executive Information',
            'compensation': 'Compensation',
            'governance': 'Corporate Governance',
            'controls': 'Controls and Procedures',
            'statements': 'Financial Statements',
            'company overview': 'Company Overview',
            'general mills': 'General Mills Overview',
        }
        
        # Check content for topic keywords
        content_lower = cleaned[:500].lower()  # First 500 chars
        for keyword, title in topic_keywords.items():
            if keyword in content_lower:
                return title
        
        # Fallback: use first meaningful sentence fragment
        sentences = re.split(r'[.!?]+', cleaned)
        for sentence in sentences[:3]:
            sentence = sentence.strip()
            # Look for good title candidates
            if 15 <= len(sentence) <= 80:
                # Remove common starting words
                sentence = re.sub(r'^(the|this|these|those|we|our|for)\s+', '', sentence, flags=re.IGNORECASE)
                if sentence and sentence[0].isupper():
                    return sentence
                
        return f"Section {chunk_index + 1}"

    async def generate_document_outline(self, file_id: str) -> List[Dict[str, Any]]:
        """
        Generate meaningful outline with proper titles and content organization
        """
        # Get all chunks for the file ordered by index
        chunks = self.db.execute(
            select(FileChunk)
            .filter(FileChunk.file_id == file_id)
            .order_by(FileChunk.chunk_index)
        ).scalars().all()
        
        if not chunks:
            return []
        
        # Create logical sections based on content patterns and size
        outline = []
        current_section_chunks = []
        section_word_limit = 1500  # Reasonable section size
        
        for i, chunk in enumerate(chunks):
            current_section_chunks.append(chunk)
            
            # Calculate current section word count
            total_words = sum(len(c.content.split()) for c in current_section_chunks if c.content)
            
            # Create new section if:
            # 1. Word limit reached, OR
            # 2. Clear section break detected, OR  
            # 3. Last chunk
            should_break = (
                total_words >= section_word_limit or
                self._detect_section_break(chunk, chunks[i+1] if i+1 < len(chunks) else None) or
                i == len(chunks) - 1
            )
            
            if should_break and current_section_chunks:
                # Generate meaningful title from first chunk content
                section_title = self._extract_meaningful_title(
                    current_section_chunks[0].content, 
                    len(outline)
                )
                
                # Create clean content preview
                preview_content = self._combine_chunk_content(current_section_chunks[:2])  # First 2 chunks for preview
                clean_preview = self._create_content_preview(preview_content)
                
                outline.append({
                    'title': section_title,
                    'level': 1,
                    'chunk_start': current_section_chunks[0].chunk_index,
                    'chunk_end': current_section_chunks[-1].chunk_index,
                    'content_preview': clean_preview,
                    'anchor': f'section-{current_section_chunks[0].chunk_index}',
                    'word_count': total_words
                })
                
                current_section_chunks = []
        
        return outline
    
    def _detect_section_break(self, current_chunk: FileChunk, next_chunk: Optional[FileChunk]) -> bool:
        """
        Detect natural section breaks in content
        """
        if not current_chunk or not next_chunk:
            return True
            
        current_content = current_chunk.content or ""
        next_content = next_chunk.content or ""
        
        # Check for obvious section indicators
        section_indicators = [
            r'\b(chapter|section|part)\s+\d+',
            r'^\d+\.\s+[A-Z]',  # Numbered sections like "1. Introduction"
            r'^[A-Z][A-Z\s]{10,50}$',  # ALL CAPS titles
        ]
        
        for pattern in section_indicators:
            if re.search(pattern, next_content[:200], re.MULTILINE | re.IGNORECASE):
                return True
                
        return False
    
    def _create_content_preview(self, content: str) -> str:
        """
        Create a clean, meaningful preview of content
        """
        if not content:
            return "No content available"
            
        # Clean content
        cleaned = self._clean_text_content(content)
        
        # Remove URLs and metadata
        cleaned = re.sub(r'https?://[^\s]+', '', cleaned)
        cleaned = re.sub(r'www\.[^\s]+', '', cleaned)
        cleaned = re.sub(r'\b\d{1,2}/\d{1,2}/\d{2,4}\b', '', cleaned)  # Remove dates
        
        # Get first meaningful sentence or paragraph
        sentences = re.split(r'[.!?]+', cleaned)
        preview_parts = []
        char_count = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 10:
                continue
                
            if char_count + len(sentence) > 150:  # Limit preview length
                break
                
            preview_parts.append(sentence)
            char_count += len(sentence)
            
            if char_count > 80:  # Minimum meaningful preview
                break
        
        preview = '. '.join(preview_parts)
        if preview:
            return preview + "..." if not preview.endswith('.') else preview
        else:
            # Fallback to first 150 chars
            return (cleaned[:150] + "...") if len(cleaned) > 150 else cleaned
    
    def _create_basic_outline(self, chunks: List[FileChunk]) -> List[Dict[str, Any]]:
        """
        Create a basic outline when no section metadata is available
        """
        # Group chunks into logical sections (e.g., every 5 chunks)
        section_size = 5
        outline = []
        
        for i in range(0, len(chunks), section_size):
            section_chunks = chunks[i:i+section_size]
            outline.append({
                'title': f'Part {len(outline) + 1}',
                'level': 1,
                'chunk_start': section_chunks[0].chunk_index,
                'chunk_end': section_chunks[-1].chunk_index,
                'content_preview': section_chunks[0].content[:200] + '...',
                'anchor': f'section-{section_chunks[0].chunk_index}'
            })
            
        return outline
    
    async def personalize_section(
        self,
        file_id: str,
        section: Dict[str, Any],
        student_profile: Dict[str, Any],
        course_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Personalize a single section of content
        """
        # Get chunks for this section
        chunks = self.db.execute(
            select(FileChunk)
            .filter(
                FileChunk.file_id == file_id,
                FileChunk.chunk_index >= section['chunk_start'],
                FileChunk.chunk_index <= section['chunk_end']
            )
            .order_by(FileChunk.chunk_index)
        ).scalars().all()
        
        if not chunks:
            return {
                'section_id': section['anchor'],
                'content': 'Section content not found.',
                'personalization_score': 0.0
            }
        
        # Combine chunk content with proper cleaning and deduplication
        section_content = self._combine_chunk_content(chunks)
        
        # Determine if this is a simple or complex section
        if self._is_simple_section(section_content, section):
            return await self._personalize_simple_section(
                section_content, section, student_profile
            )
        else:
            return await self._personalize_complex_section(
                section_content, section, student_profile, course_context
            )
    
    def _is_simple_section(self, content: str, section: Dict[str, Any]) -> bool:
        """
        Determine if a section is simple enough for fast path processing
        """
        # Simple heuristics
        word_count = len(content.split())
        
        # Definitions, introductions, and short sections are simple
        if word_count < 300:
            return True
            
        # Check for keywords indicating simple content
        simple_keywords = ['introduction', 'overview', 'summary', 'definition', 'conclusion']
        title_lower = section.get('title', '').lower()
        
        return any(keyword in title_lower for keyword in simple_keywords)
    
    async def _personalize_simple_section(
        self,
        content: str,
        section: Dict[str, Any],
        student_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Use fast path processor for simple sections
        """
        # Validate content first
        if not content or len(content.strip()) < 10:
            return {
                'section_id': section['anchor'],
                'content': 'Insufficient content for personalization.',
                'personalization_score': 0.0,
                'method': 'fast_path'
            }
        
        # Create an enhanced question that guides better personalization
        interests = student_profile.get('interests', [])
        expertise = student_profile['expertise_level']
        tone = student_profile.get('tone_preference', 'casual')
        
        # Build personalization instructions
        # Load prompt template
        with open('/Users/explicit/Documents/GitHub/LINK-X1/docker-image/src/prompts/natural_personalization.yaml', 'r') as f:
            import yaml
            prompts = yaml.safe_load(f)
        
        # Format the personalization template
        prompt = prompts['personalization_template'].format(
            content=content,
            section_title=section.get('title', 'Content'),
            expertise_level=expertise,
            tone_preference=tone,
            interests=', '.join(interests[:3]) if interests else 'general topics',
            learning_style=student_profile.get('learning_style', 'visual')
        )
        
        # Use system prompt to set context
        system_prompt = prompts['system_prompt'].format(
            student_name=student_profile.get('name', 'Student'),
            learning_style=student_profile.get('learning_style', 'visual'),
            expertise_level=expertise,
            interests=', '.join(interests) if interests else 'various topics',
            profession=student_profile.get('profession', 'student'),
            tone_preference=tone
        )
        
        # Prepare question for fast path processor  
        question = f"Using this system context: {system_prompt}\n\n{prompt}"
        
        # Use fast path processor
        result = fast_path_processor.process_simple_query(
            question=question,
            context_chunks=[content],
            student_profile=student_profile,
            skip_critic_threshold=0.85  # Slightly lower threshold for better quality
        )
        
        return {
            'section_id': section['anchor'],
            'content': result.answer,
            'personalization_score': result.confidence,
            'processing_time': result.processing_time,
            'method': 'fast_path'
        }
    
    async def _personalize_complex_section(
        self,
        content: str,
        section: Dict[str, Any],
        student_profile: Dict[str, Any],
        course_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Use enhanced personalization engine for complex sections
        """
        # Validate content first
        if not content or len(content.strip()) < 20:
            return {
                'section_id': section['anchor'],
                'content': 'Insufficient content for personalization.',
                'personalization_score': 0.0,
                'method': 'enhanced_personalization'
            }
        
        # Enhanced personalization context with quality controls
        context = PersonalizationContext(
            subject_domain=course_context.get('subject', 'general') if course_context else 'general',
            difficulty_level=student_profile['expertise_level'],
            time_context='deep_study',
            learning_goal='understanding',
            prior_knowledge=student_profile.get('topics', []),
            current_struggles=[],
            preferred_examples=student_profile.get('interests', [])
        )
        
        # Add quality control instructions to the student profile
        enhanced_profile = student_profile.copy()
        enhanced_profile['personalization_instructions'] = [
            "Maintain content completeness - finish all examples and explanations",
            "Avoid content duplication or repetition",
            "Preserve mathematical formulas and technical accuracy",
            "Connect concepts naturally to student interests without forced transitions",
            "Ensure all personalized examples are complete and relevant"
        ]
        
        try:
            # Apply enhanced personalization
            result = enhanced_personalization.personalize_content(
                content=content,
                student_profile=enhanced_profile,
                context=context
            )
            
            # Post-process the result to ensure quality
            if hasattr(result, 'adapted_content'):
                # Clean the output content
                cleaned_content = self._clean_text_content(result.adapted_content)
                
                return {
                    'section_id': section['anchor'],
                    'content': cleaned_content,
                    'personalization_score': getattr(result, 'personalization_score', 0.8),
                    'adaptations_made': getattr(result, 'adaptations_made', []),
                    'confidence': getattr(result, 'confidence', 0.8),
                    'method': 'enhanced_personalization'
                }
            else:
                # Fallback if result structure is unexpected
                return {
                    'section_id': section['anchor'],
                    'content': str(result) if result else content,
                    'personalization_score': 0.5,
                    'method': 'enhanced_personalization_fallback'
                }
                
        except Exception as e:
            logger.error(f"Enhanced personalization failed for section {section['anchor']}: {e}")
            # Fallback to original content with basic cleaning
            return {
                'section_id': section['anchor'],
                'content': self._clean_text_content(content),
                'personalization_score': 0.3,
                'error': f"Personalization failed: {str(e)}",
                'method': 'fallback'
            }
    
    async def stream_personalized_content(
        self,
        file_id: str,
        student_id: str,
        stream_delay: float = 0.5  # Delay between sections for progressive streaming
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream personalized content section by section
        """
        # First get the User by firebase_uid
        user = self.db.execute(
            select(User).filter(User.firebase_uid == student_id)
        ).scalar_one_or_none()
        
        if not user:
            yield {
                'type': 'error',
                'data': 'User not found'
            }
            return
        
        # Get student profile using the actual user ID
        student = self.db.execute(
            select(StudentProfile).filter(StudentProfile.user_id == user.id)
        ).scalar_one_or_none()
        
        if not student:
            yield {
                'type': 'error',
                'data': 'Student profile not found'
            }
            return
            
        # Map profile
        student_profile = self.map_student_profile(student)
        
        # Get file and course context
        file_obj = self.db.execute(
            select(File).filter(File.id == file_id)
        ).scalar_one_or_none()
        
        if not file_obj:
            yield {
                'type': 'error',
                'data': 'File not found'
            }
            return
            
        # Get course context
        course_context = await self._get_course_context(file_obj)
        
        # Generate and send outline
        outline = await self.generate_document_outline(file_id)
        yield {
            'type': 'outline',
            'data': outline
        }
        
        # Process sections with progressive streaming
        total_sections = len(outline)
        for i, section in enumerate(outline):
            try:
                # Send progress update
                yield {
                    'type': 'progress',
                    'current': i,
                    'total': total_sections,
                    'message': f'Personalizing section {i+1} of {total_sections}...'
                }
                
                # Add delay for progressive streaming effect
                if stream_delay > 0 and i > 0:
                    await asyncio.sleep(stream_delay)
                
                personalized = await self.personalize_section(
                    file_id=file_id,
                    section=section,
                    student_profile=student_profile,
                    course_context=course_context
                )
                
                yield {
                    'type': 'content',
                    'section_id': section['anchor'],
                    'data': personalized
                }
                
            except Exception as e:
                logger.error(f"Error personalizing section {section['anchor']}: {e}")
                yield {
                    'type': 'error',
                    'section_id': section['anchor'],
                    'data': f'Error personalizing section: {str(e)}'
                }
    
    async def _get_course_context(self, file_obj: File) -> Dict[str, Any]:
        """
        Get course context for better personalization
        """
        # Get module and course
        module = self.db.execute(
            select(Module).filter(Module.id == file_obj.module_id)
        ).scalar_one_or_none()
        
        if not module:
            return {}
            
        course = self.db.execute(
            select(Course).filter(Course.id == module.course_id)
        ).scalar_one_or_none()
        
        if not course:
            return {}
            
        return {
            'course_title': course.title,
            'course_code': course.code,
            'subject': course.title,  # Extract subject from title
            'module_title': module.title
        }
    
    def get_related_content(
        self,
        file_id: str,
        section_content: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find related content using vector search
        """
        try:
            # Search for similar content
            related = self.vector_search.search_similar_content(
                query=section_content[:500],  # Use first 500 chars
                db_session=self.db,
                file_id=file_id,  # Exclude current file
                limit=limit
            )
            
            return related
            
        except Exception as e:
            logger.warning(f"Error finding related content: {e}")
            return []


# Singleton instance
_integration_service = None

def get_integration_service(db_session: Session) -> PersonalizationIntegrationService:
    """Get or create integration service instance"""
    global _integration_service
    if _integration_service is None:
        _integration_service = PersonalizationIntegrationService(db_session)
    return _integration_service
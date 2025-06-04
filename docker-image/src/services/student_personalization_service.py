"""
Student-Focused Personalization Service
Optimized for educational content delivery with student-friendly language
"""

import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
import asyncio
import json
import yaml
from pathlib import Path
from datetime import datetime

from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from core.settings import get_settings
from repositories.file_repository import FileRepository
from repositories.user_repository import UserRepository
from services.ai.base import BaseAIService
from services.document_outline_generator import DocumentOutlineGenerator
from services.s3_storage import S3Storage
from core.exceptions import ValidationError, NotFoundError

logger = logging.getLogger(__name__)


class StudentPersonalizationService(BaseAIService):
    """Service for creating student-friendly personalized content"""
    
    def __init__(self, db: Session):
        super().__init__()
        self.db = db
        self.file_repo = FileRepository(db)
        self.user_repo = UserRepository(db)
        self.outline_generator = DocumentOutlineGenerator(db)
        self.s3_service = S3Storage()
        self.settings = get_settings()
        
        # Load student-friendly prompts
        self._load_prompts()
        
    def _load_prompts(self):
        """Load student-focused prompts from YAML"""
        try:
            prompts_path = Path(__file__).parent.parent / 'prompts' / 'student_personalization.yaml'
            with open(prompts_path, 'r') as f:
                self.prompts = yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load student prompts: {e}")
            self.prompts = self._get_default_prompts()
    
    def _get_default_prompts(self) -> Dict[str, Any]:
        """Fallback prompts if YAML fails to load"""
        return {
            'student_personalization': {
                'system': """You are a friendly tutor helping students understand their course material.
                Make complex concepts simple and engaging. Use clear language and relatable examples.""",
                'section_generation': """Explain this section in a student-friendly way: {section_title}
                Content: {section_content}
                Make it clear, engaging, and easy to understand!"""
            }
        }
    
    async def personalize_for_student(
        self,
        file_id: str,
        user_id: str,
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        Generate student-friendly personalized content
        
        Args:
            file_id: ID of the file to personalize
            user_id: ID of the student
            stream: Whether to stream the response
            
        Yields:
            JSON-encoded events for the stream
        """
        try:
            # Get file and user information
            file_obj = self.file_repo.get_by_id(file_id)
            if not file_obj:
                raise NotFoundError(f"File {file_id} not found")
                
            user = self.user_repo.get_by_id(user_id)
            if not user:
                raise NotFoundError(f"User {user_id} not found")
            
            # Get student profile for personalization
            student_profile = self._get_student_profile(user)
            
            # IMPORTANT: Use file chunks if available (preferred method)
            chunks = self._get_file_chunks(file_id)
            
            if chunks:
                # Use existing chunks - this is the CORRECT approach
                outline = self._create_outline_from_chunks(chunks)
            else:
                # Fallback: Get or generate outline from file content
                outline = await self._get_or_generate_outline(file_obj)
            
            # Send initial event
            yield self._create_event('start', {
                'fileId': file_id,
                'fileName': file_obj.file_name,
                'totalSections': len(outline.get('sections', [])),
                'courseName': file_obj.course.name if file_obj.course else 'Unknown Course'
            })
            
            # Process each section
            sections = outline.get('sections', [])
            for index, section in enumerate(sections):
                try:
                    # Generate student-friendly content for this section
                    content = await self._generate_section_content(
                        section=section,
                        student_profile=student_profile,
                        course_context=file_obj.course.name if file_obj.course else None,
                        content_type=self._detect_content_type(file_obj.file_name)
                    )
                    
                    # Send section event
                    yield self._create_event('section', {
                        'sectionIndex': index,
                        'sectionTitle': section.get('title', f'Section {index + 1}'),
                        'content': content
                    })
                    
                    # Small delay between sections
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error processing section {index}: {e}")
                    yield self._create_event('section_error', {
                        'sectionIndex': index,
                        'error': 'Failed to process this section'
                    })
            
            # Send completion event
            yield self._create_event('complete', {
                'fileId': file_id,
                'totalSections': len(sections)
            })
            
        except Exception as e:
            logger.error(f"Personalization error: {e}")
            yield self._create_event('error', {
                'message': 'Something went wrong. Please try again!',
                'details': str(e) if self.settings.debug else None
            })
    
    async def regenerate_section(
        self,
        file_id: str,
        section_index: int,
        section_title: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Regenerate a specific section with a different approach
        
        Args:
            file_id: ID of the file
            section_index: Index of the section to regenerate
            section_title: Title of the section
            user_id: ID of the student
            
        Returns:
            New content for the section
        """
        try:
            # Get file and user information
            file_obj = self.file_repo.get_by_id(file_id)
            if not file_obj:
                raise NotFoundError(f"File {file_id} not found")
                
            user = self.user_repo.get_by_id(user_id)
            if not user:
                raise NotFoundError(f"User {user_id} not found")
            
            # Get student profile
            student_profile = self._get_student_profile(user)
            
            # Get outline to find section content
            outline = await self._get_or_generate_outline(file_obj)
            sections = outline.get('sections', [])
            
            if section_index >= len(sections):
                raise ValidationError("Invalid section index")
            
            section = sections[section_index]
            
            # Generate new content with different approach
            prompt = self.prompts['student_personalization']['regeneration'].format(
                section_title=section_title,
                previous_style='standard explanation'  # Track previous styles in real implementation
            )
            
            content = await self._generate_with_ai(
                prompt=prompt,
                system_prompt=self.prompts['student_personalization']['system'],
                temperature=0.8  # Higher temperature for more variety
            )
            
            return {
                'content': content,
                'sectionIndex': section_index,
                'sectionTitle': section_title
            }
            
        except Exception as e:
            logger.error(f"Regeneration error: {e}")
            raise
    
    def _get_student_profile(self, user) -> Dict[str, Any]:
        """Extract relevant student profile information"""
        profile = {
            'learning_style': 'visual',  # Default
            'preferences': {}
        }
        
        if hasattr(user, 'student_profile') and user.student_profile:
            student = user.student_profile
            
            # Extract learning style from onboarding answers
            if hasattr(student, 'onboard_answers') and student.onboard_answers:
                answers = student.onboard_answers
                if isinstance(answers, dict):
                    profile['learning_style'] = answers.get('learning_style', 'visual')
                    profile['preferences'] = {
                        'detail_level': answers.get('detail_preference', 'balanced'),
                        'pace': answers.get('learning_pace', 'moderate'),
                        'examples': answers.get('example_preference', 'many')
                    }
        
        return profile
    
    def _get_file_chunks(self, file_id: str) -> List[Any]:
        """Get file chunks from database - CORRECT data source"""
        try:
            from db.schema import FileChunk
            chunks = self.db.query(FileChunk).filter(
                FileChunk.file_id == file_id
            ).order_by(FileChunk.chunk_index).all()
            
            logger.info(f"Found {len(chunks)} chunks for file {file_id}")
            return chunks
        except Exception as e:
            logger.error(f"Error fetching file chunks: {e}")
            return []
    
    def _create_outline_from_chunks(self, chunks: List[Any]) -> Dict[str, Any]:
        """Create outline from file chunks"""
        sections = []
        
        # Group chunks into logical sections (e.g., every 3-5 chunks)
        chunks_per_section = 3
        for i in range(0, len(chunks), chunks_per_section):
            section_chunks = chunks[i:i + chunks_per_section]
            
            # Use first chunk's content preview as section title
            title = self._extract_section_title(section_chunks[0].content)
            
            # Combine chunk contents
            content = "\n\n".join([chunk.content for chunk in section_chunks])
            
            sections.append({
                'title': title,
                'content': content[:1000],  # Limit content for outline
                'chunk_ids': [chunk.id for chunk in section_chunks]
            })
        
        return {
            'sections': sections,
            'total_chunks': len(chunks)
        }
    
    def _extract_section_title(self, content: str) -> str:
        """Extract a meaningful title from content"""
        lines = content.strip().split('\n')
        for line in lines:
            line = line.strip()
            if len(line) > 10 and len(line) < 100:
                return line
        return "Section"
    
    async def _get_or_generate_outline(self, file_obj) -> Dict[str, Any]:
        """Get existing outline or generate new one"""
        # Check if outline exists
        if hasattr(file_obj, 'outline') and file_obj.outline:
            return file_obj.outline
        
        # Try to get content from S3 or file_data
        content = await self._get_file_content(file_obj)
        
        if not content:
            logger.error(f"No content available for file {file_obj.id}")
            return {'sections': []}
        
        # Generate outline
        outline = await self.outline_generator.generate_outline(
            content=content,
            file_type=file_obj.file_type,
            file_name=file_obj.file_name
        )
        
        # Save outline to database
        self.file_repo.update(file_obj.id, outline=outline)
        
        return outline
    
    async def _get_file_content(self, file_obj) -> str:
        """Get file content from correct source"""
        try:
            # Method 1: Check if content is in file_data (legacy)
            if hasattr(file_obj, 'file_data') and file_obj.file_data:
                logger.info(f"Using file_data for file {file_obj.id}")
                return file_obj.file_data.decode('utf-8') if isinstance(file_obj.file_data, bytes) else str(file_obj.file_data)
            
            # Method 2: Download from S3 using correct attributes
            if file_obj.storage_type == 's3' and file_obj.s3_key:
                logger.info(f"Downloading from S3: bucket={file_obj.s3_bucket}, key={file_obj.s3_key}")
                
                # Use the correct S3 download method
                file_bytes = self.s3_service.download_file(
                    file_key=file_obj.s3_key,
                    bucket_name=file_obj.s3_bucket
                )
                
                if file_bytes:
                    return self._extract_text_content(file_bytes, file_obj.file_type)
            
            # Method 3: Check chunks as last resort
            chunks = self._get_file_chunks(file_obj.id)
            if chunks:
                logger.info(f"Using chunks for file {file_obj.id}")
                return "\n\n".join([chunk.content for chunk in chunks])
            
            logger.warning(f"No content source available for file {file_obj.id}")
            return ""
            
        except Exception as e:
            logger.error(f"Error getting file content: {e}")
            return ""
    
    def _extract_text_content(self, raw_content: bytes, file_type: str) -> str:
        """Extract text from various file types"""
        # This is a simplified version - in production, use proper libraries
        # like PyPDF2, python-docx, etc.
        try:
            return raw_content.decode('utf-8')
        except:
            return "Content extraction failed"
    
    async def _generate_section_content(
        self,
        section: Dict[str, Any],
        student_profile: Dict[str, Any],
        course_context: Optional[str],
        content_type: str
    ) -> str:
        """Generate student-friendly content for a section"""
        
        # Get learning style specific additions
        learning_style = student_profile.get('learning_style', 'visual')
        style_prompt = self.prompts.get('learning_styles', {}).get(
            learning_style, 
            ''
        )
        
        # Get content type specific instructions
        content_type_prompt = self.prompts.get('content_types', {}).get(
            content_type,
            ''
        )
        
        # Build the prompt
        prompt = self.prompts['student_personalization']['section_generation'].format(
            section_title=section.get('title', 'Section'),
            section_content=section.get('content', ''),
            learning_style=learning_style,
            course_name=course_context or 'this course'
        )
        
        # Add style and content type instructions
        if style_prompt:
            prompt += f"\n\n{style_prompt}"
        if content_type_prompt:
            prompt += f"\n\n{content_type_prompt}"
        
        # Generate content
        content = await self._generate_with_ai(
            prompt=prompt,
            system_prompt=self.prompts['student_personalization']['system'],
            temperature=0.7,
            max_tokens=1500  # Reasonable length for students
        )
        
        return content
    
    async def _generate_with_ai(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1500
    ) -> str:
        """Generate content using AI"""
        try:
            response = await self.client.chat.completions.create(
                model=self.settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            raise
    
    def _detect_content_type(self, filename: str) -> str:
        """Detect content type from filename"""
        filename_lower = filename.lower()
        
        if filename_lower.endswith('.pdf'):
            if 'slide' in filename_lower or 'presentation' in filename_lower:
                return 'presentation_slides'
            elif 'chapter' in filename_lower or 'textbook' in filename_lower:
                return 'textbook_chapter'
            elif 'lecture' in filename_lower or 'notes' in filename_lower:
                return 'lecture_notes'
            else:
                return 'pdf_document'
        elif filename_lower.endswith(('.ppt', '.pptx')):
            return 'presentation_slides'
        elif filename_lower.endswith(('.doc', '.docx')):
            return 'lecture_notes'
        else:
            return 'pdf_document'  # Default
    
    def _create_event(self, event_type: str, data: Dict[str, Any]) -> str:
        """Create a formatted SSE event"""
        event_data = {
            'type': event_type,
            'timestamp': datetime.utcnow().isoformat(),
            **data
        }
        return f"data: {json.dumps(event_data)}\n\n"
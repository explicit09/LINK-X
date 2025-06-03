"""
Document Outline Generator
Generates accurate document outlines using AI and chunk analysis
"""

import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import select

from db.schema import FileChunk
from core.model_manager import model_manager, TaskType

logger = logging.getLogger(__name__)


@dataclass
class DocumentSection:
    """Represents a section in the document"""
    title: str
    level: int  # 1 = h1, 2 = h2, etc.
    chunk_start: int
    chunk_end: int
    content_preview: str
    anchor: str
    keywords: List[str]
    section_type: str  # intro, definition, example, practice, summary


class DocumentOutlineGenerator:
    """
    Generates accurate outlines from document chunks
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        
    async def generate_outline(self, file_id: str) -> List[Dict[str, Any]]:
        """
        Generate a hierarchical outline from file chunks
        """
        # Get all chunks ordered
        chunks = self.db.execute(
            select(FileChunk)
            .filter(FileChunk.file_id == file_id)
            .order_by(FileChunk.chunk_index)
        ).scalars().all()
        
        if not chunks:
            return []
            
        # Analyze chunks to identify sections
        sections = await self._identify_sections(chunks)
        
        # Build hierarchical outline
        outline = self._build_hierarchical_outline(sections)
        
        return outline
    
    async def _identify_sections(self, chunks: List[FileChunk]) -> List[DocumentSection]:
        """
        Use AI to identify natural section boundaries
        """
        sections = []
        current_section = None
        
        for i, chunk in enumerate(chunks):
            # Check if this chunk starts a new section
            is_section_start = await self._is_section_start(chunk, chunks[i-1] if i > 0 else None)
            
            if is_section_start:
                # Save current section
                if current_section:
                    sections.append(current_section)
                
                # Extract section info
                section_info = await self._extract_section_info(chunk)
                
                current_section = DocumentSection(
                    title=section_info['title'],
                    level=section_info['level'],
                    chunk_start=chunk.chunk_index,
                    chunk_end=chunk.chunk_index,
                    content_preview=chunk.content[:200] + '...',
                    anchor=f'section-{chunk.chunk_index}',
                    keywords=section_info['keywords'],
                    section_type=section_info['type']
                )
            elif current_section:
                # Extend current section
                current_section.chunk_end = chunk.chunk_index
        
        # Add last section
        if current_section:
            sections.append(current_section)
            
        # If no sections found, use fallback
        if not sections:
            sections = self._create_fallback_sections(chunks)
            
        return sections
    
    async def _is_section_start(self, chunk: FileChunk, prev_chunk: Optional[FileChunk]) -> bool:
        """
        Determine if a chunk starts a new section
        """
        # First chunk is always a section start
        if chunk.chunk_index == 0:
            return True
            
        # Check chunk metadata
        metadata = chunk.chunk_metadata or {}
        if metadata.get('is_section_start', False):
            return True
            
        # Look for headers in content
        content = chunk.content
        header_patterns = [
            r'^#{1,6}\s+(.+)$',  # Markdown headers
            r'^(.+)\n[=-]{3,}$',  # Underline headers
            r'^[A-Z][^.!?]*:$',   # Title case with colon
            r'^\d+\.?\s+[A-Z]',   # Numbered sections
        ]
        
        for pattern in header_patterns:
            if re.search(pattern, content, re.MULTILINE):
                return True
                
        # Look for significant topic changes using AI
        if prev_chunk:
            return await self._detect_topic_change(prev_chunk.content, chunk.content)
            
        return False
    
    async def _detect_topic_change(self, prev_content: str, current_content: str) -> bool:
        """
        Use AI to detect significant topic changes
        """
        try:
            prompt = f"""
Analyze if there's a significant topic change between these two text segments.

Previous segment (last 200 chars):
{prev_content[-200:]}

Current segment (first 200 chars):
{current_content[:200]}

Is this a new section or topic? Reply with just YES or NO.
"""
            
            model_selection = model_manager.select_model(
                task_type=TaskType.CLASSIFICATION,
                query=prompt,
                constraints={"max_latency_seconds": 1}
            )
            
            messages = [{"role": "user", "content": prompt}]
            response = model_manager.call_model(model_selection, messages, max_tokens=10)
            
            return "YES" in response["content"].upper()
            
        except Exception as e:
            logger.warning(f"Topic change detection failed: {e}")
            return False
    
    async def _extract_section_info(self, chunk: FileChunk) -> Dict[str, Any]:
        """
        Extract section information from chunk
        """
        content = chunk.content
        
        # Try to extract title from content
        title = self._extract_title(content)
        if not title:
            title = f"Section {chunk.chunk_index + 1}"
            
        # Determine section level
        level = self._determine_section_level(content)
        
        # Extract keywords
        keywords = self._extract_keywords(content)
        
        # Determine section type
        section_type = self._determine_section_type(content)
        
        return {
            'title': title,
            'level': level,
            'keywords': keywords,
            'type': section_type
        }
    
    def _extract_title(self, content: str) -> Optional[str]:
        """
        Extract title from content
        """
        # Try markdown headers
        match = re.search(r'^#{1,6}\s+(.+)$', content, re.MULTILINE)
        if match:
            return match.group(1).strip()
            
        # Try underline headers
        lines = content.split('\n')
        for i, line in enumerate(lines[:-1]):
            next_line = lines[i+1]
            if re.match(r'^[=-]{3,}$', next_line):
                return line.strip()
                
        # Try first line if it looks like a title
        first_line = lines[0].strip() if lines else ""
        if first_line and len(first_line) < 100 and first_line[0].isupper():
            return first_line
            
        return None
    
    def _determine_section_level(self, content: str) -> int:
        """
        Determine the hierarchical level of the section
        """
        # Check markdown header level
        match = re.search(r'^(#{1,6})\s+', content, re.MULTILINE)
        if match:
            return len(match.group(1))
            
        # Check for underline style
        if re.search(r'\n={3,}$', content, re.MULTILINE):
            return 1
        elif re.search(r'\n-{3,}$', content, re.MULTILINE):
            return 2
            
        # Default to level 2
        return 2
    
    def _extract_keywords(self, content: str) -> List[str]:
        """
        Extract key terms from content
        """
        # Simple keyword extraction
        # In production, use NLP libraries like spaCy or NLTK
        
        # Remove common words
        common_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        }
        
        # Extract words
        words = re.findall(r'\b[a-zA-Z]{4,}\b', content.lower())
        
        # Count frequencies
        word_freq = {}
        for word in words:
            if word not in common_words:
                word_freq[word] = word_freq.get(word, 0) + 1
                
        # Get top keywords
        keywords = sorted(word_freq.keys(), key=lambda x: word_freq[x], reverse=True)[:5]
        
        return keywords
    
    def _determine_section_type(self, content: str) -> str:
        """
        Determine the type of section based on content
        """
        content_lower = content.lower()
        
        # Check for specific keywords
        if any(word in content_lower for word in ['introduction', 'overview', 'welcome']):
            return 'intro'
        elif any(word in content_lower for word in ['definition', 'what is', 'meaning']):
            return 'definition'
        elif any(word in content_lower for word in ['example', 'for instance', 'such as']):
            return 'example'
        elif any(word in content_lower for word in ['exercise', 'practice', 'try it']):
            return 'practice'
        elif any(word in content_lower for word in ['summary', 'conclusion', 'recap']):
            return 'summary'
        else:
            return 'content'
    
    def _build_hierarchical_outline(self, sections: List[DocumentSection]) -> List[Dict[str, Any]]:
        """
        Build a hierarchical outline from flat sections
        """
        outline = []
        
        for section in sections:
            outline_item = {
                'title': section.title,
                'level': section.level,
                'chunk_start': section.chunk_start,
                'chunk_end': section.chunk_end,
                'content_preview': section.content_preview,
                'anchor': section.anchor,
                'keywords': section.keywords,
                'type': section.section_type,
                'subsections': []
            }
            
            outline.append(outline_item)
            
        # Build hierarchy (simplified - just return flat for now)
        # In production, build proper tree structure based on levels
        return outline
    
    def _create_fallback_sections(self, chunks: List[FileChunk]) -> List[DocumentSection]:
        """
        Create sections when automatic detection fails
        """
        sections = []
        chunks_per_section = max(3, len(chunks) // 5)  # Aim for ~5 sections
        
        for i in range(0, len(chunks), chunks_per_section):
            section_chunks = chunks[i:i+chunks_per_section]
            
            # Extract some text for title
            first_chunk_text = section_chunks[0].content[:100]
            title_match = re.search(r'[A-Z][^.!?]{10,50}', first_chunk_text)
            title = title_match.group(0) if title_match else f'Part {len(sections) + 1}'
            
            section = DocumentSection(
                title=title,
                level=1,
                chunk_start=section_chunks[0].chunk_index,
                chunk_end=section_chunks[-1].chunk_index,
                content_preview=section_chunks[0].content[:200] + '...',
                anchor=f'section-{section_chunks[0].chunk_index}',
                keywords=self._extract_keywords(section_chunks[0].content),
                section_type='content'
            )
            
            sections.append(section)
            
        return sections


class SmartChunkingService:
    """
    Service for creating smart chunks that respect document structure
    """
    
    def __init__(self):
        self.max_chunk_size = 1000  # tokens
        self.overlap_size = 200  # tokens
        
    def create_smart_chunks(
        self,
        content: str,
        preserve_sections: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Create chunks that respect document structure
        """
        if preserve_sections:
            # Split by sections first
            sections = self._split_by_sections(content)
            chunks = []
            
            for section in sections:
                section_chunks = self._chunk_section(section)
                chunks.extend(section_chunks)
                
            return chunks
        else:
            # Simple chunking
            return self._simple_chunk(content)
    
    def _split_by_sections(self, content: str) -> List[Dict[str, Any]]:
        """
        Split content by natural section boundaries
        """
        sections = []
        
        # Split by headers
        header_pattern = r'^(#{1,6}\s+.+|.+\n[=-]{3,})$'
        parts = re.split(f'({header_pattern})', content, flags=re.MULTILINE)
        
        current_section = {'title': '', 'content': '', 'level': 1}
        
        for part in parts:
            if re.match(header_pattern, part, re.MULTILINE):
                # This is a header
                if current_section['content']:
                    sections.append(current_section)
                    
                current_section = {
                    'title': part.strip().lstrip('#').strip(),
                    'content': part + '\n',
                    'level': self._get_header_level(part)
                }
            else:
                # This is content
                current_section['content'] += part
                
        # Add last section
        if current_section['content']:
            sections.append(current_section)
            
        return sections
    
    def _get_header_level(self, header: str) -> int:
        """
        Get the level of a header
        """
        if header.startswith('#'):
            return len(re.match(r'^#+', header).group(0))
        elif '\n=' in header:
            return 1
        elif '\n-' in header:
            return 2
        else:
            return 3
    
    def _chunk_section(self, section: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Chunk a section while preserving its metadata
        """
        chunks = []
        content = section['content']
        
        # Estimate tokens (rough approximation)
        words = content.split()
        words_per_chunk = self.max_chunk_size // 1.3  # Rough token estimation
        
        for i in range(0, len(words), words_per_chunk - self.overlap_size // 1.3):
            chunk_words = words[i:i + words_per_chunk]
            chunk_content = ' '.join(chunk_words)
            
            chunk = {
                'content': chunk_content,
                'metadata': {
                    'section_title': section['title'],
                    'section_level': section['level'],
                    'is_section_start': i == 0,
                    'chunk_type': self._determine_chunk_type(chunk_content)
                }
            }
            
            chunks.append(chunk)
            
        return chunks
    
    def _determine_chunk_type(self, content: str) -> str:
        """
        Determine the type of content in a chunk
        """
        content_lower = content.lower()
        
        if any(word in content_lower for word in ['example', 'for instance']):
            return 'example'
        elif any(word in content_lower for word in ['definition', 'is defined as']):
            return 'definition'
        elif any(word in content_lower for word in ['step', 'procedure', 'how to']):
            return 'instruction'
        else:
            return 'explanation'
    
    def _simple_chunk(self, content: str) -> List[Dict[str, Any]]:
        """
        Simple chunking without section preservation
        """
        chunks = []
        words = content.split()
        words_per_chunk = self.max_chunk_size // 1.3
        
        for i in range(0, len(words), words_per_chunk - self.overlap_size // 1.3):
            chunk_words = words[i:i + words_per_chunk]
            chunk_content = ' '.join(chunk_words)
            
            chunks.append({
                'content': chunk_content,
                'metadata': {
                    'chunk_type': 'content'
                }
            })
            
        return chunks
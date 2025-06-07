"""
Semantic chunking utilities that build on existing infrastructure
"""
import re
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import logging

from utils.textUtils import clean_extracted_text
from core.chunking_config import ChunkingConfig

logger = logging.getLogger(__name__)

@dataclass
class SemanticChunk:
    """Represents a semantically coherent chunk with metadata"""
    content: str
    chunk_type: str  # 'introduction', 'definition', 'example', 'explanation', 'conclusion'
    hierarchy_level: int  # 0=chapter, 1=section, 2=subsection, 3=paragraph
    title: Optional[str] = None
    concepts: List[str] = None
    references: List[str] = None
    
    def to_metadata(self) -> Dict:
        """Convert to JSON for chunk_metadata field"""
        return {
            'chunk_type': self.chunk_type,
            'hierarchy_level': self.hierarchy_level,
            'title': self.title,
            'concepts': self.concepts or [],
            'references': self.references or []
        }


class SemanticChunker:
    """
    Enhanced chunker that preserves semantic meaning and document structure.
    Builds on existing chunking but adds intelligence.
    """
    
    # Patterns for detecting different content types
    PATTERNS = {
        'definition': [
            r'(?:is|are)\s+defined\s+as',
            r'definition\s*:',
            r'(?:means|refers\s+to)',
            r'\bdefine[sd]?\b.*?\bas\b'
        ],
        'example': [
            r'for\s+(?:example|instance)',
            r'(?:such|examples?)\s+(?:as|of|include)',
            r'(?:consider|suppose|imagine)\s+(?:the\s+)?following',
            r'\be\.g\.'
        ],
        'explanation': [
            r'(?:this|it)\s+(?:works|means|implies)',
            r'(?:because|since|therefore|thus)',
            r'(?:explains?|reasoning|rationale)'
        ],
        'introduction': [
            r'^(?:introduction|overview|summary)',
            r'(?:this\s+(?:chapter|section|module))\s+(?:covers?|discusses?)',
            r'(?:we\s+will|you\s+will)\s+learn'
        ],
        'conclusion': [
            r'(?:in\s+)?(?:conclusion|summary)',
            r'(?:to\s+)?(?:conclude|sum\s+up)',
            r'(?:key\s+)?(?:takeaways?|points?)'
        ]
    }
    
    # Academic section markers
    SECTION_MARKERS = [
        (r'^#{1,3}\s+(.+)$', 'markdown'),
        (r'^\d+\.\d*\s+(.+)$', 'numbered'),
        (r'^(?:Chapter|Section|Part)\s+\d+[:\.\s]+(.+)$', 'formal'),
        (r'^[A-Z][^.!?]*:$', 'heading')
    ]
    
    def __init__(self, 
                 min_chunk_size: int = 200,
                 max_chunk_size: int = 1500,
                 overlap_sentences: int = 2):
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
        self.overlap_sentences = overlap_sentences
    
    def chunk_document(self, text: str, file_type: str = 'pdf') -> List[SemanticChunk]:
        """
        Main entry point for semantic chunking.
        Returns list of SemanticChunk objects with metadata.
        """
        # Clean text first
        text = clean_extracted_text(text)
        
        # Extract document structure
        sections = self._extract_sections(text)
        
        # Process each section
        chunks = []
        for section in sections:
            section_chunks = self._chunk_section(
                section['content'],
                section['title'],
                section['level']
            )
            chunks.extend(section_chunks)
        
        # Post-process to ensure quality
        chunks = self._post_process_chunks(chunks)
        
        return chunks
    
    def _extract_sections(self, text: str) -> List[Dict]:
        """
        Extract hierarchical sections from document.
        Uses existing patterns plus academic document structure.
        """
        sections = []
        lines = text.split('\n')
        current_section = {'title': 'Introduction', 'level': 0, 'content': []}
        
        for line in lines:
            # Check for section markers
            is_section = False
            for pattern, marker_type in self.SECTION_MARKERS:
                match = re.match(pattern, line.strip(), re.IGNORECASE)
                if match:
                    # Save current section if it has content
                    if current_section['content']:
                        current_section['content'] = '\n'.join(current_section['content'])
                        sections.append(current_section)
                    
                    # Start new section
                    level = self._determine_hierarchy_level(line, marker_type)
                    current_section = {
                        'title': match.group(1) if match.groups() else line.strip(),
                        'level': level,
                        'content': []
                    }
                    is_section = True
                    break
            
            if not is_section and line.strip():
                current_section['content'].append(line)
        
        # Don't forget the last section
        if current_section['content']:
            current_section['content'] = '\n'.join(current_section['content'])
            sections.append(current_section)
        
        return sections if sections else [{'title': None, 'level': 0, 'content': text}]
    
    def _chunk_section(self, content: str, title: Optional[str], level: int) -> List[SemanticChunk]:
        """
        Chunk a section while preserving semantic coherence.
        """
        chunks = []
        
        # Split into paragraphs first
        paragraphs = self._split_paragraphs(content)
        
        current_chunk = []
        current_size = 0
        
        for para in paragraphs:
            para_type = self._classify_content(para)
            para_size = len(para)
            
            # Check if adding this paragraph exceeds max size
            if current_size + para_size > self.max_chunk_size and current_chunk:
                # Create chunk from accumulated paragraphs
                chunk_content = '\n\n'.join(current_chunk)
                chunks.append(SemanticChunk(
                    content=chunk_content,
                    chunk_type=self._determine_chunk_type(chunk_content),
                    hierarchy_level=level,
                    title=title,
                    concepts=self._extract_concepts(chunk_content)
                ))
                
                # Start new chunk with overlap
                if self.overlap_sentences > 0 and chunks:
                    overlap_text = self._get_overlap_text(current_chunk[-1])
                    current_chunk = [overlap_text, para] if overlap_text else [para]
                    current_size = len(overlap_text) + para_size if overlap_text else para_size
                else:
                    current_chunk = [para]
                    current_size = para_size
            else:
                current_chunk.append(para)
                current_size += para_size
        
        # Handle remaining content
        if current_chunk:
            chunk_content = '\n\n'.join(current_chunk)
            if len(chunk_content) >= self.min_chunk_size:
                chunks.append(SemanticChunk(
                    content=chunk_content,
                    chunk_type=self._determine_chunk_type(chunk_content),
                    hierarchy_level=level,
                    title=title,
                    concepts=self._extract_concepts(chunk_content)
                ))
        
        return chunks
    
    def _split_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs, preserving structure"""
        # Split on double newlines or clear paragraph boundaries
        paragraphs = re.split(r'\n\s*\n', text)
        
        # Further split very long paragraphs at sentence boundaries
        result = []
        for para in paragraphs:
            if len(para) > self.max_chunk_size:
                sentences = self._split_sentences(para)
                current = []
                current_len = 0
                
                for sent in sentences:
                    if current_len + len(sent) > self.max_chunk_size and current:
                        result.append(' '.join(current))
                        current = [sent]
                        current_len = len(sent)
                    else:
                        current.append(sent)
                        current_len += len(sent)
                
                if current:
                    result.append(' '.join(current))
            else:
                result.append(para)
        
        return [p.strip() for p in result if p.strip()]
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences, handling academic text properly"""
        # Handle common abbreviations
        text = re.sub(r'\b(Dr|Mr|Ms|Mrs|Prof|Sr|Jr)\.', r'\1<DOT>', text)
        text = re.sub(r'\b(Inc|Ltd|Corp|Co)\.', r'\1<DOT>', text)
        text = re.sub(r'\b(i\.e|e\.g|etc|vs|cf)\.', r'\1<DOT>', text)
        
        # Split on sentence boundaries
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        
        # Restore dots
        sentences = [s.replace('<DOT>', '.') for s in sentences]
        
        return sentences
    
    def _classify_content(self, text: str) -> str:
        """Classify content type based on patterns"""
        text_lower = text.lower()
        
        # Check each pattern type
        for content_type, patterns in self.PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return content_type
        
        return 'explanation'  # default
    
    def _determine_chunk_type(self, text: str) -> str:
        """Determine primary type of a chunk"""
        # Count occurrences of each type
        type_scores = {}
        text_lower = text.lower()
        
        for content_type, patterns in self.PATTERNS.items():
            score = 0
            for pattern in patterns:
                score += len(re.findall(pattern, text_lower))
            type_scores[content_type] = score
        
        # Return type with highest score, or 'explanation' as default
        if max(type_scores.values()) > 0:
            return max(type_scores, key=type_scores.get)
        return 'explanation'
    
    def _determine_hierarchy_level(self, line: str, marker_type: str) -> int:
        """Determine hierarchy level based on marker type"""
        if marker_type == 'markdown':
            # Count # symbols
            return len(re.match(r'^(#+)', line).group(1)) - 1
        elif marker_type == 'numbered':
            # Count dots in numbering
            return line.count('.')
        elif marker_type == 'formal':
            # Chapter = 0, Section = 1
            return 0 if 'Chapter' in line else 1
        else:
            return 2  # Default for other headings
    
    def _extract_concepts(self, text: str) -> List[str]:
        """Extract key concepts from text (enhanced version)"""
        concepts = []
        
        # Academic terms pattern
        academic_pattern = r'\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:theory|model|principle|law|effect|phenomenon|algorithm|method|approach|framework|paradigm)))\b'
        concepts.extend(re.findall(academic_pattern, text))
        
        # Quoted important terms
        quoted_pattern = r'["\']([^"\'\']+)["\']'
        quoted_terms = re.findall(quoted_pattern, text)
        concepts.extend([t for t in quoted_terms if 3 < len(t) < 30])
        
        # Terms after "called" or "known as"
        terminology_pattern = r'(?:called|known\s+as|termed)\s+["\']?([^\"\'.]+?)["\'\.,]'
        concepts.extend(re.findall(terminology_pattern, text, re.IGNORECASE))
        
        # Remove duplicates and clean
        concepts = list(set(c.strip() for c in concepts if c.strip()))
        
        return concepts[:10]  # Limit to top 10
    
    def _get_overlap_text(self, text: str) -> str:
        """Get overlap text from end of previous chunk"""
        sentences = self._split_sentences(text)
        if len(sentences) >= self.overlap_sentences:
            return ' '.join(sentences[-self.overlap_sentences:])
        return ''
    
    def _post_process_chunks(self, chunks: List[SemanticChunk]) -> List[SemanticChunk]:
        """Post-process chunks to ensure quality"""
        processed = []
        
        for i, chunk in enumerate(chunks):
            # Skip chunks that are too small
            if len(chunk.content.strip()) < self.min_chunk_size:
                # Try to merge with previous or next
                if processed and len(processed[-1].content) + len(chunk.content) < self.max_chunk_size:
                    processed[-1].content += '\n\n' + chunk.content
                    processed[-1].concepts.extend(chunk.concepts or [])
                    continue
                elif i < len(chunks) - 1:
                    chunks[i + 1].content = chunk.content + '\n\n' + chunks[i + 1].content
                    continue
            
            # Add cross-references based on concepts
            if i > 0:
                prev_concepts = set(processed[-1].concepts or [])
                curr_concepts = set(chunk.concepts or [])
                if prev_concepts & curr_concepts:  # Intersection
                    chunk.references = [f"chunk_{i-1}"]
            
            processed.append(chunk)
        
        return processed


def create_enhanced_chunks(text: str, file_type: str = None, 
                         chunk_size: int = None, chunk_overlap: int = None) -> List[Dict]:
    """
    Main entry point for semantic chunking that respects configuration.
    Falls back to basic chunking if semantic is disabled.
    """
    # Get configuration
    config = ChunkingConfig()
    
    # Check if we should use semantic chunking
    if not config.should_use_semantic(file_type):
        # Fall back to basic chunking
        from utils.textUtils import split_text
        basic_chunks = split_text(text, 
                                chunk_size or config.BASIC_CHUNK_SIZE,
                                chunk_overlap or config.BASIC_CHUNK_OVERLAP)
        
        # Convert to expected format
        return [
            {
                'content': chunk,
                'chunk_index': i,
                'chunk_type': 'basic',
                'metadata': {}
            }
            for i, chunk in enumerate(basic_chunks)
        ]
    
    # Use semantic chunking
    params = config.get_chunking_params('semantic')
    chunker = SemanticChunker(
        max_chunk_size=chunk_size or params['chunk_size'],
        overlap_sentences=2  # Calculate overlap based on sentences
    )
    
    semantic_chunks = chunker.chunk_document(text)
    
    # Convert to expected format
    return [
        {
            'content': chunk.content,
            'chunk_index': i,
            'chunk_type': chunk.chunk_type,
            'metadata': chunk.to_metadata() if params['extract_metadata'] else {}
        }
        for i, chunk in enumerate(semantic_chunks)
    ]


# Keep the previous create_enhanced_chunks function as the main entry point
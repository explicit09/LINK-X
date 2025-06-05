"""
Adaptive Context Window Service - Dynamically adjusts context size based on:
- Topic complexity
- User expertise level  
- Query type
- Available tokens
"""
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import tiktoken
import re

from services.ai.hierarchical_rag_service import HierarchicalRAGService, QueryIntent
from services.ai.hybrid_search_service import SearchResult

logger = logging.getLogger(__name__)

@dataclass
class ContextWindow:
    """Represents an adaptive context window configuration"""
    max_chunks: int
    max_tokens: int
    include_prerequisites: bool
    include_examples: bool
    summarization_level: str  # 'none', 'light', 'moderate', 'heavy'
    

class AdaptiveContextService:
    """
    Manages context window sizing and content selection based on multiple factors.
    Optimizes token usage while maintaining comprehension.
    """
    
    # Topic complexity indicators
    COMPLEX_TOPICS = [
        'quantum', 'differential', 'integral', 'theorem', 'algorithm',
        'neural network', 'machine learning', 'distributed systems',
        'cryptography', 'compiler', 'optimization', 'probability',
        'statistics', 'topology', 'abstract algebra'
    ]
    
    SIMPLE_TOPICS = [
        'introduction', 'basic', 'fundamental', 'overview', 'simple',
        'beginner', 'elementary', 'primary', 'definition', 'what is'
    ]
    
    def __init__(self, hierarchical_rag: HierarchicalRAGService):
        self.hierarchical_rag = hierarchical_rag
        self.encoder = tiktoken.get_encoding("cl100k_base")
    
    def get_adaptive_context(
        self,
        query: str,
        user_expertise: str = 'intermediate',
        max_tokens_budget: int = 3000,
        course_id: Optional[str] = None
    ) -> Tuple[List[SearchResult], ContextWindow]:
        """
        Main entry point - returns optimized context for the query.
        
        Args:
            query: The user's question
            user_expertise: 'beginner', 'intermediate', 'advanced'
            max_tokens_budget: Maximum tokens to use
            course_id: Optional course filter
            
        Returns:
            Tuple of (selected chunks, context window configuration)
        """
        # Analyze query
        intent = self.hierarchical_rag._analyze_query_intent(query)
        
        # Assess topic complexity
        topic_complexity = self._assess_topic_complexity(query, intent)
        
        # Determine optimal context window
        context_window = self._determine_context_window(
            intent=intent,
            topic_complexity=topic_complexity,
            user_expertise=user_expertise,
            max_tokens_budget=max_tokens_budget
        )
        
        # Retrieve chunks with hierarchical RAG
        chunks = self.hierarchical_rag.retrieve(
            query=query,
            course_id=course_id,
            user_expertise=user_expertise,
            max_chunks=context_window.max_chunks * 2  # Get extra for filtering
        )
        
        # Optimize chunk selection based on context window
        optimized_chunks = self._optimize_chunk_selection(
            chunks=chunks,
            context_window=context_window,
            query=query,
            intent=intent
        )
        
        return optimized_chunks, context_window
    
    def _assess_topic_complexity(self, query: str, intent: QueryIntent) -> float:
        """
        Assess topic complexity beyond query complexity.
        Considers domain difficulty and conceptual depth.
        """
        query_lower = query.lower()
        
        # Check for complex topic indicators
        complex_score = 0.0
        for topic in self.COMPLEX_TOPICS:
            if topic in query_lower:
                complex_score += 0.2
        
        # Check for simple topic indicators
        simple_score = 0.0
        for topic in self.SIMPLE_TOPICS:
            if topic in query_lower:
                simple_score += 0.15
        
        # Base complexity from query analysis
        base_complexity = intent.complexity
        
        # Academic term density
        term_density = len(intent.academic_terms) / max(len(query.split()), 1)
        
        # Calculate final complexity
        topic_complexity = base_complexity * 0.4 + \
                          complex_score * 0.3 + \
                          term_density * 0.3 - \
                          simple_score * 0.2
        
        return max(0.0, min(1.0, topic_complexity))
    
    def _determine_context_window(
        self,
        intent: QueryIntent,
        topic_complexity: float,
        user_expertise: str,
        max_tokens_budget: int
    ) -> ContextWindow:
        """
        Determine optimal context window configuration.
        """
        # Base configuration by intent type
        base_configs = {
            'definition': {
                'chunks': 3,
                'tokens': 800,
                'prerequisites': False,
                'examples': False,
                'summarization': 'none'
            },
            'example': {
                'chunks': 6,
                'tokens': 1500,
                'prerequisites': False,
                'examples': True,
                'summarization': 'light'
            },
            'procedural': {
                'chunks': 8,
                'tokens': 2000,
                'prerequisites': True,
                'examples': True,
                'summarization': 'light'
            },
            'conceptual': {
                'chunks': 10,
                'tokens': 2500,
                'prerequisites': True,
                'examples': True,
                'summarization': 'moderate'
            },
            'explanation': {
                'chunks': 6,
                'tokens': 1800,
                'prerequisites': True,
                'examples': False,
                'summarization': 'light'
            }
        }
        
        config = base_configs.get(intent.primary_intent, base_configs['explanation'])
        
        # Adjust for topic complexity
        if topic_complexity > 0.7:
            # Complex topics need more context
            config['chunks'] = int(config['chunks'] * 1.5)
            config['tokens'] = int(config['tokens'] * 1.5)
            config['prerequisites'] = True
            if config['summarization'] == 'none':
                config['summarization'] = 'light'
        elif topic_complexity < 0.3:
            # Simple topics need less context
            config['chunks'] = int(config['chunks'] * 0.7)
            config['tokens'] = int(config['tokens'] * 0.7)
        
        # Adjust for user expertise
        expertise_multipliers = {
            'beginner': {'chunks': 1.3, 'tokens': 1.2, 'examples': True},
            'intermediate': {'chunks': 1.0, 'tokens': 1.0, 'examples': False},
            'advanced': {'chunks': 0.8, 'tokens': 0.9, 'examples': False}
        }
        
        multiplier = expertise_multipliers[user_expertise]
        config['chunks'] = int(config['chunks'] * multiplier['chunks'])
        config['tokens'] = int(config['tokens'] * multiplier['tokens'])
        if multiplier['examples']:
            config['examples'] = True
        
        # Respect token budget
        config['tokens'] = min(config['tokens'], max_tokens_budget)
        
        # Adjust summarization based on final token count
        if config['tokens'] > 2000:
            config['summarization'] = 'moderate'
        elif config['tokens'] > 3000:
            config['summarization'] = 'heavy'
        
        return ContextWindow(
            max_chunks=config['chunks'],
            max_tokens=config['tokens'],
            include_prerequisites=config['prerequisites'],
            include_examples=config['examples'],
            summarization_level=config['summarization']
        )
    
    def _optimize_chunk_selection(
        self,
        chunks: List[SearchResult],
        context_window: ContextWindow,
        query: str,
        intent: QueryIntent
    ) -> List[SearchResult]:
        """
        Optimize chunk selection to fit within context window.
        Prioritizes relevance and diversity.
        """
        selected_chunks = []
        total_tokens = 0
        
        # Categorize chunks
        categorized = self._categorize_chunks(chunks, intent)
        
        # Priority order based on context window settings
        if context_window.include_prerequisites:
            # Add prerequisite/foundational chunks first
            for chunk in categorized['prerequisites'][:2]:
                tokens = self._count_tokens(chunk.content)
                if total_tokens + tokens <= context_window.max_tokens:
                    selected_chunks.append(chunk)
                    total_tokens += tokens
        
        # Add primary relevant chunks
        for chunk in categorized['primary']:
            tokens = self._count_tokens(chunk.content)
            if total_tokens + tokens <= context_window.max_tokens:
                selected_chunks.append(chunk)
                total_tokens += tokens
                if len(selected_chunks) >= context_window.max_chunks:
                    break
        
        # Add examples if requested and space available
        if context_window.include_examples and len(selected_chunks) < context_window.max_chunks:
            for chunk in categorized['examples']:
                tokens = self._count_tokens(chunk.content)
                if total_tokens + tokens <= context_window.max_tokens:
                    selected_chunks.append(chunk)
                    total_tokens += tokens
                    if len(selected_chunks) >= context_window.max_chunks:
                        break
        
        # Apply summarization if needed
        if context_window.summarization_level != 'none' and total_tokens > context_window.max_tokens * 0.8:
            selected_chunks = self._apply_summarization(
                chunks=selected_chunks,
                level=context_window.summarization_level,
                target_tokens=context_window.max_tokens
            )
        
        return selected_chunks
    
    def _categorize_chunks(self, chunks: List[SearchResult], 
                          intent: QueryIntent) -> Dict[str, List[SearchResult]]:
        """
        Categorize chunks into prerequisites, primary, examples, etc.
        """
        categorized = {
            'prerequisites': [],
            'primary': [],
            'examples': [],
            'supplementary': []
        }
        
        for chunk in chunks:
            content_lower = chunk.content.lower()
            
            # Check if prerequisite/foundational
            if any(term in content_lower for term in 
                   ['prerequisite', 'foundation', 'basic concept', 'fundamental', 
                    'before we', 'first understand', 'requires knowledge']):
                categorized['prerequisites'].append(chunk)
            
            # Check if example
            elif chunk.chunk_type == 'example' or \
                 any(term in content_lower for term in 
                     ['for example', 'for instance', 'such as', 'e.g.', 'consider']):
                categorized['examples'].append(chunk)
            
            # Primary content based on score
            elif chunk.score > 0.7:
                categorized['primary'].append(chunk)
            
            # Everything else is supplementary
            else:
                categorized['supplementary'].append(chunk)
        
        # If no primary chunks, promote high-scoring supplementary
        if not categorized['primary'] and categorized['supplementary']:
            categorized['supplementary'].sort(key=lambda x: x.score, reverse=True)
            categorized['primary'] = categorized['supplementary'][:5]
            categorized['supplementary'] = categorized['supplementary'][5:]
        
        return categorized
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.encoder.encode(text))
    
    def _apply_summarization(self, chunks: List[SearchResult], 
                           level: str, target_tokens: int) -> List[SearchResult]:
        """
        Apply summarization to chunks if needed.
        For now, this is a placeholder - in production, you'd use an AI service.
        """
        # Calculate how much we need to reduce
        current_tokens = sum(self._count_tokens(chunk.content) for chunk in chunks)
        reduction_ratio = target_tokens / current_tokens if current_tokens > 0 else 1.0
        
        if reduction_ratio >= 0.95:
            # No need to summarize
            return chunks
        
        # In a real implementation, you would:
        # 1. Use AI to summarize chunks based on level
        # 2. Preserve key information while reducing verbosity
        # 3. Maintain coherence across chunks
        
        # For now, we'll just truncate to demonstrate
        summarized_chunks = []
        for chunk in chunks:
            if level == 'heavy':
                # Keep first 60% of content
                words = chunk.content.split()
                truncated = ' '.join(words[:int(len(words) * 0.6)])
                chunk.content = truncated + '...'
            elif level == 'moderate':
                # Keep first 80% of content
                words = chunk.content.split()
                truncated = ' '.join(words[:int(len(words) * 0.8)])
                chunk.content = truncated + '...'
            # 'light' summarization would use AI to remove only redundancy
            
            summarized_chunks.append(chunk)
        
        return summarized_chunks
    
    def get_token_usage_report(self, chunks: List[SearchResult]) -> Dict[str, int]:
        """
        Get detailed token usage report for chunks.
        """
        report = {
            'total_tokens': 0,
            'by_type': {},
            'by_file': {},
            'average_per_chunk': 0
        }
        
        for chunk in chunks:
            tokens = self._count_tokens(chunk.content)
            report['total_tokens'] += tokens
            
            # By type
            chunk_type = chunk.chunk_type or 'unknown'
            report['by_type'][chunk_type] = report['by_type'].get(chunk_type, 0) + tokens
            
            # By file
            report['by_file'][chunk.file_title] = report['by_file'].get(chunk.file_title, 0) + tokens
        
        if chunks:
            report['average_per_chunk'] = report['total_tokens'] // len(chunks)
        
        return report
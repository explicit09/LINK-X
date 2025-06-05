"""
Hierarchical RAG Service - Different retrieval strategies for different query types.
Builds on hybrid search to provide intent-aware retrieval.
"""
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import re

from services.ai.hybrid_search_service import HybridSearchService, SearchResult
from services.ai.utils.embeddings import EmbeddingsService
from core.query_router import QueryRouter

logger = logging.getLogger(__name__)

@dataclass
class QueryIntent:
    """Represents the intent and characteristics of a query"""
    primary_intent: str  # definition, example, explanation, procedural, conceptual
    complexity: float  # 0.0 to 1.0
    requires_context: bool
    keywords: List[str]
    academic_terms: List[str]
    

class HierarchicalRAGService:
    """
    Implements different retrieval strategies based on query intent.
    Optimizes for educational content retrieval.
    """
    
    # Intent patterns for classification
    INTENT_PATTERNS = {
        'definition': [
            r'what (?:is|are)\s+(?:a\s+)?(.+?)(?:\?|$)',
            r'define\s+(.+?)(?:\?|$)',
            r'meaning\s+of\s+(.+?)(?:\?|$)',
            r'(?:explain|describe)\s+what\s+(.+?)\s+(?:is|are|means)',
        ],
        'example': [
            r'(?:give|provide|show)\s+(?:me\s+)?(?:an?\s+)?example',
            r'(?:for\s+)?instance\s+of',
            r'such\s+as',
            r'demonstrate\s+how',
            r'real[\s-]world\s+application',
        ],
        'procedural': [
            r'how\s+(?:do|does|to|can)\s+(?:I|you|we|one)',
            r'steps\s+(?:to|for)',
            r'process\s+(?:of|for)',
            r'procedure\s+(?:to|for)',
            r'method\s+(?:to|for)',
        ],
        'conceptual': [
            r'why\s+(?:is|are|do|does)',
            r'relationship\s+between',
            r'difference\s+between',
            r'compare\s+(?:and\s+contrast)?',
            r'(?:relates?|connected?)\s+to',
        ],
        'explanation': [
            r'explain\s+(?:how|why)',
            r'describe\s+(?:the\s+)?(?:process|mechanism)',
            r'elaborate\s+on',
            r'discuss',
        ]
    }
    
    def __init__(self, embeddings_service: EmbeddingsService):
        self.hybrid_search = HybridSearchService(embeddings_service)
        self.query_router = QueryRouter()
        self.embeddings_service = embeddings_service
    
    def retrieve(self, 
                query: str,
                course_id: Optional[str] = None,
                user_expertise: str = 'intermediate',
                max_chunks: int = 10) -> List[SearchResult]:
        """
        Main entry point for hierarchical retrieval.
        Analyzes query and applies appropriate strategy.
        """
        # Analyze query intent
        intent = self._analyze_query_intent(query)
        
        # Apply retrieval strategy based on intent
        if intent.primary_intent == 'definition':
            return self._retrieve_for_definition(query, intent, course_id, max_chunks)
        elif intent.primary_intent == 'example':
            return self._retrieve_for_example(query, intent, course_id, max_chunks)
        elif intent.primary_intent == 'procedural':
            return self._retrieve_for_procedure(query, intent, course_id, max_chunks)
        elif intent.primary_intent == 'conceptual':
            return self._retrieve_for_concept(query, intent, course_id, max_chunks)
        else:
            return self._retrieve_for_explanation(query, intent, course_id, user_expertise, max_chunks)
    
    def _analyze_query_intent(self, query: str) -> QueryIntent:
        """Analyze query to determine intent and characteristics"""
        query_lower = query.lower()
        
        # Check each intent pattern
        primary_intent = 'explanation'  # default
        for intent, patterns in self.INTENT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    primary_intent = intent
                    break
            if primary_intent != 'explanation':
                break
        
        # Assess complexity
        complexity = self._assess_query_complexity(query)
        
        # Extract keywords and academic terms
        keywords = self._extract_keywords(query)
        academic_terms = self._extract_academic_terms(query)
        
        # Determine if context is needed
        requires_context = (
            primary_intent in ['conceptual', 'procedural'] or
            complexity > 0.7 or
            len(academic_terms) > 2
        )
        
        return QueryIntent(
            primary_intent=primary_intent,
            complexity=complexity,
            requires_context=requires_context,
            keywords=keywords,
            academic_terms=academic_terms
        )
    
    def _retrieve_for_definition(self, query: str, intent: QueryIntent, 
                               course_id: Optional[str], max_chunks: int) -> List[SearchResult]:
        """
        Retrieval strategy for definitions:
        - Prioritize chunks with 'definition' type
        - Use keyword search for exact term matching
        - Limit to concise chunks
        """
        # Extract the term being defined
        term = None
        for pattern in self.INTENT_PATTERNS['definition']:
            match = re.search(pattern, query.lower())
            if match and match.groups():
                term = match.group(1).strip()
                break
        
        if term:
            # Search specifically for the term
            results = self.hybrid_search.search(
                query=f'"{term}" definition',
                course_id=course_id,
                limit=max_chunks,
                search_type='hybrid'
            )
        else:
            # Fallback to general search
            results = self.hybrid_search.search_with_intent(
                query=query,
                intent='definition',
                course_id=course_id,
                limit=max_chunks
            )
        
        # Filter and rank results
        definition_chunks = [r for r in results if r.chunk_type == 'definition']
        other_chunks = [r for r in results if r.chunk_type != 'definition']
        
        # Limit definition chunks to be concise
        concise_definitions = []
        total_length = 0
        for chunk in definition_chunks:
            if total_length < 1000:  # ~200 words
                concise_definitions.append(chunk)
                total_length += len(chunk.content)
        
        return concise_definitions + other_chunks[:max(3, max_chunks - len(concise_definitions))]
    
    def _retrieve_for_example(self, query: str, intent: QueryIntent,
                            course_id: Optional[str], max_chunks: int) -> List[SearchResult]:
        """
        Retrieval strategy for examples:
        - Prioritize chunks with 'example' type
        - Look for practical applications
        - Include diverse examples
        """
        # Search with example intent
        results = self.hybrid_search.search_with_intent(
            query=query,
            intent='example',
            course_id=course_id,
            limit=max_chunks * 2  # Get more to ensure diversity
        )
        
        # Categorize examples
        example_chunks = [r for r in results if r.chunk_type == 'example']
        application_chunks = [r for r in results if 'application' in r.content.lower()]
        
        # Ensure diversity by checking content similarity
        diverse_examples = self._select_diverse_chunks(example_chunks, max_chunks // 2)
        diverse_applications = self._select_diverse_chunks(application_chunks, max_chunks // 2)
        
        # Combine and limit
        combined = diverse_examples + diverse_applications
        return combined[:max_chunks]
    
    def _retrieve_for_procedure(self, query: str, intent: QueryIntent,
                              course_id: Optional[str], max_chunks: int) -> List[SearchResult]:
        """
        Retrieval strategy for procedural queries:
        - Retrieve sequential/ordered content
        - Include complete process descriptions
        - Maintain logical flow
        """
        # Search for procedural content
        results = self.hybrid_search.search(
            query=query + " steps process procedure method",
            course_id=course_id,
            limit=max_chunks * 2,
            search_type='hybrid'
        )
        
        # Look for sequential indicators
        procedural_chunks = []
        for result in results:
            content_lower = result.content.lower()
            if any(indicator in content_lower for indicator in 
                   ['step', 'first', 'then', 'next', 'finally', 'procedure', 'process']):
                procedural_chunks.append(result)
        
        # Try to maintain sequence if chunks are from same file
        if procedural_chunks:
            # Group by file and sort by chunk index
            from collections import defaultdict
            file_chunks = defaultdict(list)
            for chunk in procedural_chunks:
                file_chunks[chunk.file_id].append(chunk)
            
            # Get complete sequences
            sequential_results = []
            for file_id, chunks in file_chunks.items():
                sorted_chunks = sorted(chunks, key=lambda x: x.chunk_index)
                sequential_results.extend(sorted_chunks[:max_chunks // len(file_chunks)])
            
            return sequential_results[:max_chunks]
        
        return results[:max_chunks]
    
    def _retrieve_for_concept(self, query: str, intent: QueryIntent,
                            course_id: Optional[str], max_chunks: int) -> List[SearchResult]:
        """
        Retrieval strategy for conceptual understanding:
        - Include related concepts
        - Provide context and relationships
        - Use semantic similarity heavily
        """
        # Extract concepts from query
        concepts = intent.academic_terms + intent.keywords
        
        # Perform multiple searches for related concepts
        all_results = []
        
        # Main query search
        main_results = self.hybrid_search.search(
            query=query,
            course_id=course_id,
            limit=max_chunks // 2,
            search_type='vector'  # Emphasize semantic similarity
        )
        all_results.extend(main_results)
        
        # Search for each concept
        for concept in concepts[:3]:  # Limit to top 3 concepts
            concept_results = self.hybrid_search.search(
                query=f"{concept} relationship connection related",
                course_id=course_id,
                limit=3,
                search_type='hybrid'
            )
            all_results.extend(concept_results)
        
        # Remove duplicates and rank by relevance
        unique_results = self._deduplicate_results(all_results)
        
        # Sort by combined relevance to all concepts
        for result in unique_results:
            concept_score = sum(1 for concept in concepts 
                              if concept.lower() in result.content.lower())
            result.score = result.score * (1 + concept_score * 0.2)
        
        unique_results.sort(key=lambda x: x.score, reverse=True)
        return unique_results[:max_chunks]
    
    def _retrieve_for_explanation(self, query: str, intent: QueryIntent,
                                course_id: Optional[str], user_expertise: str,
                                max_chunks: int) -> List[SearchResult]:
        """
        General retrieval strategy for explanations:
        - Balance completeness with clarity
        - Adjust depth based on user expertise
        - Include supporting details
        """
        # Adjust chunk count based on complexity and expertise
        if intent.complexity > 0.7 and user_expertise == 'beginner':
            max_chunks = int(max_chunks * 1.5)  # More chunks for complex topics
        elif intent.complexity < 0.3 and user_expertise == 'advanced':
            max_chunks = int(max_chunks * 0.7)  # Fewer chunks for simple topics
        
        # Perform balanced search
        results = self.hybrid_search.search(
            query=query,
            course_id=course_id,
            limit=max_chunks,
            search_type='hybrid'
        )
        
        # If high complexity, ensure we have foundational content
        if intent.complexity > 0.7:
            # Search for introductory content
            intro_results = self.hybrid_search.search(
                query=f"introduction basics fundamentals {' '.join(intent.keywords[:2])}",
                course_id=course_id,
                limit=3,
                search_type='hybrid'
            )
            
            # Prepend introductory content
            results = intro_results + results
            results = self._deduplicate_results(results)[:max_chunks]
        
        return results
    
    def _assess_query_complexity(self, query: str) -> float:
        """Assess query complexity (0.0 to 1.0)"""
        factors = {
            'length': len(query.split()),
            'technical_terms': len(self._extract_academic_terms(query)),
            'nested_questions': query.count('?'),
            'conjunctions': len(re.findall(r'\b(and|or|but|with|versus|vs)\b', query.lower())),
            'abstract_terms': len(re.findall(r'\b(theory|concept|principle|framework|paradigm)\b', query.lower()))
        }
        
        # Normalize factors
        complexity = 0.0
        complexity += min(factors['length'] / 20, 1.0) * 0.2
        complexity += min(factors['technical_terms'] / 3, 1.0) * 0.3
        complexity += min(factors['nested_questions'] / 2, 1.0) * 0.2
        complexity += min(factors['conjunctions'] / 3, 1.0) * 0.15
        complexity += min(factors['abstract_terms'] / 2, 1.0) * 0.15
        
        return min(complexity, 1.0)
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Extract important keywords from query"""
        # Remove common words
        stopwords = {'what', 'is', 'are', 'how', 'why', 'when', 'where', 'who', 'which',
                    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
                    'before', 'after', 'above', 'below', 'between', 'under', 'again',
                    'further', 'then', 'once', 'can', 'you', 'me', 'i', 'do', 'does'}
        
        words = re.findall(r'\b\w+\b', query.lower())
        keywords = [w for w in words if w not in stopwords and len(w) > 2]
        
        # Prioritize longer words (often more specific)
        keywords.sort(key=len, reverse=True)
        
        return keywords[:10]
    
    def _extract_academic_terms(self, query: str) -> List[str]:
        """Extract academic/technical terms"""
        # Pattern for compound academic terms
        pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
        terms = re.findall(pattern, query)
        
        # Also look for known academic indicators
        academic_indicators = ['theory', 'law', 'principle', 'theorem', 'hypothesis',
                             'model', 'framework', 'paradigm', 'methodology']
        
        for indicator in academic_indicators:
            pattern = rf'\b(\w+\s+{indicator})\b'
            matches = re.findall(pattern, query, re.IGNORECASE)
            terms.extend(matches)
        
        return list(set(terms))
    
    def _select_diverse_chunks(self, chunks: List[SearchResult], 
                             max_count: int) -> List[SearchResult]:
        """Select diverse chunks to avoid redundancy"""
        if len(chunks) <= max_count:
            return chunks
        
        selected = []
        for chunk in chunks:
            # Check if similar content already selected
            is_similar = False
            for selected_chunk in selected:
                # Simple similarity check (could use embeddings for better results)
                overlap = len(set(chunk.content.split()) & 
                            set(selected_chunk.content.split()))
                if overlap / len(chunk.content.split()) > 0.5:
                    is_similar = True
                    break
            
            if not is_similar:
                selected.append(chunk)
                if len(selected) >= max_count:
                    break
        
        return selected
    
    def _deduplicate_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """Remove duplicate results based on file_id and chunk_index"""
        seen = set()
        unique = []
        
        for result in results:
            key = (result.file_id, result.chunk_index)
            if key not in seen:
                seen.add(key)
                unique.append(result)
        
        return unique
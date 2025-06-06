"""
Hybrid search service combining vector similarity and full-text search.
Builds on existing pgvector and PostgreSQL FTS infrastructure.
"""
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import numpy as np
from sqlalchemy import text
import psycopg2
import os

from services.ai.utils.vector_search import retrieve_chunks_pgvector, VectorSearchService
from core.database_supabase import db_manager
from db.schema import FileChunk, File, Module

logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """Unified search result from hybrid search"""
    content: str
    chunk_index: int
    file_id: str
    file_title: str
    module_title: str
    score: float  # Combined score
    vector_score: float
    keyword_score: float
    metadata: Dict
    chunk_type: Optional[str] = None
    

class HybridSearchService:
    """
    Combines vector search (semantic) with full-text search (keyword) for better retrieval.
    Especially important for educational content with technical terms.
    """
    
    def __init__(self, alpha: float = 0.7):
        """
        Note: Embeddings are now handled automatically by Supabase
        
        Args:
            alpha: Weight for vector search (1-alpha for keyword search)
        """
        # No longer needs embeddings_service - Supabase handles it
        self.vector_search = VectorSearchService()
        self.alpha = alpha
    
    def search(self, 
               query: str,
               query_embedding: Optional[List[float]] = None,
               course_id: Optional[str] = None,
               file_id: Optional[str] = None,
               limit: int = 10,
               search_type: str = 'hybrid') -> List[SearchResult]:
        """
        Perform hybrid search combining vector and keyword search.
        
        Args:
            query: Search query
            course_id: Optional course filter
            file_id: Optional file filter  
            limit: Number of results
            search_type: 'hybrid', 'vector', or 'keyword'
        """
        if search_type == 'vector':
            return self._vector_only_search(query, query_embedding, course_id, file_id, limit)
        elif search_type == 'keyword':
            return self._keyword_only_search(query, course_id, file_id, limit)
        else:
            return self._hybrid_search(query, query_embedding, course_id, file_id, limit)
    
    def _hybrid_search(self, query: str, query_embedding: Optional[List[float]], 
                      course_id: Optional[str], file_id: Optional[str], 
                      limit: int) -> List[SearchResult]:
        """Perform hybrid search combining vector and keyword results"""
        # Get vector search results
        vector_results = self._vector_only_search(query, query_embedding, course_id, file_id, limit * 2)
        
        # Get keyword search results  
        keyword_results = self._keyword_only_search(query, course_id, file_id, limit * 2)
        
        # Combine and re-rank
        combined_results = self._combine_results(vector_results, keyword_results)
        
        # Return top results
        return combined_results[:limit]
    
    def _vector_only_search(self, query: str, query_embedding: Optional[List[float]], 
                           course_id: Optional[str], file_id: Optional[str], 
                           limit: int) -> List[SearchResult]:
        """Perform vector similarity search using existing infrastructure"""
        try:
            # Use pre-computed embedding from Supabase or require it as parameter
            if query_embedding is None:
                raise ValueError("query_embedding is required for vector search (get from Supabase)")
            
            with db_manager.get_session() as session:
                # Use existing pgvector search
                chunks = retrieve_chunks_pgvector(
                    db_session=session,
                    query_embedding=query_embedding,
                    course_id=course_id,
                    file_id=file_id,
                    limit=limit,
                    similarity_threshold=0.3
                )
                
                # Convert to SearchResult objects
                results = []
                for chunk in chunks:
                    # Parse metadata if it exists
                    metadata = chunk.get('metadata', {})
                    if isinstance(metadata, str):
                        import json
                        try:
                            metadata = json.loads(metadata)
                        except:
                            metadata = {}
                    
                    results.append(SearchResult(
                        content=chunk['content'],
                        chunk_index=chunk['chunk_index'],
                        file_id=chunk['file_id'],
                        file_title=chunk['file_title'],
                        module_title=chunk['module_title'],
                        score=chunk['similarity'],
                        vector_score=chunk['similarity'],
                        keyword_score=0.0,
                        metadata=metadata,
                        chunk_type=metadata.get('chunk_type')
                    ))
                
                return results
                
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return []
    
    def _keyword_only_search(self, query: str, course_id: Optional[str],
                            file_id: Optional[str], limit: int) -> List[SearchResult]:
        """Perform full-text search using PostgreSQL FTS"""
        try:
            # Direct PostgreSQL connection for FTS
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                raise RuntimeError("DATABASE_URL not configured")
            
            conn = psycopg2.connect(database_url)
            cur = conn.cursor()
            
            try:
                # Build FTS query - handle phrases and technical terms
                ts_query = self._build_ts_query(query)
                
                # SQL query using existing FTS capabilities
                sql = """
                SELECT 
                    fc.content,
                    fc.chunk_index,
                    fc.file_id,
                    f.title as file_title,
                    m.title as module_title,
                    fc.chunk_metadata,
                    ts_rank_cd(to_tsvector('english', fc.content), query) as rank,
                    ts_headline('english', fc.content, query, 
                               'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') as headline
                FROM "FileChunk" fc
                JOIN "File" f ON fc.file_id = f.id  
                JOIN "Module" m ON f.module_id = m.id,
                to_tsquery('english', %s) query
                WHERE to_tsvector('english', fc.content) @@ query
                """
                
                params = [ts_query]
                
                # Add filters
                if course_id:
                    sql += " AND fc.course_id = %s"
                    params.append(course_id)
                if file_id:
                    sql += " AND fc.file_id = %s"
                    params.append(file_id)
                    
                sql += " ORDER BY rank DESC LIMIT %s"
                params.append(limit)
                
                cur.execute(sql, params)
                rows = cur.fetchall()
                
                # Convert to SearchResult objects
                results = []
                for row in rows:
                    metadata = row[5] or {}
                    if isinstance(metadata, str):
                        import json
                        try:
                            metadata = json.loads(metadata)
                        except:
                            metadata = {}
                    
                    results.append(SearchResult(
                        content=row[0],
                        chunk_index=row[1],
                        file_id=str(row[2]),
                        file_title=row[3],
                        module_title=row[4],
                        score=float(row[6]),  # ts_rank score
                        vector_score=0.0,
                        keyword_score=float(row[6]),
                        metadata=metadata,
                        chunk_type=metadata.get('chunk_type')
                    ))
                
                return results
                
            finally:
                cur.close()
                conn.close()
                
        except Exception as e:
            logger.error(f"Keyword search error: {e}")
            return []
    
    def _build_ts_query(self, query: str) -> str:
        """
        Build PostgreSQL ts_query handling phrases and boolean operators.
        Enhances search for technical/academic terms.
        """
        # Handle quoted phrases
        import re
        phrases = re.findall(r'"([^"]+)"', query)
        
        # Remove phrases from query
        remaining = query
        for phrase in phrases:
            remaining = remaining.replace(f'"{phrase}"', '')
        
        # Build query parts
        parts = []
        
        # Add phrases as exact matches
        for phrase in phrases:
            # Replace spaces with <-> for phrase search
            phrase_query = ' <-> '.join(phrase.split())
            parts.append(f'({phrase_query})')
        
        # Add remaining words
        words = remaining.split()
        for word in words:
            if word.strip():
                parts.append(word.strip())
        
        # Join with AND
        if parts:
            return ' & '.join(parts)
        return query
    
    def _combine_results(self, vector_results: List[SearchResult], 
                        keyword_results: List[SearchResult]) -> List[SearchResult]:
        """
        Combine and re-rank results from vector and keyword search.
        Uses reciprocal rank fusion with weighting.
        """
        # Create lookup maps
        result_map = {}  # key: (file_id, chunk_index)
        
        # Process vector results
        for i, result in enumerate(vector_results):
            key = (result.file_id, result.chunk_index)
            result_map[key] = result
            # Reciprocal rank fusion score
            result.score = self.alpha / (i + 1)
        
        # Process keyword results
        for i, result in enumerate(keyword_results):
            key = (result.file_id, result.chunk_index)
            if key in result_map:
                # Update existing result
                existing = result_map[key]
                existing.keyword_score = result.keyword_score
                existing.score += (1 - self.alpha) / (i + 1)
            else:
                # New result from keyword search
                result.score = (1 - self.alpha) / (i + 1)
                result_map[key] = result
        
        # Sort by combined score
        combined = list(result_map.values())
        combined.sort(key=lambda x: x.score, reverse=True)
        
        # Boost results that appear in both searches
        for result in combined:
            if result.vector_score > 0 and result.keyword_score > 0:
                result.score *= 1.5  # Boost factor
        
        # Re-sort after boosting
        combined.sort(key=lambda x: x.score, reverse=True)
        
        return combined
    
    def search_with_intent(self, query: str, intent: str, **kwargs) -> List[SearchResult]:
        """
        Search with specific intent to adjust strategy.
        This prepares for Phase 2 hierarchical RAG.
        
        Args:
            query: Search query
            intent: 'definition', 'example', 'explanation', 'factual'
        """
        # Adjust search weights based on intent
        if intent == 'definition':
            # Favor keyword search for exact terms
            self.alpha = 0.3
        elif intent == 'example':
            # Favor vector search for semantic similarity
            self.alpha = 0.8
        elif intent == 'factual':
            # Balanced approach
            self.alpha = 0.5
        else:
            # Default
            self.alpha = 0.7
        
        # Perform search
        results = self.search(query, **kwargs)
        
        # Filter by chunk type if available
        if intent in ['definition', 'example']:
            # Prioritize chunks with matching type
            typed_results = [r for r in results if r.chunk_type == intent]
            other_results = [r for r in results if r.chunk_type != intent]
            results = typed_results + other_results
        
        return results
    
    def get_academic_terms(self, query: str, course_id: Optional[str] = None) -> List[str]:
        """
        Extract and search for academic terms specifically.
        Useful for ensuring technical accuracy.
        """
        # Pattern for academic terms
        academic_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
        terms = re.findall(academic_pattern, query)
        
        # Search for each term
        all_results = []
        for term in terms:
            results = self.search(f'"{term}"', course_id=course_id, limit=3, search_type='keyword')
            all_results.extend(results)
        
        # Extract definitions from results
        definitions = []
        for result in all_results:
            if 'defined as' in result.content or 'refers to' in result.content:
                definitions.append(result.content)
        
        return definitions
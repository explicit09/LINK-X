"""
Vector search utilities for pgvector
"""

import numpy as np
from typing import List, Dict, Optional
from sqlalchemy import text


def retrieve_chunks_pgvector(db_session, query_embedding, course_id=None, file_id=None, 
                           limit=15, similarity_threshold=0.3) -> List[Dict]:
    """
    Retrieve relevant chunks using pgvector with proper CTE optimization.
    
    Args:
        db_session: SQLAlchemy session
        query_embedding: Query embedding vector
        course_id: Optional course ID filter
        file_id: Optional file ID filter
        limit: Number of results to return
        similarity_threshold: Minimum similarity score
    
    Returns:
        List of chunk dictionaries
    """
    # Convert numpy array to list for PostgreSQL
    if isinstance(query_embedding, np.ndarray):
        query_embedding = query_embedding.tolist()
    
    # Build query with CTE for optimization
    query = """
    WITH q AS (SELECT :query_vec::vector AS v)
    SELECT 
        fc.content,
        fc.chunk_index,
        fc.chunk_metadata,
        f.title as file_title,
        f.filename,
        m.title as module_title,
        1 - (fc.embedding <=> q.v) AS similarity
    FROM q
    JOIN "FileChunk" fc ON TRUE
    JOIN "File" f ON fc.file_id = f.id
    JOIN "Module" m ON f.module_id = m.id
    WHERE 1=1
    """
    
    params = {"query_vec": query_embedding}
    
    if course_id:
        query += " AND fc.course_id = :course_id"
        params["course_id"] = course_id
        
    if file_id:
        query += " AND fc.file_id = :file_id"
        params["file_id"] = file_id
        
    query += """
    AND 1 - (fc.embedding <=> q.v) > :similarity_threshold
    ORDER BY fc.embedding <=> q.v
    LIMIT :limit
    """
    
    params["similarity_threshold"] = similarity_threshold
    params["limit"] = limit
    
    result = db_session.execute(text(query), params)
    
    chunks = []
    for row in result:
        chunk_data = {
            "content": row.content,
            "chunk_index": row.chunk_index,
            "metadata": row.chunk_metadata or {},
            "file_title": row.file_title,
            "filename": row.filename,
            "module_title": row.module_title,
            "similarity": row.similarity
        }
        chunks.append(chunk_data)
    
    return chunks


class VectorSearchService:
    """Service for vector-based content search"""
    
    def __init__(self, embeddings_service):
        self.embeddings_service = embeddings_service
    
    def search_similar_content(self, query: str, db_session, **filters) -> List[Dict]:
        """Search for similar content using vector similarity"""
        try:
            # Generate embedding for query
            query_embedding = self.embeddings_service.generate_embeddings(query)
            
            # Perform vector search
            results = retrieve_chunks_pgvector(
                db_session=db_session,
                query_embedding=query_embedding,
                **filters
            )
            
            return results
            
        except Exception as e:
            # Return empty results on error
            return []
    
    def find_related_concepts(self, content: str, db_session, course_id: Optional[str] = None) -> List[Dict]:
        """Find content related to the given concepts"""
        try:
            # Extract key concepts from content (simplified)
            concepts = self._extract_key_concepts(content)
            
            all_results = []
            for concept in concepts[:3]:  # Limit to top 3 concepts
                results = self.search_similar_content(
                    query=concept,
                    db_session=db_session,
                    course_id=course_id,
                    limit=5
                )
                all_results.extend(results)
            
            # Remove duplicates and sort by similarity
            unique_results = {}
            for result in all_results:
                key = f"{result['file_title']}_{result['chunk_index']}"
                if key not in unique_results or result['similarity'] > unique_results[key]['similarity']:
                    unique_results[key] = result
            
            return sorted(unique_results.values(), key=lambda x: x['similarity'], reverse=True)[:10]
            
        except Exception:
            return []
    
    def _extract_key_concepts(self, content: str) -> List[str]:
        """Extract key concepts from content (simplified implementation)"""
        # This is a simplified implementation
        # In a production system, you might use NLP libraries or AI for concept extraction
        
        # Remove common words and split into potential concepts
        common_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'a', 'an'}
        
        words = content.lower().split()
        concepts = []
        
        # Look for potential multi-word concepts
        for i in range(len(words) - 1):
            if words[i] not in common_words and words[i+1] not in common_words:
                if len(words[i]) > 3 and len(words[i+1]) > 3:
                    concepts.append(f"{words[i]} {words[i+1]}")
        
        # Add single important words
        for word in words:
            if word not in common_words and len(word) > 4:
                concepts.append(word)
        
        return list(set(concepts))[:10]  # Return unique concepts, max 10
"""
Vector search utilities for pgvector
"""

import numpy as np
from typing import List, Dict, Optional
from sqlalchemy import text
import psycopg2
import os


def retrieve_chunks_pgvector(db_session, query_embedding, course_id=None, file_id=None, 
                           limit=15, similarity_threshold=0.3) -> List[Dict]:
    """
    Retrieve relevant chunks using pgvector with direct psycopg2 for vector operations.
    
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
    
    # Use direct psycopg2 connection for vector operations (SQLAlchemy has issues with vector parameters)
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise RuntimeError("DATABASE_URL not configured")
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        # Format vector as string for PostgreSQL vector type
        vector_str = '[' + ','.join(map(str, query_embedding)) + ']'
        
        # Build query with vector string directly embedded (avoids parameter conversion issues)
        query = f"""
        SELECT 
            fc.content,
            fc.chunk_index,
            fc.chunk_metadata,
            f.title as file_title,
            f.filename,
            m.title as module_title,
            1 - (fc.embedding <=> '{vector_str}') AS similarity,
            fc.file_id,
            fc.course_id
        FROM "FileChunk" fc
        JOIN "File" f ON fc.file_id = f.id
        JOIN "Module" m ON f.module_id = m.id
        WHERE 1 - (fc.embedding <=> '{vector_str}') > %s
        """
        
        params = [similarity_threshold]
        
        # Add optional filters
        if course_id:
            query += " AND fc.course_id = %s"
            params.append(course_id)
            
        if file_id:
            query += " AND fc.file_id = %s"
            params.append(file_id)
            
        query += f"""
        ORDER BY fc.embedding <=> '{vector_str}'
        LIMIT %s
        """
        params.append(limit)
        
        # Execute query
        cur.execute(query, params)
        results = cur.fetchall()
        
        # Convert to dictionaries
        chunks = []
        for row in results:
            chunk_data = {
                "content": row[0],
                "chunk_index": row[1], 
                "metadata": row[2] or {},
                "file_title": row[3],
                "filename": row[4],
                "module_title": row[5],
                "similarity": float(row[6]),
                "file_id": str(row[7]),
                "course_id": str(row[8]) if row[8] else None
            }
            chunks.append(chunk_data)
        
        return chunks
        
    finally:
        cur.close()
        conn.close()


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
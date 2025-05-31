"""
Optimized RAG Retrieval System
Replaces the current 50-chunk dumps with efficient top-k=6, ≤800 tokens retrieval
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import tiktoken
from sqlalchemy.orm import Session

from .vector_search import retrieve_chunks_pgvector
from ..utils.embeddings import EmbeddingsService

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    """Results from optimized RAG retrieval"""
    chunks: List[Dict[str, Any]]
    total_tokens: int
    similarity_scores: List[float]
    retrieval_time: float
    query_embedding_time: float


class OptimizedRAG:
    """
    Optimized RAG retrieval system focused on efficiency and relevance
    
    Key optimizations:
    - Limited to top-k=6 most relevant chunks
    - Token count capped at ≤800 tokens total
    - Smart chunk selection based on similarity + diversity
    - Efficient token counting with tiktoken
    """
    
    def __init__(
        self,
        max_chunks: int = 6,
        max_tokens: int = 800,
        similarity_threshold: float = 0.3,
        diversity_factor: float = 0.1
    ):
        self.max_chunks = max_chunks
        self.max_tokens = max_tokens
        self.similarity_threshold = similarity_threshold
        self.diversity_factor = diversity_factor
        
        # Initialize token encoder for accurate counting
        self.encoder = tiktoken.encoding_for_model("gpt-4")
        # Note: EmbeddingsService will be initialized when needed with proper client
        self.embeddings_service = None
    
    def retrieve_optimized(
        self,
        query: str,
        db_session: Session,
        course_id: Optional[str] = None,
        file_id: Optional[str] = None,
        user_profile: Optional[Dict[str, Any]] = None
    ) -> RetrievalResult:
        """
        Perform optimized RAG retrieval with token and relevance constraints
        
        Args:
            query: User query or search term
            db_session: Database session
            course_id: Optional course filter
            file_id: Optional file filter
            user_profile: Optional user profile for personalized retrieval
            
        Returns:
            RetrievalResult with optimized chunks and metadata
        """
        import time
        start_time = time.time()
        
        # Generate query embedding
        embedding_start = time.time()
        if self.embeddings_service is None:
            from ..utils.embeddings import EmbeddingsService
            from ..clients.openai_client import OpenAIClient
            client = OpenAIClient()
            self.embeddings_service = EmbeddingsService(client)
        
        query_embedding = self.embeddings_service.generate_embeddings(query)
        query_embedding_time = time.time() - embedding_start
        
        # Retrieve candidate chunks (more than we need for selection)
        retrieval_start = time.time()
        candidate_chunks = retrieve_chunks_pgvector(
            db_session=db_session,
            query_embedding=query_embedding,
            course_id=course_id,
            file_id=file_id,
            limit=self.max_chunks * 3,  # Get 3x for better selection
            similarity_threshold=self.similarity_threshold
        )
        
        # Select optimal chunks with token constraints
        selected_chunks, total_tokens = self._select_optimal_chunks(candidate_chunks)
        
        retrieval_time = time.time() - retrieval_start
        total_time = time.time() - start_time
        
        # Extract similarity scores
        similarity_scores = [chunk.get('similarity', 0.0) for chunk in selected_chunks]
        
        logger.info(f"RAG retrieval: {len(selected_chunks)} chunks, {total_tokens} tokens, {total_time:.2f}s")
        
        return RetrievalResult(
            chunks=selected_chunks,
            total_tokens=total_tokens,
            similarity_scores=similarity_scores,
            retrieval_time=retrieval_time,
            query_embedding_time=query_embedding_time
        )
    
    def _select_optimal_chunks(
        self,
        candidate_chunks: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Select optimal chunks considering both relevance and token constraints
        
        Uses a greedy algorithm that:
        1. Prioritizes highest similarity scores
        2. Respects token budget
        3. Avoids overly similar chunks (diversity)
        """
        if not candidate_chunks:
            return [], 0
        
        selected_chunks = []
        total_tokens = 0
        used_embeddings = []
        
        # Sort by similarity score (highest first)
        sorted_chunks = sorted(
            candidate_chunks,
            key=lambda x: x.get('similarity', 0.0),
            reverse=True
        )
        
        for chunk in sorted_chunks:
            # Check if we've hit our limits
            if len(selected_chunks) >= self.max_chunks:
                break
            
            content = chunk.get('content', '')
            chunk_tokens = len(self.encoder.encode(content))
            
            # Skip if adding this chunk would exceed token budget
            if total_tokens + chunk_tokens > self.max_tokens:
                # Try to find a smaller chunk that fits
                continue
            
            # Check diversity (avoid too similar chunks)
            if self._is_diverse_enough(chunk, used_embeddings):
                selected_chunks.append(chunk)
                total_tokens += chunk_tokens
                
                # Store embedding for diversity checking
                if 'embedding' in chunk:
                    used_embeddings.append(chunk['embedding'])
        
        return selected_chunks, total_tokens
    
    def _is_diverse_enough(
        self,
        chunk: Dict[str, Any],
        used_embeddings: List[List[float]]
    ) -> bool:
        """
        Check if chunk is diverse enough from already selected chunks
        
        Simple diversity check using cosine similarity between embeddings
        """
        if not used_embeddings or 'embedding' not in chunk:
            return True
        
        chunk_embedding = chunk['embedding']
        
        for used_embedding in used_embeddings:
            similarity = self._cosine_similarity(chunk_embedding, used_embedding)
            
            # If too similar to existing chunk, skip
            if similarity > (1.0 - self.diversity_factor):
                return False
        
        return True
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            import numpy as np
            
            vec1_np = np.array(vec1)
            vec2_np = np.array(vec2)
            
            dot_product = np.dot(vec1_np, vec2_np)
            norm1 = np.linalg.norm(vec1_np)
            norm2 = np.linalg.norm(vec2_np)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
        
        except Exception:
            # Fallback if numpy not available
            return 0.5
    
    def format_context_for_prompt(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Format retrieved chunks for use in prompts
        
        Returns clean, organized context string
        """
        if not chunks:
            return "No relevant context found."
        
        formatted_sections = []
        
        for i, chunk in enumerate(chunks, 1):
            content = chunk.get('content', '').strip()
            file_title = chunk.get('file_title', 'Unknown Source')
            
            section = f"[Context {i} - {file_title}]\n{content}"
            formatted_sections.append(section)
        
        return "\n\n".join(formatted_sections)
    
    def get_retrieval_stats(self) -> Dict[str, Any]:
        """Get current retrieval configuration stats"""
        return {
            "max_chunks": self.max_chunks,
            "max_tokens": self.max_tokens,
            "similarity_threshold": self.similarity_threshold,
            "diversity_factor": self.diversity_factor,
            "encoder_model": "gpt-4"
        }


# Global instance for easy importing
optimized_rag = OptimizedRAG()
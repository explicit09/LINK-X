"""AI Utils module"""

# Note: EmbeddingsService removed - Supabase handles embeddings automatically
from .personalization import PersonalizationService
from .vector_search import VectorSearchService, retrieve_chunks_pgvector

__all__ = ['PersonalizationService', 'VectorSearchService', 'retrieve_chunks_pgvector']
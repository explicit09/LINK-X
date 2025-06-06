"""AI Utils module"""

# Note: EmbeddingsService is deprecated - Supabase handles embeddings automatically
# The import is kept for backward compatibility during migration
from .embeddings import EmbeddingsService
from .personalization import PersonalizationService
from .vector_search import VectorSearchService, retrieve_chunks_pgvector

__all__ = ['EmbeddingsService', 'PersonalizationService', 'VectorSearchService', 'retrieve_chunks_pgvector']
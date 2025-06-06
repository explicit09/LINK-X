"""
DEPRECATED: Embeddings are now handled automatically by Supabase

This file exists only for backward compatibility during migration.
All embedding generation is now handled by Supabase database triggers.
"""

class EmbeddingsService:
    """
    Deprecated embedding service - Supabase handles embeddings automatically.
    
    This class exists only to prevent import errors during migration.
    All methods raise NotImplementedError.
    """
    
    def __init__(self, *args, **kwargs):
        """No initialization needed - embeddings handled by Supabase"""
        pass
    
    def generate_embeddings(self, text: str):
        """
        DEPRECATED: Use Supabase automatic embeddings instead.
        
        Embeddings are generated automatically when content is inserted
        or updated in the database via Supabase Edge Functions.
        """
        raise NotImplementedError(
            "EmbeddingsService is deprecated. "
            "Embeddings are now generated automatically by Supabase. "
            "Please update your code to use pre-computed embeddings from the database."
        )
    
    def generate_batch_embeddings(self, texts: list):
        """DEPRECATED: Use Supabase automatic embeddings instead."""
        raise NotImplementedError(
            "EmbeddingsService is deprecated. "
            "Embeddings are now generated automatically by Supabase."
        )
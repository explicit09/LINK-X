"""
Refactored AI Service - Backward Compatibility Wrapper

This file maintains backward compatibility while using the new modular AI service.
All imports from the original ai_service.py will continue to work.
"""

# Import the new modular AI service
from .ai.ai_service import AIService
from .ai.utils.vector_search import retrieve_chunks_pgvector

# Export everything for backward compatibility
__all__ = ['AIService', 'retrieve_chunks_pgvector']

# Re-export the main class and functions
AIService = AIService
retrieve_chunks_pgvector = retrieve_chunks_pgvector
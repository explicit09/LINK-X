"""
AI Service Module - Modular AI operations for the learning platform
"""

from .ai_service import AIService
from .clients.openai_client import OpenAIClient
from .generators.content_generator import ContentGenerator
from .generators.quiz_generator import QuizGenerator
from .chat.chat_service import ChatService
# Note: EmbeddingsService removed - Supabase handles embeddings automatically
from .utils.vector_search import retrieve_chunks_pgvector

__all__ = [
    'AIService',
    'OpenAIClient',
    'ContentGenerator',
    'QuizGenerator', 
    'ChatService',
    'retrieve_chunks_pgvector'
]
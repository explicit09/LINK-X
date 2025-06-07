"""
Main AI Service - Orchestrates all AI operations
"""

from typing import Dict, List, Optional, Any, Generator
from queue import Queue

from .clients.openai_client import OpenAIClient
from .generators.content_generator import ContentGenerator
from .generators.quiz_generator import QuizGenerator
from .chat.chat_service import ChatService
# Note: EmbeddingsService removed - Supabase handles embeddings automatically
from .utils.personalization import PersonalizationService
from .utils.vector_search import VectorSearchService, retrieve_chunks_pgvector


class AIService:
    """
    Main AI Service orchestrating all AI operations.
    
    This service provides a unified interface to all AI capabilities:
    - Content generation (outlines, examples, summaries)
    - Quiz generation
    - Chat and conversational AI
    - Content personalization
    - Embeddings and vector search
    """
    
    def __init__(self):
        # Initialize OpenAI client
        self.client = OpenAIClient()
        
        # Initialize specialized services
        self.content_generator = ContentGenerator(self.client)
        self.quiz_generator = QuizGenerator(self.client)
        self.chat_service = ChatService(self.client)
        # Note: EmbeddingsService removed - Supabase handles embeddings automatically
        self.personalization_service = PersonalizationService(self.client)
        self.vector_search_service = VectorSearchService()
    
    # Content Generation Methods
    def generate_outline(self, content: str) -> Dict:
        """Generate document outline from content"""
        return self.content_generator.generate_outline(content)
    
    def generate_examples(self, content: str, student_profile: Optional[Dict] = None) -> List[Dict]:
        """Generate relevant examples for content"""
        return self.content_generator.generate_examples(content, student_profile)
    
    def generate_brief_summary(self, content: str) -> List[Dict]:
        """Generate brief bullet-point summary"""
        return self.content_generator.generate_brief_summary(content)
    
    def generate_detailed_summary(self, content: str) -> List[Dict]:
        """Generate detailed summary with explanations"""
        return self.content_generator.generate_detailed_summary(content)
    
    def generate_key_points(self, content: str) -> List[Dict]:
        """Generate key learning points"""
        return self.content_generator.generate_key_points(content)
    
    def split_into_sections(self, content: str) -> List[str]:
        """Split long content into logical sections"""
        return self.content_generator.split_into_sections(content)
    
    # Quiz Generation Methods
    def generate_quiz(self, content: str, difficulty: str = 'medium', count: int = 5) -> List[Dict]:
        """Generate quiz questions from content"""
        return self.quiz_generator.generate_quiz(content, difficulty, count)
    
    def generate_adaptive_quiz(self, content: str, student_performance: Dict, count: int = 5) -> List[Dict]:
        """Generate quiz adapted to student's performance level"""
        return self.quiz_generator.generate_adaptive_quiz(content, student_performance, count)
    
    # Chat and Conversation Methods
    def generate_chat_response(self, message: str, user_id: str, context: Dict, 
                             response_queue: Queue) -> None:
        """Generate streaming chat response"""
        return self.chat_service.generate_response(message, user_id, context, response_queue)
    
    def stream_personalized_content(self, prompt: str, system_message: str, 
                                   temperature: float = 0.8) -> Generator[Dict, None, None]:
        """Stream personalized content generation"""
        return self.chat_service.stream_personalized_content(prompt, system_message, temperature)
    
    def generate_contextual_response(self, message: str, context: Dict) -> str:
        """Generate a single contextual response (non-streaming)"""
        return self.chat_service.generate_contextual_response(message, context)
    
    # Personalization Methods
    def personalize_content(self, content: str, profile: Optional[Dict] = None, 
                          style: str = 'adaptive') -> Dict:
        """Personalize content based on user profile"""
        return self.personalization_service.personalize_content(content, profile, style)
    
    def generate_learning_path(self, profile: Dict, topic: str) -> Dict:
        """Generate personalized learning path"""
        return self.personalization_service.generate_learning_path(profile, topic)
    
    # Embeddings and Search Methods
    def generate_embeddings(self, text: str) -> List[float]:
        """Generate embeddings for text using worker-based approach"""
        # Use the new worker-based embedding generation
        from tasks.embedding_generation import generate_query_embedding
        
        # For queries, we want synchronous results
        task = generate_query_embedding.apply(args=[text, True])
        
        if task.successful():
            return task.result
        else:
            logger.error(f"Failed to generate embeddings: {task.info}")
            return []
    
    def generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts efficiently using worker tasks"""
        # Use the worker-based approach for batch processing
        embeddings = []
        for text in texts:
            embedding = self.generate_embeddings(text)
            embeddings.append(embedding)
        return embeddings
    
    def search_similar_content(self, query: str, db_session, **filters) -> List[Dict]:
        """Search for similar content using vector similarity"""
        return self.vector_search_service.search_similar_content(query, db_session, **filters)
    
    def find_related_concepts(self, content: str, db_session, course_id: Optional[str] = None) -> List[Dict]:
        """Find content related to the given concepts"""
        return self.vector_search_service.find_related_concepts(content, db_session, course_id)
    
    # Utility Methods
    def is_available(self) -> bool:
        """Check if AI services are available"""
        return self.client.is_available()
    
    def get_service_status(self) -> Dict:
        """Get status of all AI services"""
        return {
            "openai_available": self.client.is_available(),
            "default_model": self.client.default_model,
            "embedding_model": self.client.embedding_model,
            "services": {
                "content_generation": True,
                "quiz_generation": True,
                "chat_service": True,
                "personalization": True,
                "embeddings": True,
                "vector_search": True
            }
        }


# Backward compatibility function
def retrieve_chunks_pgvector(db_session, query_embedding, course_id=None, file_id=None, 
                           limit=15, similarity_threshold=0.3):
    """Backward compatibility wrapper for vector search"""
    from .utils.vector_search import retrieve_chunks_pgvector as _retrieve_chunks
    return _retrieve_chunks(db_session, query_embedding, course_id, file_id, limit, similarity_threshold)
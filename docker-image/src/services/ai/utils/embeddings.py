"""
Embeddings generation service
"""

from typing import List
from core.exceptions import ExternalServiceError


class EmbeddingsService:
    """Service for generating text embeddings"""
    
    def __init__(self, client):
        self.client = client
    
    def generate_embeddings(self, text: str) -> List[float]:
        """Generate embeddings for text"""
        try:
            response = self.client.create_embeddings(
                model=self.client.embedding_model,
                input=text
            )
            return response.data[0].embedding
            
        except Exception as e:
            raise ExternalServiceError(f"Failed to generate embeddings: {str(e)}")
    
    def generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts efficiently"""
        try:
            # OpenAI allows batch processing
            response = self.client.create_embeddings(
                model=self.client.embedding_model,
                input=texts
            )
            
            return [data.embedding for data in response.data]
            
        except Exception as e:
            # Fallback: process individually
            embeddings = []
            for text in texts:
                try:
                    embedding = self.generate_embeddings(text)
                    embeddings.append(embedding)
                except Exception:
                    # Skip failed embeddings
                    continue
            
            if not embeddings:
                raise ExternalServiceError(f"Failed to generate batch embeddings: {str(e)}")
            
            return embeddings
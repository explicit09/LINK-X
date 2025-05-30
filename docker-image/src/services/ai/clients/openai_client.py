"""
OpenAI client wrapper with circuit breaker protection
"""

import openai
from openai import OpenAI
from typing import Dict, Any, Generator

from core.config import get_config
from core.circuit_breaker import circuit_breaker, CircuitOpenError
from ..base import BaseAIService


class OpenAIClient(BaseAIService):
    """OpenAI client with circuit breaker protection and error handling"""
    
    def __init__(self):
        super().__init__()
        self.config = get_config()
        self._initialize_client()
        
    def _initialize_client(self):
        """Initialize OpenAI client"""
        self.client = OpenAI(api_key=self.config.OPENAI_API_KEY)
        self.default_model = "gpt-4o"
        self.embedding_model = "text-embedding-ada-002"
    
    @circuit_breaker(
        name="openai_chat",
        failure_threshold=3,
        recovery_timeout=30,
        expected_exceptions=(openai.APIError, openai.APIConnectionError, openai.RateLimitError)
    )
    def create_chat_completion(self, **kwargs):
        """Create chat completion with circuit breaker protection"""
        return self.client.chat.completions.create(**kwargs)
    
    @circuit_breaker(
        name="openai_embeddings",
        failure_threshold=3,
        recovery_timeout=30,
        expected_exceptions=(openai.APIError, openai.APIConnectionError, openai.RateLimitError)
    )
    def create_embeddings(self, **kwargs):
        """Create embeddings with circuit breaker protection"""
        return self.client.embeddings.create(**kwargs)
    
    def create_streaming_completion(self, messages: list, temperature: float = 0.7, **kwargs) -> Generator[Dict, None, None]:
        """Create streaming chat completion"""
        try:
            stream = self.client.chat.completions.create(
                model=self.default_model,
                messages=messages,
                temperature=temperature,
                stream=True,
                **kwargs
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield {
                        'type': 'token',
                        'content': chunk.choices[0].delta.content
                    }
            
            yield {'type': 'complete'}
            
        except Exception as e:
            yield {'type': 'error', 'message': str(e)}
    
    def is_available(self) -> bool:
        """Check if OpenAI API is available and configured"""
        return (
            self.config.OPENAI_API_KEY and 
            self.config.OPENAI_API_KEY != "your-openai-api-key-here"
        )
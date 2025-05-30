"""
Base classes for AI services
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Generator


class BaseAIService(ABC):
    """Abstract base class for AI services"""
    
    def __init__(self):
        self.config = None
        self.client = None
    
    @abstractmethod
    def _initialize_client(self):
        """Initialize the AI client"""
        pass


class BaseContentGenerator(ABC):
    """Abstract base class for content generators"""
    
    def __init__(self, client):
        self.client = client
    
    @abstractmethod
    def generate(self, content: str, **kwargs) -> Dict:
        """Generate content based on input"""
        pass


class BaseChatService(ABC):
    """Abstract base class for chat services"""
    
    def __init__(self, client):
        self.client = client
    
    @abstractmethod
    def generate_response(self, message: str, context: Dict, **kwargs) -> Any:
        """Generate chat response"""
        pass
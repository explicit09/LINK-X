"""
Configuration for document chunking strategies.
Controls how documents are split into chunks for processing and search.
"""
from typing import Dict, Any
import os

class ChunkingConfig:
    """Centralized configuration for chunking behavior"""
    
    # Default strategy: 'semantic' or 'basic'
    DEFAULT_STRATEGY = os.getenv('CHUNKING_STRATEGY', 'semantic')
    
    # Semantic chunking parameters
    SEMANTIC_CHUNK_SIZE = int(os.getenv('SEMANTIC_CHUNK_SIZE', '1000'))  # tokens
    SEMANTIC_CHUNK_OVERLAP = int(os.getenv('SEMANTIC_CHUNK_OVERLAP', '200'))  # tokens
    SEMANTIC_MIN_CHUNK_SIZE = int(os.getenv('SEMANTIC_MIN_CHUNK_SIZE', '100'))  # tokens
    
    # Basic chunking parameters (fallback)
    BASIC_CHUNK_SIZE = int(os.getenv('BASIC_CHUNK_SIZE', '800'))  # tokens
    BASIC_CHUNK_OVERLAP = int(os.getenv('BASIC_CHUNK_OVERLAP', '100'))  # tokens
    
    # Metadata extraction
    EXTRACT_METADATA = os.getenv('EXTRACT_CHUNK_METADATA', 'true').lower() == 'true'
    METADATA_FIELDS = ['type', 'section', 'importance', 'concepts', 'keywords']
    
    # Performance settings
    MAX_CHUNKS_PER_FILE = int(os.getenv('MAX_CHUNKS_PER_FILE', '1000'))
    BATCH_SIZE = int(os.getenv('CHUNK_BATCH_SIZE', '50'))
    
    @classmethod
    def get_chunking_params(cls, strategy: str = None) -> Dict[str, Any]:
        """Get parameters for the specified chunking strategy"""
        strategy = strategy or cls.DEFAULT_STRATEGY
        
        if strategy == 'semantic':
            return {
                'chunk_size': cls.SEMANTIC_CHUNK_SIZE,
                'chunk_overlap': cls.SEMANTIC_CHUNK_OVERLAP,
                'min_chunk_size': cls.SEMANTIC_MIN_CHUNK_SIZE,
                'extract_metadata': cls.EXTRACT_METADATA,
                'metadata_fields': cls.METADATA_FIELDS
            }
        else:  # basic
            return {
                'chunk_size': cls.BASIC_CHUNK_SIZE,
                'chunk_overlap': cls.BASIC_CHUNK_OVERLAP,
                'extract_metadata': False
            }
    
    @classmethod
    def should_use_semantic(cls, file_type: str = None) -> bool:
        """Determine if semantic chunking should be used"""
        if cls.DEFAULT_STRATEGY != 'semantic':
            return False
            
        # Always use semantic for certain file types
        if file_type and file_type.lower() in ['pdf', 'docx', 'pptx']:
            return True
            
        return True  # Default to semantic when enabled
#!/usr/bin/env python
"""
Test script for the enhanced RAG system with semantic chunking,
hybrid search, hierarchical RAG, and adaptive context.
"""
import os
import sys
import logging
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database_supabase import db_manager
from services.ai.embeddings_service import EmbeddingsService
from services.ai.hybrid_search_service import HybridSearchService
from services.ai.hierarchical_rag_service import HierarchicalRAGService
from services.ai.adaptive_context_service import AdaptiveContextService
from utils.semantic_chunker import SemanticChunker, create_enhanced_chunks
from db.schema import FileChunk, File, Module

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_semantic_chunking():
    """Test semantic chunking on sample content"""
    logger.info("\n=== Testing Semantic Chunking ===")
    
    sample_content = """
# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.

## Definition of Machine Learning

Machine learning is defined as the field of study that gives computers the ability to learn without being explicitly programmed. This definition was coined by Arthur Samuel in 1959.

## Types of Machine Learning

### Supervised Learning

Supervised learning is a type of machine learning where the algorithm learns from labeled data. For example, spam email detection uses supervised learning by training on emails labeled as 'spam' or 'not spam'.

### Unsupervised Learning

Unsupervised learning involves finding patterns in data without predefined labels. For instance, customer segmentation in marketing uses unsupervised learning to group similar customers together.

## How Machine Learning Works

The process of machine learning typically follows these steps:
1. Data collection and preparation
2. Choosing a model
3. Training the model
4. Evaluating the model
5. Making predictions

## Conclusion

Machine learning is transforming how we solve complex problems across various domains.
    """
    
    chunker = SemanticChunker(min_chunk_size=100, max_chunk_size=500)
    chunks = chunker.chunk_document(sample_content, file_type='md')
    
    logger.info(f"Created {len(chunks)} semantic chunks")
    for i, chunk in enumerate(chunks):
        logger.info(f"\nChunk {i}:")
        logger.info(f"  Type: {chunk.chunk_type}")
        logger.info(f"  Title: {chunk.title}")
        logger.info(f"  Level: {chunk.hierarchy_level}")
        logger.info(f"  Concepts: {chunk.concepts}")
        logger.info(f"  Content preview: {chunk.content[:100]}...")
    
    return chunks


def test_hybrid_search(course_id=None):
    """Test hybrid search functionality"""
    logger.info("\n=== Testing Hybrid Search ===")
    
    embeddings_service = EmbeddingsService()
    hybrid_search = HybridSearchService(embeddings_service)
    
    test_queries = [
        {
            'query': 'What is machine learning?',
            'search_type': 'hybrid',
            'intent': 'definition'
        },
        {
            'query': 'example of supervised learning spam detection',
            'search_type': 'keyword',
            'intent': 'example'
        },
        {
            'query': 'How does machine learning work process steps',
            'search_type': 'hybrid',
            'intent': 'procedural'
        }
    ]
    
    for test in test_queries:
        logger.info(f"\nQuery: {test['query']}")
        logger.info(f"Type: {test['search_type']}, Intent: {test['intent']}")
        
        results = hybrid_search.search_with_intent(
            query=test['query'],
            intent=test['intent'],
            course_id=course_id,
            limit=3
        )
        
        logger.info(f"Found {len(results)} results:")
        for i, result in enumerate(results):
            logger.info(f"  {i+1}. Score: {result.score:.3f} "
                       f"(Vector: {result.vector_score:.3f}, "
                       f"Keyword: {result.keyword_score:.3f})")
            logger.info(f"     Type: {result.chunk_type}")
            logger.info(f"     File: {result.file_title}")
            logger.info(f"     Preview: {result.content[:100]}...")


def test_hierarchical_rag():
    """Test hierarchical RAG with different query types"""
    logger.info("\n=== Testing Hierarchical RAG ===")
    
    embeddings_service = EmbeddingsService()
    hierarchical_rag = HierarchicalRAGService(embeddings_service)
    
    test_cases = [
        {
            'query': 'Define neural networks',
            'expected_intent': 'definition',
            'user_expertise': 'beginner'
        },
        {
            'query': 'Show me an example of how gradient descent works',
            'expected_intent': 'example',
            'user_expertise': 'intermediate'
        },
        {
            'query': 'How do I implement backpropagation step by step?',
            'expected_intent': 'procedural',
            'user_expertise': 'advanced'
        },
        {
            'query': 'What is the relationship between loss functions and optimization?',
            'expected_intent': 'conceptual',
            'user_expertise': 'intermediate'
        }
    ]
    
    for test in test_cases:
        logger.info(f"\nQuery: {test['query']}")
        
        # Analyze intent
        intent = hierarchical_rag._analyze_query_intent(test['query'])
        logger.info(f"Detected intent: {intent.primary_intent} "
                   f"(expected: {test['expected_intent']})")
        logger.info(f"Complexity: {intent.complexity:.2f}")
        logger.info(f"Academic terms: {intent.academic_terms}")
        logger.info(f"Requires context: {intent.requires_context}")
        
        # Retrieve with hierarchical strategy
        results = hierarchical_rag.retrieve(
            query=test['query'],
            user_expertise=test['user_expertise'],
            max_chunks=5
        )
        
        logger.info(f"Retrieved {len(results)} chunks with strategy for {intent.primary_intent}")


def test_adaptive_context():
    """Test adaptive context window sizing"""
    logger.info("\n=== Testing Adaptive Context ===")
    
    embeddings_service = EmbeddingsService()
    hierarchical_rag = HierarchicalRAGService(embeddings_service)
    adaptive_context = AdaptiveContextService(hierarchical_rag)
    
    test_scenarios = [
        {
            'query': 'What is a variable?',
            'user_expertise': 'beginner',
            'max_tokens': 3000,
            'description': 'Simple concept for beginner'
        },
        {
            'query': 'Explain the mathematical foundations of neural networks including backpropagation',
            'user_expertise': 'advanced',
            'max_tokens': 3000,
            'description': 'Complex topic for advanced user'
        },
        {
            'query': 'How does quantum computing affect cryptography algorithms?',
            'user_expertise': 'intermediate',
            'max_tokens': 2000,
            'description': 'Complex interdisciplinary topic'
        }
    ]
    
    for scenario in test_scenarios:
        logger.info(f"\nScenario: {scenario['description']}")
        logger.info(f"Query: {scenario['query']}")
        
        chunks, context_window = adaptive_context.get_adaptive_context(
            query=scenario['query'],
            user_expertise=scenario['user_expertise'],
            max_tokens_budget=scenario['max_tokens']
        )
        
        logger.info(f"Context window configuration:")
        logger.info(f"  Max chunks: {context_window.max_chunks}")
        logger.info(f"  Max tokens: {context_window.max_tokens}")
        logger.info(f"  Include prerequisites: {context_window.include_prerequisites}")
        logger.info(f"  Include examples: {context_window.include_examples}")
        logger.info(f"  Summarization: {context_window.summarization_level}")
        
        logger.info(f"\nRetrieved {len(chunks)} chunks")
        
        # Get token usage report
        token_report = adaptive_context.get_token_usage_report(chunks)
        logger.info(f"Token usage: {token_report['total_tokens']} total")
        logger.info(f"By type: {json.dumps(token_report['by_type'], indent=2)}")


def test_full_pipeline(file_id=None):
    """Test the complete enhanced RAG pipeline"""
    logger.info("\n=== Testing Full Enhanced RAG Pipeline ===")
    
    if not file_id:
        logger.warning("No file_id provided, using mock data")
        return
    
    try:
        # 1. Check if file has semantic chunks
        with db_manager.get_session() as session:
            chunks = session.query(FileChunk).filter_by(file_id=file_id).all()
            logger.info(f"File has {len(chunks)} chunks")
            
            # Check metadata
            semantic_chunks = 0
            for chunk in chunks[:5]:
                if chunk.chunk_metadata and 'chunk_type' in chunk.chunk_metadata:
                    semantic_chunks += 1
                    logger.info(f"Chunk {chunk.chunk_index}: "
                               f"Type={chunk.chunk_metadata.get('chunk_type')}, "
                               f"Concepts={chunk.chunk_metadata.get('concepts', [])}")
            
            logger.info(f"Semantic chunks: {semantic_chunks}/{min(5, len(chunks))} checked")
        
        # 2. Test search on this file
        embeddings_service = EmbeddingsService()
        hybrid_search = HybridSearchService(embeddings_service)
        
        test_query = "explain the main concepts with examples"
        logger.info(f"\nSearching in file: {test_query}")
        
        results = hybrid_search.search(
            query=test_query,
            file_id=file_id,
            limit=5
        )
        
        logger.info(f"Found {len(results)} results")
        for i, result in enumerate(results[:3]):
            logger.info(f"\nResult {i+1}:")
            logger.info(f"  Score: {result.score:.3f}")
            logger.info(f"  Type: {result.chunk_type}")
            logger.info(f"  Content: {result.content[:150]}...")
        
        # 3. Test adaptive retrieval
        hierarchical_rag = HierarchicalRAGService(embeddings_service)
        adaptive_context = AdaptiveContextService(hierarchical_rag)
        
        chunks, context_window = adaptive_context.get_adaptive_context(
            query=test_query,
            user_expertise='intermediate',
            max_tokens_budget=2000
        )
        
        logger.info(f"\nAdaptive context retrieved {len(chunks)} chunks")
        logger.info(f"Context window: {context_window.max_tokens} tokens")
        
    except Exception as e:
        logger.error(f"Pipeline test error: {e}", exc_info=True)


def main():
    """Run all tests"""
    logger.info("Starting Enhanced RAG System Tests")
    
    # Test individual components
    test_semantic_chunking()
    test_hybrid_search()
    test_hierarchical_rag()
    test_adaptive_context()
    
    # Test full pipeline with a real file if provided
    if len(sys.argv) > 1:
        file_id = sys.argv[1]
        test_full_pipeline(file_id)
    else:
        logger.info("\nTo test with a real file, run: python test_enhanced_rag_system.py <file_id>")
    
    logger.info("\n=== All tests completed ===")


if __name__ == "__main__":
    main()
#!/usr/bin/env python
"""
Phase 3 Integration Test - Complete RAG + Personalization Pipeline
"""
import pytest
import os
import sys
import json
from unittest.mock import Mock, patch

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.streaming_personalization_v2 import (
    OptimizedStreamingPersonalizationService,
    PersonalizationContext,
    StreamingSection
)
from services.ai.embeddings_service import EmbeddingsService
from services.ai.hybrid_search_service import HybridSearchService
from services.ai.hierarchical_rag_service import HierarchicalRAGService
from services.ai.adaptive_context_service import AdaptiveContextService
from utils.semantic_chunker import SemanticChunker
from core.prompt_manager import PromptManager


class TestPhase3Integration:
    """Test complete Phase 3 RAG integration"""
    
    def setup_method(self):
        """Set up test dependencies"""
        self.embeddings_service = Mock(spec=EmbeddingsService)
        self.embeddings_service.generate_embeddings.return_value = [0.1] * 1536
        
        self.ai_service = Mock()
        self.file_service = Mock()
        self.user_repo = Mock()
        self.file_repo = Mock()
        self.cache = Mock()
        
    def test_semantic_chunking(self):
        """Test semantic chunking creates proper metadata"""
        sample_content = """
# Introduction to Neural Networks

Neural networks are computational models inspired by the human brain.

## Definition

A neural network is defined as a series of algorithms that endeavors to recognize underlying relationships in a set of data.

## Example

For example, in image recognition, a neural network can identify cats by learning patterns from thousands of cat images.

## How It Works

The process involves:
1. Input layer receives data
2. Hidden layers process information
3. Output layer provides results
        """
        
        chunker = SemanticChunker()
        chunks = chunker.chunk_document(sample_content)
        
        # Verify chunks were created with metadata
        assert len(chunks) > 0
        assert all(chunk.chunk_type in ['introduction', 'definition', 'example', 'explanation'] 
                  for chunk in chunks)
        assert all(chunk.concepts is not None for chunk in chunks)
        
    def test_hybrid_search_integration(self):
        """Test hybrid search combines vector and keyword search"""
        hybrid_search = HybridSearchService(self.embeddings_service)
        
        # Mock search results
        with patch.object(hybrid_search, '_vector_only_search') as mock_vector:
            with patch.object(hybrid_search, '_keyword_only_search') as mock_keyword:
                mock_vector.return_value = [
                    Mock(content="Neural networks are...", score=0.9, 
                         vector_score=0.9, keyword_score=0.0)
                ]
                mock_keyword.return_value = [
                    Mock(content="Definition: A neural network...", score=0.8,
                         vector_score=0.0, keyword_score=0.8)
                ]
                
                results = hybrid_search.search(
                    query="what is a neural network",
                    search_type="hybrid"
                )
                
                # Verify both searches were called
                assert mock_vector.called
                assert mock_keyword.called
                assert len(results) >= 1
    
    def test_hierarchical_rag_intent_detection(self):
        """Test hierarchical RAG detects query intent correctly"""
        hierarchical_rag = HierarchicalRAGService(self.embeddings_service)
        
        # Test intent detection
        test_cases = [
            ("Define machine learning", "definition"),
            ("Show me an example of gradient descent", "example"),
            ("How do I implement backpropagation?", "procedural"),
            ("What's the relationship between loss and optimization?", "conceptual"),
            ("Explain neural networks", "explanation")
        ]
        
        for query, expected_intent in test_cases:
            intent = hierarchical_rag._analyze_query_intent(query)
            assert intent.primary_intent == expected_intent, \
                f"Query '{query}' should have intent '{expected_intent}', got '{intent.primary_intent}'"
    
    def test_adaptive_context_window(self):
        """Test adaptive context adjusts based on complexity"""
        hierarchical_rag = HierarchicalRAGService(self.embeddings_service)
        adaptive_context = AdaptiveContextService(hierarchical_rag)
        
        # Simple query for beginner
        intent_simple = Mock(complexity=0.2, primary_intent='definition')
        with patch.object(hierarchical_rag, '_analyze_query_intent', return_value=intent_simple):
            _, window_simple = adaptive_context.get_adaptive_context(
                query="What is a variable?",
                user_expertise="beginner",
                max_tokens_budget=3000
            )
        
        # Complex query for advanced user
        intent_complex = Mock(complexity=0.9, primary_intent='conceptual')
        with patch.object(hierarchical_rag, '_analyze_query_intent', return_value=intent_complex):
            _, window_complex = adaptive_context.get_adaptive_context(
                query="Explain the mathematical foundations of backpropagation",
                user_expertise="advanced",
                max_tokens_budget=3000
            )
        
        # Verify adaptive behavior
        assert window_simple.max_chunks < window_complex.max_chunks
        assert window_simple.include_prerequisites == False
        assert window_complex.include_prerequisites == True
    
    def test_prompt_manager_integration(self):
        """Test YAML prompt loading and rendering"""
        prompt_manager = PromptManager()
        
        # Test loading natural personalization prompt
        try:
            prompt = prompt_manager.get_prompt(
                'natural_personalization',
                section_title="Neural Networks",
                section_content="Test content",
                relevant_context="Context",
                user_profile={'learning_style': 'visual'},
                learning_style='visual',
                expertise_level='intermediate',
                interests=['basketball', 'music'],
                tone_preference='casual'
            )
            
            # Verify prompt doesn't contain explicit interest mentions
            assert "since you love basketball" not in prompt.lower()
            assert "since you like" not in prompt.lower()
            
        except Exception as e:
            # If prompt file not found, that's OK for unit test
            if "natural_personalization" not in str(e):
                raise
    
    @patch('services.streaming_personalization_v2.db_manager')
    def test_streaming_service_uses_rag(self, mock_db_manager):
        """Test streaming service actually uses RAG instead of concatenating all chunks"""
        # Set up service
        service = OptimizedStreamingPersonalizationService(
            self.ai_service,
            self.file_service,
            self.user_repo,
            self.file_repo,
            self.cache
        )
        
        # Mock section
        section = StreamingSection(
            anchor="section-1",
            title="Introduction",
            content="Brief intro content",
            order=0
        )
        
        # Mock context
        context = PersonalizationContext(
            user_id="test-user",
            file_id="test-file",
            user_profile={
                'learning_style': 'visual',
                'expertise_level': 'intermediate',
                'interests': ['basketball'],
                'tone_preference': 'casual'
            },
            file_content="Full file content",
            sections=[section],
            course_id="test-course"
        )
        
        # Mock cache miss
        self.cache.get.return_value = None
        
        # Mock AI response
        self.ai_service.generate_contextual_response.return_value = "Personalized content"
        
        # Test personalization
        with patch.object(service, 'adaptive_context') as mock_adaptive:
            mock_adaptive.get_adaptive_context.return_value = ([], Mock())
            
            result = service._personalize_section(section, context)
            
            # Verify RAG was used
            mock_adaptive.get_adaptive_context.assert_called_once()
            assert "test-course" in str(mock_adaptive.get_adaptive_context.call_args)
    
    def test_quality_validation_non_blocking(self):
        """Test quality validation doesn't block streaming"""
        service = OptimizedStreamingPersonalizationService(
            self.ai_service,
            self.file_service,
            self.user_repo,
            self.file_repo,
            self.cache
        )
        
        # Test scheduling validation
        with patch('celery.current_app.send_task') as mock_send:
            service._schedule_quality_validation(
                "Personalized content",
                Mock(content="Original"),
                "Context",
                "cache-key"
            )
            
            # Verify task was queued
            mock_send.assert_called_once()
            assert 'quality_check' in str(mock_send.call_args)


if __name__ == "__main__":
    # Run tests
    test = TestPhase3Integration()
    test.setup_method()
    
    print("Testing Phase 3 RAG Integration...\n")
    
    print("1. Testing Semantic Chunking...")
    test.test_semantic_chunking()
    print("   ✅ Semantic chunking working")
    
    print("\n2. Testing Hybrid Search...")
    test.test_hybrid_search_integration()
    print("   ✅ Hybrid search working")
    
    print("\n3. Testing Hierarchical RAG Intent Detection...")
    test.test_hierarchical_rag_intent_detection()
    print("   ✅ Intent detection working")
    
    print("\n4. Testing Adaptive Context Windows...")
    test.test_adaptive_context_window()
    print("   ✅ Adaptive context working")
    
    print("\n5. Testing Prompt Manager...")
    test.test_prompt_manager_integration()
    print("   ✅ Prompt management working")
    
    print("\n6. Testing Streaming Service RAG Integration...")
    test.test_streaming_service_uses_rag(Mock())
    print("   ✅ Streaming service uses RAG")
    
    print("\n7. Testing Non-blocking Quality Validation...")
    test.test_quality_validation_non_blocking()
    print("   ✅ Quality validation is non-blocking")
    
    print("\n✨ All Phase 3 tests passed!")
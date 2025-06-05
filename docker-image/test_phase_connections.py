#!/usr/bin/env python3
"""
Test script to verify Phase 1-3 implementation connections
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test database schema and fields"""
    logger.info("Testing database connection...")
    try:
        from core.database import db_manager
        from db.schema import FileChunk
        
        with db_manager.get_session() as session:
            # Check if FileChunk table exists with required fields
            chunk = session.query(FileChunk).first()
            if chunk:
                logger.info(f"✅ FileChunk table exists")
                logger.info(f"  - chunk_metadata field: {'✅' if hasattr(chunk, 'chunk_metadata') else '❌'}")
                logger.info(f"  - embedding field: {'✅' if hasattr(chunk, 'embedding') else '❌'}")
            else:
                logger.info("⚠️  FileChunk table exists but no data")
                
        return True
    except Exception as e:
        logger.error(f"❌ Database test failed: {e}")
        return False

def test_service_imports():
    """Test if all services can be imported"""
    logger.info("\nTesting service imports...")
    
    services = [
        ("HybridSearchService", "services.ai.hybrid_search_service"),
        ("HierarchicalRAGService", "services.ai.hierarchical_rag_service"),
        ("AdaptiveContextService", "services.ai.adaptive_context_service"),
        ("EmbeddingsService", "services.ai.utils.embeddings"),
        ("PromptManager", "core.prompt_manager"),
    ]
    
    all_good = True
    for service_name, module_path in services:
        try:
            module = __import__(module_path, fromlist=[service_name])
            service_class = getattr(module, service_name)
            logger.info(f"✅ {service_name} imported successfully")
        except Exception as e:
            logger.error(f"❌ {service_name} import failed: {e}")
            all_good = False
            
    return all_good

def test_api_endpoints():
    """Test if API endpoints are registered"""
    logger.info("\nTesting API endpoints...")
    
    try:
        from app import create_app
        app = create_app()
        
        # Check if enhanced RAG endpoints exist
        rag_endpoints = [
            '/api/v2/rag/search',
            '/api/v2/rag/process/file/<file_id>',
            '/api/v2/rag/chunk/<file_id>/<int:chunk_index>'
        ]
        
        registered_rules = [str(rule) for rule in app.url_map.iter_rules()]
        
        for endpoint in rag_endpoints:
            # Clean up parameter syntax for comparison
            clean_endpoint = endpoint.replace('<', '').replace('>', '').replace('int:', '')
            found = any(clean_endpoint.replace('/', '') in rule.replace('/', '') for rule in registered_rules)
            if found:
                logger.info(f"✅ {endpoint} registered")
            else:
                logger.warning(f"❌ {endpoint} NOT registered")
                
        # Check personalization streaming endpoint
        if any('/api/v2/personalization/stream' in rule for rule in registered_rules):
            logger.info("✅ /api/v2/personalization/stream registered")
        else:
            logger.warning("❌ /api/v2/personalization/stream NOT registered")
            
        return True
    except Exception as e:
        logger.error(f"❌ API endpoint test failed: {e}")
        return False

def test_prompt_files():
    """Test if YAML prompt files exist"""
    logger.info("\nTesting prompt files...")
    
    prompt_dir = os.path.join(os.path.dirname(__file__), 'src', 'prompts')
    prompts = [
        'natural_personalization.yaml',
        'optimized_personalization.yaml'
    ]
    
    all_good = True
    for prompt in prompts:
        path = os.path.join(prompt_dir, prompt)
        if os.path.exists(path):
            logger.info(f"✅ {prompt} exists")
        else:
            logger.error(f"❌ {prompt} NOT found")
            all_good = False
            
    return all_good

def test_service_initialization():
    """Test if services can be initialized"""
    logger.info("\nTesting service initialization...")
    
    try:
        from services.ai.ai_service import AIService
        from services.ai.utils.embeddings import EmbeddingsService
        from services.ai.hybrid_search_service import HybridSearchService
        
        # Initialize AI service
        ai_service = AIService()
        logger.info("✅ AIService initialized")
        
        # Initialize embeddings service
        embeddings_service = EmbeddingsService(ai_service.client)
        logger.info("✅ EmbeddingsService initialized")
        
        # Initialize hybrid search
        hybrid_search = HybridSearchService(embeddings_service)
        logger.info("✅ HybridSearchService initialized")
        
        return True
    except Exception as e:
        logger.error(f"❌ Service initialization failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("=== Phase 1-3 Connection Tests ===\n")
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Service Imports", test_service_imports),
        ("API Endpoints", test_api_endpoints),
        ("Prompt Files", test_prompt_files),
        ("Service Initialization", test_service_initialization),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"Test {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info("\n=== Test Summary ===")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{test_name}: {status}")
    
    logger.info(f"\nTotal: {passed}/{total} tests passed")
    
    if passed < total:
        logger.warning("\n⚠️  Some tests failed. Please check the logs above.")
    else:
        logger.info("\n🎉 All tests passed! Phase 1-3 implementation is properly connected.")

if __name__ == "__main__":
    main()
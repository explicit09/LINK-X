#!/usr/bin/env python
"""
Verify all Phase 1-3 connections are working correctly.
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_database_schema():
    """Verify database tables and fields exist"""
    logger.info("\n=== Checking Database Schema ===")
    
    try:
        from core.database import db_manager
        from db.schema import FileChunk, File, Course, Module
        
        with db_manager.get_session() as session:
            # Check FileChunk table
            chunk = session.query(FileChunk).first()
            if chunk:
                logger.info("✅ FileChunk table exists")
                logger.info(f"   - Has embedding: {hasattr(chunk, 'embedding')}")
                logger.info(f"   - Has chunk_metadata: {hasattr(chunk, 'chunk_metadata')}")
                logger.info(f"   - Has course_id: {hasattr(chunk, 'course_id')}")
            else:
                logger.warning("⚠️  No FileChunks found in database")
            
            # Check relationships
            file_with_module = session.query(File).filter(
                File.module_id.isnot(None)
            ).first()
            
            if file_with_module and file_with_module.module_id:
                module = session.query(Module).filter_by(
                    id=file_with_module.module_id
                ).first()
                if module and module.course_id:
                    logger.info("✅ File -> Module -> Course relationships working")
                else:
                    logger.warning("⚠️  Module -> Course relationship issue")
            else:
                logger.warning("⚠️  No files with module relationships found")
                
    except Exception as e:
        logger.error(f"❌ Database check failed: {e}")
        return False
    
    return True

def check_api_endpoints():
    """Verify API endpoints are registered"""
    logger.info("\n=== Checking API Endpoints ===")
    
    try:
        from app import create_app
        app = create_app()
        
        # Check for our new endpoints
        expected_endpoints = [
            '/api/v2/rag/search',
            '/api/v2/rag/process/file/<file_id>',
            '/api/v2/rag/chunk/<file_id>/<int:chunk_index>',
            '/api/v2/personalization/stream',
            '/api/v2/personalization/outline'
        ]
        
        registered = []
        for rule in app.url_map.iter_rules():
            registered.append(str(rule))
        
        for endpoint in expected_endpoints:
            # Normalize endpoint for comparison
            normalized = endpoint.replace('<file_id>', '<string:file_id>')
            normalized = normalized.replace('<int:chunk_index>', '<int:chunk_index>')
            
            found = any(normalized in rule for rule in registered)
            status = "✅" if found else "❌"
            logger.info(f"{status} {endpoint}")
            
    except Exception as e:
        logger.error(f"❌ API endpoint check failed: {e}")
        return False
    
    return True

def check_service_imports():
    """Verify services can be imported and initialized"""
    logger.info("\n=== Checking Service Imports ===")
    
    services_to_check = [
        ('services.ai.embeddings_service', 'EmbeddingsService'),
        ('services.ai.hybrid_search_service', 'HybridSearchService'),
        ('services.ai.hierarchical_rag_service', 'HierarchicalRAGService'),
        ('services.ai.adaptive_context_service', 'AdaptiveContextService'),
        ('services.streaming_personalization_v2', 'OptimizedStreamingPersonalizationService'),
        ('utils.semantic_chunker', 'SemanticChunker'),
        ('core.prompt_manager', 'PromptManager')
    ]
    
    all_good = True
    for module_path, class_name in services_to_check:
        try:
            module = __import__(module_path, fromlist=[class_name])
            cls = getattr(module, class_name)
            logger.info(f"✅ {module_path}.{class_name}")
        except Exception as e:
            logger.error(f"❌ {module_path}.{class_name}: {e}")
            all_good = False
    
    return all_good

def check_frontend_api_calls():
    """Check if frontend API client has the new methods"""
    logger.info("\n=== Checking Frontend API Integration ===")
    
    frontend_api_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        'frontend', 'lib', 'api', 'streaming.ts'
    )
    
    if os.path.exists(frontend_api_path):
        with open(frontend_api_path, 'r') as f:
            content = f.read()
        
        # Check for key API calls
        checks = [
            ('/api/v2/personalization/stream', 'Streaming endpoint'),
            ('/api/v2/personalization/outline', 'Outline endpoint')
        ]
        
        for endpoint, description in checks:
            if endpoint in content:
                logger.info(f"✅ {description}: {endpoint}")
            else:
                logger.warning(f"⚠️  {description} not found")
    else:
        logger.warning("⚠️  Frontend API file not found")
    
    # Check for RAG search in frontend (should be added)
    rag_search_found = False
    frontend_lib_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        'frontend', 'lib', 'api'
    )
    
    for file in os.listdir(frontend_lib_path):
        if file.endswith('.ts'):
            with open(os.path.join(frontend_lib_path, file), 'r') as f:
                if '/api/v2/rag/search' in f.read():
                    rag_search_found = True
                    break
    
    if rag_search_found:
        logger.info("✅ RAG search endpoint found in frontend")
    else:
        logger.warning("⚠️  RAG search endpoint NOT found in frontend - needs to be added")

def check_yaml_prompts():
    """Verify YAML prompts are accessible"""
    logger.info("\n=== Checking YAML Prompts ===")
    
    prompts_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'prompts'
    )
    
    expected_prompts = [
        'natural_personalization.yaml',
        'optimized_personalization.yaml',
        'system/01_system.yaml'
    ]
    
    for prompt_file in expected_prompts:
        path = os.path.join(prompts_dir, prompt_file)
        if os.path.exists(path):
            logger.info(f"✅ {prompt_file}")
            
            # Check for forbidden patterns in personalization prompts
            if 'personalization' in prompt_file:
                with open(path, 'r') as f:
                    content = f.read()
                    if 'FORBIDDEN' in content and 'Since you love' in content:
                        logger.info(f"   ✓ Has authentic personalization rules")
        else:
            logger.warning(f"❌ {prompt_file} not found")

def check_embeddings_service():
    """Verify embeddings service location and initialization"""
    logger.info("\n=== Checking Embeddings Service ===")
    
    # Check which embeddings service exists
    possible_paths = [
        'services/ai/embeddings_service.py',
        'services/embeddings_service.py',
        'utils/embeddings.py'
    ]
    
    src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    for path in possible_paths:
        full_path = os.path.join(src_dir, path)
        if os.path.exists(full_path):
            logger.info(f"✅ Found embeddings service at: {path}")
            
            # Check if it has the expected class
            with open(full_path, 'r') as f:
                content = f.read()
                if 'class EmbeddingsService' in content:
                    logger.info(f"   ✓ Contains EmbeddingsService class")
                    break
    else:
        logger.error("❌ No embeddings service found!")

def main():
    """Run all connection checks"""
    load_dotenv()
    
    logger.info("Phase 1-3 Connection Verification")
    logger.info("=" * 50)
    
    checks = [
        ("Database Schema", check_database_schema),
        ("API Endpoints", check_api_endpoints),
        ("Service Imports", check_service_imports),
        ("Frontend Integration", check_frontend_api_calls),
        ("YAML Prompts", check_yaml_prompts),
        ("Embeddings Service", check_embeddings_service)
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            logger.error(f"\n{name} check failed with error: {e}")
            results[name] = False
    
    # Summary
    logger.info("\n" + "=" * 50)
    logger.info("Summary:")
    
    all_passed = True
    for name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info(f"{status} - {name}")
        if not passed:
            all_passed = False
    
    if all_passed:
        logger.info("\n🎉 All connection checks passed!")
    else:
        logger.info("\n⚠️  Some issues need attention")
    
    # Recommendations
    logger.info("\nRecommendations:")
    logger.info("1. Add RAG search methods to frontend API client")
    logger.info("2. Run semantic reprocessing to add metadata to chunks")
    logger.info("3. Test end-to-end flow from frontend to backend")
    logger.info("4. Add integration tests for the complete pipeline")

if __name__ == "__main__":
    main()
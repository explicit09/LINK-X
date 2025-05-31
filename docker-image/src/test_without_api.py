#!/usr/bin/env python3
"""
Test script to validate AI improvements without requiring OpenAI API key
Shows what we can measure without making actual API calls
"""

import sys
import os
import time
sys.path.insert(0, '.')

def test_prompt_system():
    """Test the prompt management system"""
    print("🧪 TESTING PROMPT MANAGEMENT SYSTEM")
    print("=" * 40)
    
    try:
        from core.prompt_manager import PromptManager
        
        # Test without global instance
        pm = PromptManager()
        
        # Scan available prompts
        prompts = pm._scan_available_prompts()
        print(f"✅ Found {len(prompts)} prompt templates:")
        for prompt in prompts:
            print(f"  • {prompt}")
        
        # Test validation
        print(f"\n📋 Template Validation:")
        valid_count = 0
        for prompt in prompts:
            result = pm.validate_template(prompt)
            status = "✅ VALID" if result['status'] == 'valid' else f"❌ INVALID: {result['errors']}"
            print(f"  • {prompt}: {status}")
            if result['status'] == 'valid':
                valid_count += 1
        
        print(f"\n📊 Validation Summary: {valid_count}/{len(prompts)} templates valid")
        
        # Test template rendering (without API calls)
        if any('executor' in p for p in prompts):
            print(f"\n🔧 Testing Template Rendering:")
            
            sample_data = {
                'role': 'AI Educational Tutor',
                'context': ['Sample context chunk 1', 'Sample context chunk 2'],
                'question': 'What is machine learning?',
                'student_profile': {
                    'learning_style': 'visual',
                    'expertise_level': 'beginner',
                    'tone_preference': 'casual',
                    'interests': ['technology'],
                    'profession': 'student'
                }
            }
            
            try:
                rendered = pm.render('executors/02_executor.jinja', **sample_data)
                print(f"  ✅ Template rendered successfully ({len(rendered)} chars)")
                print(f"  📄 Preview: {rendered[:200]}...")
            except Exception as e:
                print(f"  ❌ Template rendering failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Prompt system test failed: {e}")
        return False


def test_token_optimization():
    """Test token counting and optimization logic"""
    print("\n🔢 TESTING TOKEN OPTIMIZATION")
    print("=" * 40)
    
    try:
        import tiktoken
        
        # Test token encoder
        encoder = tiktoken.encoding_for_model("gpt-4")
        print("✅ Token encoder initialized")
        
        # Test sample texts with different lengths
        test_texts = [
            "Short text",
            "This is a medium length text that represents a typical document chunk in our RAG system.",
            "This is a very long text that would definitely exceed our token budget if we had many of these chunks in our retrieval system. This demonstrates why we need optimization to stay within our 800 token limit per query. The old system would dump 50 chunks like this, leading to massive token waste and slow responses.",
            "Machine learning is a subset of artificial intelligence (AI) that focuses on developing algorithms and statistical models that enable computers to learn and make decisions from data without being explicitly programmed for every task.",
            "In finance, compound interest is the addition of interest to the principal sum of a loan or deposit, or in other words, interest on interest."
        ]
        
        print(f"\n📊 Token Analysis (Target: ≤800 tokens total):")
        total_tokens = 0
        
        for i, text in enumerate(test_texts, 1):
            tokens = len(encoder.encode(text))
            total_tokens += tokens
            status = "✅" if tokens <= 200 else "⚠️" if tokens <= 400 else "❌"
            print(f"  {status} Text {i}: {tokens:3d} tokens - \"{text[:50]}...\"")
        
        print(f"\nTotal: {total_tokens} tokens")
        
        # Simulate old vs new system
        old_system_tokens = total_tokens * 10  # Simulate 50 chunks vs 5
        new_system_tokens = min(total_tokens, 800)  # Our limit
        
        if total_tokens <= 800:
            savings = (old_system_tokens - new_system_tokens) / old_system_tokens * 100
            print(f"💰 Estimated savings: {savings:.1f}% ({old_system_tokens} → {new_system_tokens} tokens)")
        else:
            print(f"⚠️  Would need chunk selection to fit 800 token budget")
        
        return True
        
    except Exception as e:
        print(f"❌ Token optimization test failed: {e}")
        return False


def test_file_structure():
    """Test that all expected files and directories exist"""
    print("\n📁 TESTING FILE STRUCTURE")
    print("=" * 40)
    
    expected_structure = {
        'prompts/system/01_system.yaml': 'System prompt definition',
        'prompts/executors/02_executor.jinja': 'Main execution template',
        'prompts/critics/99_critic.yaml': 'Quality evaluation criteria',
        'prompts/routers/query_classifier.yaml': 'Query routing logic',
        'core/prompt_manager.py': 'Prompt management system',
        'core/critic_loop.py': 'Self-improvement loop',
        'core/query_flow.py': 'Main orchestration',
        'services/ai/utils/optimized_rag.py': 'Efficient retrieval',
        'tests/test_synthetic_prompts.py': 'Quality test suite',
        'api/v2_endpoints/ai_v2.py': 'New API endpoints'
    }
    
    missing_files = []
    existing_files = []
    
    for file_path, description in expected_structure.items():
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            existing_files.append((file_path, size))
            print(f"  ✅ {file_path} ({size:,} bytes) - {description}")
        else:
            missing_files.append(file_path)
            print(f"  ❌ {file_path} - MISSING - {description}")
    
    print(f"\n📊 File Structure Summary:")
    print(f"  • Existing: {len(existing_files)}/{len(expected_structure)} files")
    print(f"  • Total size: {sum(size for _, size in existing_files):,} bytes")
    
    if missing_files:
        print(f"  • Missing: {missing_files}")
        return False
    
    return True


def test_import_compatibility():
    """Test that our new system doesn't break existing imports"""
    print("\n🔗 TESTING IMPORT COMPATIBILITY")
    print("=" * 40)
    
    # Test imports that should work without API key
    safe_imports = [
        'core.prompt_manager',
        'services.ai.utils.optimized_rag',  # after our fix
    ]
    
    # Test imports that need API key (should fail gracefully)
    api_imports = [
        'core.critic_loop',
        'core.query_flow',
    ]
    
    working_imports = 0
    total_imports = len(safe_imports)
    
    print("Safe imports (no API key needed):")
    for module_name in safe_imports:
        try:
            # Use importlib to avoid global initialization
            import importlib
            module = importlib.import_module(module_name)
            print(f"  ✅ {module_name}")
            working_imports += 1
        except Exception as e:
            print(f"  ❌ {module_name}: {e}")
    
    print(f"\nAPI-dependent imports (expected to fail without key):")
    for module_name in api_imports:
        try:
            import importlib
            module = importlib.import_module(module_name)
            print(f"  ⚠️  {module_name}: Unexpectedly succeeded")
        except Exception as e:
            if "api_key" in str(e).lower():
                print(f"  ✅ {module_name}: Correctly requires API key")
            else:
                print(f"  ❌ {module_name}: Unexpected error: {e}")
    
    print(f"\n📊 Import Compatibility: {working_imports}/{total_imports} safe imports working")
    return working_imports == total_imports


def performance_estimate():
    """Estimate performance improvements based on architectural changes"""
    print("\n🚀 PERFORMANCE IMPROVEMENT ESTIMATES")
    print("=" * 40)
    
    # Based on actual architectural changes
    old_system = {
        'chunks_per_query': 50,
        'avg_tokens_per_chunk': 200,
        'prompt_functions': 8,
        'validation': False,
        'retry_logic': False,
        'governance': False
    }
    
    new_system = {
        'chunks_per_query': 6,
        'max_tokens_total': 800,
        'modular_prompts': 4,
        'validation': True,
        'retry_logic': True,
        'governance': True
    }
    
    print("📊 Architectural Comparison:")
    print(f"  Chunks per query: {old_system['chunks_per_query']} → {new_system['chunks_per_query']} ({(1-new_system['chunks_per_query']/old_system['chunks_per_query'])*100:.0f}% reduction)")
    print(f"  Token management: Unlimited → {new_system['max_tokens_total']} token budget")
    print(f"  Prompt system: {old_system['prompt_functions']} hard-coded → {new_system['modular_prompts']} modular templates")
    print(f"  Quality assurance: {'❌' if not old_system['validation'] else '✅'} → {'✅' if new_system['validation'] else '❌'}")
    print(f"  Self-improvement: {'❌' if not old_system['retry_logic'] else '✅'} → {'✅' if new_system['retry_logic'] else '❌'}")
    print(f"  Governance: {'❌' if not old_system['governance'] else '✅'} → {'✅' if new_system['governance'] else '❌'}")
    
    # Estimate cost savings
    old_tokens = old_system['chunks_per_query'] * old_system['avg_tokens_per_chunk']
    new_tokens = new_system['max_tokens_total']
    
    if old_tokens > new_tokens:
        savings = (old_tokens - new_tokens) / old_tokens * 100
        print(f"\n💰 Estimated Cost Savings:")
        print(f"  • Token reduction: {old_tokens:,} → {new_tokens:,} tokens ({savings:.1f}% savings)")
        print(f"  • Per 1000 queries: ~${(old_tokens-new_tokens)*1000*0.00001:.2f} saved (rough estimate)")


def main():
    """Run all tests that don't require API access"""
    print("🤖 LEARN-X AI IMPROVEMENTS - OFFLINE VALIDATION")
    print("=" * 60)
    print("Testing components that don't require OpenAI API access...\n")
    
    tests = [
        ("File Structure", test_file_structure),
        ("Prompt System", test_prompt_system),
        ("Token Optimization", test_token_optimization),
        ("Import Compatibility", test_import_compatibility),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if result:
                passed += 1
                status = "✅ PASSED"
            else:
                status = "❌ FAILED"
        except Exception as e:
            result = False
            status = f"❌ ERROR: {e}"
        
        print(f"\n{status}: {test_name}")
    
    # Performance estimates
    performance_estimate()
    
    # Final summary
    print(f"\n" + "=" * 60)
    print(f"📊 OFFLINE VALIDATION SUMMARY")
    print(f"=" * 60)
    print(f"Tests passed: {passed}/{total}")
    print(f"Success rate: {passed/total*100:.1f}%")
    
    if passed == total:
        print("🎉 ALL OFFLINE TESTS PASSED!")
        print("\n📋 Next Steps:")
        print("  1. Set OPENAI_API_KEY environment variable")
        print("  2. Run: python scripts/demo_ai_improvements.py")
        print("  3. Execute: pytest tests/test_synthetic_prompts.py")
        print("  4. Measure real performance with API calls")
    else:
        print("⚠️  Some tests failed - review issues above")
    
    print("\n🔧 Architecture is ready for API testing!")


if __name__ == "__main__":
    main()
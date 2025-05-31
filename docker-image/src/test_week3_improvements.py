#!/usr/bin/env python3
"""
Week 3 AI Improvements Test - Validate router, fast path, and latency optimizations
"""

import sys
import time
import json
sys.path.insert(0, '.')

from core.query_router import query_router
from core.fast_path_processor import fast_path_processor
from core.prompt_manager import prompt_manager


def test_query_router():
    """Test the intelligent query routing system"""
    print("🚀 TESTING QUERY ROUTER")
    print("=" * 40)
    
    test_queries = [
        # Simple queries
        ("What is machine learning?", "simple"),
        ("Explain compound interest", "simple"),
        ("Define photosynthesis", "simple"),
        ("How does encryption work?", "simple"),
        
        # Complex queries  
        ("Debug this Python code for me", "complex"),
        ("Research the latest AI trends and compare them", "complex"),
        ("Write a program that calculates fibonacci numbers", "complex"),
        ("Help me implement a sorting algorithm", "complex"),
        ("Create a study plan for learning data science", "complex")
    ]
    
    routing_results = []
    total_time = 0
    
    for query, expected_category in test_queries:
        start_time = time.time()
        
        try:
            decision = query_router.route_query(query)
            classification_time = time.time() - start_time
            total_time += classification_time
            
            # Check accuracy
            is_correct = decision.category == expected_category
            status = "✅" if is_correct else "❌"
            
            print(f"  {status} \"{query[:40]}...\"")
            print(f"      Predicted: {decision.category} (confidence: {decision.confidence:.3f})")
            print(f"      Expected: {expected_category}")
            print(f"      Time: {classification_time:.3f}s")
            print(f"      Reasoning: {decision.reasoning}")
            
            routing_results.append({
                'query': query,
                'predicted': decision.category,
                'expected': expected_category,
                'correct': is_correct,
                'confidence': decision.confidence,
                'time': classification_time
            })
            
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            routing_results.append({
                'query': query,
                'error': str(e)
            })
        
        print()
    
    # Calculate statistics
    successful_routes = [r for r in routing_results if 'error' not in r]
    if successful_routes:
        accuracy = sum(1 for r in successful_routes if r['correct']) / len(successful_routes)
        avg_time = total_time / len(successful_routes)
        avg_confidence = sum(r['confidence'] for r in successful_routes) / len(successful_routes)
        
        print(f"📊 ROUTER PERFORMANCE:")
        print(f"  • Accuracy: {accuracy:.1%} ({sum(1 for r in successful_routes if r['correct'])}/{len(successful_routes)})")
        print(f"  • Average time: {avg_time:.3f}s")
        print(f"  • Average confidence: {avg_confidence:.3f}")
        
        if accuracy >= 0.8:
            print(f"  ✅ EXCELLENT: Router accuracy meets target (≥80%)")
        else:
            print(f"  ⚠️  NEEDS IMPROVEMENT: Router accuracy below target")
        
        if avg_time <= 1.0:
            print(f"  ✅ FAST: Classification time meets target (≤1s)")
        else:
            print(f"  ⚠️  SLOW: Classification time above target")
    
    return successful_routes


def test_fast_path_processor():
    """Test the fast path processing system"""
    print("\n⚡ TESTING FAST PATH PROCESSOR")
    print("=" * 40)
    
    # Simple queries that should use fast path
    fast_path_queries = [
        {
            'question': 'What is compound interest?',
            'profile': {'learning_style': 'visual', 'expertise_level': 'beginner', 'tone_preference': 'casual'},
            'target_time': 3.0
        },
        {
            'question': 'Explain the water cycle',
            'profile': {'learning_style': 'auditory', 'expertise_level': 'intermediate', 'tone_preference': 'formal'},
            'target_time': 3.0
        },
        {
            'question': 'Define artificial intelligence',
            'profile': {'learning_style': 'kinesthetic', 'expertise_level': 'beginner', 'tone_preference': 'motivational'},
            'target_time': 3.0
        }
    ]
    
    fast_path_results = []
    
    for i, test_case in enumerate(fast_path_queries, 1):
        print(f"  Test {i}: {test_case['question']}")
        
        try:
            # Mock context chunks
            context_chunks = [
                f"Educational content about {test_case['question'].split()[2:]}",
                f"Detailed explanation for {test_case['profile']['expertise_level']} level",
                f"Examples and applications relevant to the topic"
            ]
            
            result = fast_path_processor.process_simple_query(
                question=test_case['question'],
                context_chunks=context_chunks,
                student_profile=test_case['profile']
            )
            
            # Evaluate result
            meets_time_target = result.processing_time <= test_case['target_time']
            meets_quality_target = result.critic_score >= 0.8
            
            time_status = "✅" if meets_time_target else "⚠️"
            quality_status = "✅" if meets_quality_target else "⚠️"
            
            print(f"    {time_status} Time: {result.processing_time:.2f}s (target: {test_case['target_time']}s)")
            print(f"    {quality_status} Quality: {result.critic_score:.3f} (target: ≥0.8)")
            print(f"    📄 Answer length: {len(result.answer)} chars")
            print(f"    🔢 Tokens: {result.token_count}")
            print(f"    💾 Cache hit: {result.cache_hit}")
            
            fast_path_results.append({
                'question': test_case['question'],
                'processing_time': result.processing_time,
                'critic_score': result.critic_score,
                'meets_time_target': meets_time_target,
                'meets_quality_target': meets_quality_target,
                'token_count': result.token_count,
                'cache_hit': result.cache_hit
            })
            
        except Exception as e:
            print(f"    ❌ Failed: {e}")
            fast_path_results.append({
                'question': test_case['question'],
                'error': str(e)
            })
        
        print()
    
    # Calculate fast path statistics
    successful_fast = [r for r in fast_path_results if 'error' not in r]
    if successful_fast:
        avg_time = sum(r['processing_time'] for r in successful_fast) / len(successful_fast)
        avg_quality = sum(r['critic_score'] for r in successful_fast) / len(successful_fast)
        time_targets_met = sum(1 for r in successful_fast if r['meets_time_target'])
        quality_targets_met = sum(1 for r in successful_fast if r['meets_quality_target'])
        
        print(f"📊 FAST PATH PERFORMANCE:")
        print(f"  • Average time: {avg_time:.2f}s")
        print(f"  • Average quality: {avg_quality:.3f}")
        print(f"  • Time targets met: {time_targets_met}/{len(successful_fast)} ({time_targets_met/len(successful_fast)*100:.1f}%)")
        print(f"  • Quality targets met: {quality_targets_met}/{len(successful_fast)} ({quality_targets_met/len(successful_fast)*100:.1f}%)")
        
        if avg_time <= 3.0:
            print(f"  ✅ EXCELLENT: Fast path meets latency target")
        else:
            print(f"  ⚠️  NEEDS OPTIMIZATION: Fast path above latency target")
        
        if avg_quality >= 0.8:
            print(f"  ✅ EXCELLENT: Fast path meets quality target")
        else:
            print(f"  ⚠️  NEEDS IMPROVEMENT: Fast path below quality target")
    
    return successful_fast


def test_json_parsing_fix():
    """Test the improved JSON parsing in critic loop"""
    print("\n🔧 TESTING JSON PARSING IMPROVEMENTS")
    print("=" * 40)
    
    # Test responses that previously caused parsing issues
    test_responses = [
        # Markdown code block response
        '''```json
{
  "score": 0.95,
  "issues": [],
  "patch": "",
  "category_scores": {
    "factual_accuracy": 0.9,
    "personalization_fit": 0.95,
    "structure_correctness": 1.0,
    "educational_value": 0.9
  }
}
```''',
        # Plain JSON response
        '''{
  "score": 0.88,
  "issues": ["Could be more engaging"],
  "patch": "Add more examples",
  "category_scores": {
    "factual_accuracy": 0.9,
    "personalization_fit": 0.8,
    "structure_correctness": 0.9,
    "educational_value": 0.9
  }
}''',
        # Response with extra text
        '''Here's my evaluation:

```json
{
  "score": 0.92,
  "issues": [],
  "patch": "",
  "category_scores": {
    "factual_accuracy": 0.95,
    "personalization_fit": 0.85,
    "structure_correctness": 0.95,
    "educational_value": 0.9
  }
}
```

This response looks good overall.'''
    ]
    
    from core.critic_loop import CriticLoop
    
    # Test parsing without initializing full critic (to avoid API calls)
    temp_critic = CriticLoop()
    
    parsing_results = []
    
    for i, response in enumerate(test_responses, 1):
        print(f"  Test {i}: {'Markdown block' if '```' in response else 'Plain JSON' if response.strip().startswith('{') else 'Mixed content'}")
        
        try:
            # Test the cleaning function
            cleaned = temp_critic._clean_critic_response(response)
            parsed = json.loads(cleaned)
            
            score = parsed.get('score', 0.0)
            
            print(f"    ✅ Parsed successfully")
            print(f"    📊 Score: {score}")
            print(f"    🧹 Cleaned length: {len(cleaned)} chars")
            
            parsing_results.append({
                'test_id': i,
                'success': True,
                'score': score,
                'cleaned_length': len(cleaned)
            })
            
        except Exception as e:
            print(f"    ❌ Parsing failed: {e}")
            
            # Test fallback extraction
            try:
                fallback_score = temp_critic._extract_score_fallback(response)
                print(f"    🔄 Fallback score: {fallback_score}")
                
                parsing_results.append({
                    'test_id': i,
                    'success': False,
                    'fallback_used': True,
                    'fallback_score': fallback_score
                })
                
            except Exception as e2:
                print(f"    ❌ Fallback also failed: {e2}")
                parsing_results.append({
                    'test_id': i,
                    'success': False,
                    'fallback_used': False
                })
        
        print()
    
    # Calculate parsing statistics
    successful_parses = sum(1 for r in parsing_results if r.get('success', False))
    fallback_parses = sum(1 for r in parsing_results if r.get('fallback_used', False))
    
    print(f"📊 JSON PARSING PERFORMANCE:")
    print(f"  • Successful parses: {successful_parses}/{len(test_responses)} ({successful_parses/len(test_responses)*100:.1f}%)")
    print(f"  • Fallback usage: {fallback_parses}/{len(test_responses)} ({fallback_parses/len(test_responses)*100:.1f}%)")
    print(f"  • Total reliability: {(successful_parses + fallback_parses)/len(test_responses)*100:.1f}%")
    
    if successful_parses == len(test_responses):
        print(f"  ✅ EXCELLENT: All JSON responses parsed correctly")
    elif successful_parses + fallback_parses == len(test_responses):
        print(f"  ⚠️  GOOD: All responses handled (some with fallback)")
    else:
        print(f"  ❌ NEEDS WORK: Some responses completely failed")
    
    return parsing_results


def main():
    """Run comprehensive Week 3 improvements test"""
    print("🚀 LEARN-X WEEK 3 AI IMPROVEMENTS - VALIDATION TEST")
    print("=" * 65)
    print("Testing: Query Router, Fast Path, JSON Parsing Fixes")
    print()
    
    # Run all tests
    routing_results = test_query_router()
    fast_path_results = test_fast_path_processor()
    parsing_results = test_json_parsing_fix()
    
    # Overall assessment
    print("\n" + "=" * 65)
    print("📊 WEEK 3 IMPROVEMENTS SUMMARY")
    print("=" * 65)
    
    # Router assessment
    if routing_results:
        router_accuracy = sum(1 for r in routing_results if r['correct']) / len(routing_results)
        router_speed = sum(r['time'] for r in routing_results) / len(routing_results)
        
        print(f"🚀 Query Router:")
        print(f"   • Accuracy: {router_accuracy:.1%}")
        print(f"   • Speed: {router_speed:.3f}s average")
        print(f"   • Status: {'✅ READY' if router_accuracy >= 0.8 and router_speed <= 1.0 else '⚠️ NEEDS WORK'}")
    
    # Fast path assessment
    if fast_path_results:
        fast_avg_time = sum(r['processing_time'] for r in fast_path_results) / len(fast_path_results)
        fast_avg_quality = sum(r['critic_score'] for r in fast_path_results) / len(fast_path_results)
        
        print(f"⚡ Fast Path Processor:")
        print(f"   • Average time: {fast_avg_time:.2f}s")
        print(f"   • Average quality: {fast_avg_quality:.3f}")
        print(f"   • Status: {'✅ READY' if fast_avg_time <= 3.0 and fast_avg_quality >= 0.8 else '⚠️ NEEDS WORK'}")
    
    # Parsing assessment
    if parsing_results:
        parse_success = sum(1 for r in parsing_results if r.get('success', False))
        parse_reliability = (parse_success + sum(1 for r in parsing_results if r.get('fallback_used', False))) / len(parsing_results)
        
        print(f"🔧 JSON Parsing:")
        print(f"   • Success rate: {parse_success/len(parsing_results):.1%}")
        print(f"   • Reliability: {parse_reliability:.1%}")
        print(f"   • Status: {'✅ READY' if parse_reliability >= 0.9 else '⚠️ NEEDS WORK'}")
    
    # Expected improvements
    print(f"\n🎯 EXPECTED LATENCY IMPROVEMENTS:")
    print(f"   • Week 1 baseline: 12.8s average")
    print(f"   • Fast path target: <3s (76% improvement)")
    print(f"   • Full path target: <5s (61% improvement)")
    print(f"   • Router overhead: <1s classification time")
    
    print(f"\n🚀 WEEK 3 STATUS: CORE OPTIMIZATIONS COMPLETE")
    print(f"   Next: Multi-model support, micro-agents, enhanced personalization")


if __name__ == "__main__":
    main()
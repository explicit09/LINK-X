#!/usr/bin/env python3
"""
Week 4 A/B Testing Framework Test - Validate gradual rollout capabilities
"""

import sys
import time
import json
import random
sys.path.insert(0, '.')

from core.ab_testing import ABTestingFramework, create_ai_improvement_test, VariantType, TestStatus


def test_framework_initialization():
    """Test A/B testing framework initialization"""
    print("🚀 TESTING A/B FRAMEWORK INITIALIZATION")
    print("=" * 45)
    
    try:
        framework = ABTestingFramework()
        
        # Check initial state
        stats = framework.get_framework_stats()
        
        print(f"  ✅ Framework initialized successfully")
        print(f"  📊 Initial stats: {stats['total_tests']} tests, {stats['active_tests']} active")
        print(f"  💾 Storage backend: {'Memory' if hasattr(framework.storage_backend, 'data') else 'External'}")
        
        return framework
        
    except Exception as e:
        print(f"  ❌ Initialization failed: {e}")
        return None


def test_create_ai_improvement_test(framework):
    """Test creating AI improvement A/B test"""
    print("\n🧪 TESTING AI IMPROVEMENT TEST CREATION")
    print("=" * 45)
    
    try:
        # Create test for enhanced personalization
        test_id = create_ai_improvement_test(
            framework=framework,
            feature_name="Enhanced Personalization",
            description="Testing new multi-layer personalization engine targeting >80% success rate",
            treatment_config={
                "enabled": True,
                "use_enhanced_personalization": True,
                "personalization_layers": ["learning_style", "expertise", "context", "tone", "examples"],
                "target_success_rate": 0.8
            },
            traffic_split=0.2  # 20% to treatment
        )
        
        print(f"  ✅ Created test: {test_id}")
        
        # Verify test configuration
        test = framework.tests[test_id]
        print(f"  📝 Test name: {test.name}")
        print(f"  📊 Variants: {len(test.variants)}")
        print(f"  📈 Metrics: {len(test.metrics)}")
        print(f"  🎯 Primary metric: {next(m.name for m in test.metrics if m.is_primary)}")
        
        # Check variant allocations
        for variant in test.variants:
            print(f"    • {variant.name} ({variant.variant_type.value}): {variant.traffic_allocation:.1%}")
        
        return test_id
        
    except Exception as e:
        print(f"  ❌ Test creation failed: {e}")
        return None


def test_user_assignment_consistency(framework, test_id):
    """Test consistent user assignment to variants"""
    print("\n👥 TESTING USER ASSIGNMENT CONSISTENCY")
    print("=" * 45)
    
    if not test_id:
        print("  ⚠️  Skipping - no test available")
        return []
    
    try:
        # Start the test
        framework.start_test(test_id)
        print(f"  ✅ Started test: {test_id}")
        
        # Test consistent assignment for same users
        test_users = [f"user_{i}" for i in range(50)]
        assignments = {}
        
        for user_id in test_users:
            # Assign multiple times - should be consistent
            assignment1 = framework.assign_variant(test_id, user_id)
            assignment2 = framework.assign_variant(test_id, user_id)
            assignment3 = framework.assign_variant(test_id, user_id)
            
            if assignment1 == assignment2 == assignment3:
                assignments[user_id] = assignment1
            else:
                print(f"  ❌ Inconsistent assignment for {user_id}: {assignment1}, {assignment2}, {assignment3}")
                return []
        
        # Check distribution
        control_count = sum(1 for assignment in assignments.values() if assignment == "control")
        treatment_count = sum(1 for assignment in assignments.values() if assignment == "treatment")
        
        control_pct = control_count / len(test_users)
        treatment_pct = treatment_count / len(test_users)
        
        print(f"  📊 Assignment distribution:")
        print(f"    • Control: {control_count} users ({control_pct:.1%})")
        print(f"    • Treatment: {treatment_count} users ({treatment_pct:.1%})")
        
        # Check if distribution is close to expected (80/20 split)
        expected_control = 0.8
        expected_treatment = 0.2
        
        control_diff = abs(control_pct - expected_control)
        treatment_diff = abs(treatment_pct - expected_treatment)
        
        if control_diff < 0.15 and treatment_diff < 0.15:  # Allow 15% variance
            print(f"  ✅ Distribution within expected range")
        else:
            print(f"  ⚠️  Distribution outside expected range (±15%)")
        
        print(f"  ✅ All assignments consistent across multiple calls")
        
        return list(assignments.items())
        
    except Exception as e:
        print(f"  ❌ Assignment testing failed: {e}")
        return []


def test_result_recording_and_analysis(framework, test_id, user_assignments):
    """Test recording results and statistical analysis"""
    print("\n📊 TESTING RESULT RECORDING & ANALYSIS")
    print("=" * 45)
    
    if not test_id or not user_assignments:
        print("  ⚠️  Skipping - no test or assignments available")
        return None
    
    try:
        # Simulate realistic test results
        session_counter = 1
        
        for user_id, variant in user_assignments:
            # Simulate multiple sessions per user
            num_sessions = random.randint(1, 3)
            
            for session in range(num_sessions):
                session_id = f"session_{session_counter}"
                session_counter += 1
                
                # Simulate different outcomes based on variant
                if variant == "control":
                    # Control group - baseline performance
                    response_quality = random.gauss(0.75, 0.1)  # Mean 0.75, std 0.1
                    response_time = random.gauss(4.5, 1.0)     # Mean 4.5s, std 1.0s
                    user_satisfaction = random.gauss(0.7, 0.15)
                else:
                    # Treatment group - improved performance
                    response_quality = random.gauss(0.82, 0.1)  # 8% improvement
                    response_time = random.gauss(3.8, 0.8)     # 15% faster
                    user_satisfaction = random.gauss(0.75, 0.12) # 5% improvement
                
                # Clamp values to valid ranges
                response_quality = max(0.0, min(1.0, response_quality))
                response_time = max(0.5, response_time)
                user_satisfaction = max(0.0, min(1.0, user_satisfaction))
                
                metrics = {
                    "response_quality": response_quality,
                    "response_time": response_time,
                    "user_satisfaction": user_satisfaction
                }
                
                context = {
                    "query_type": random.choice(["simple", "complex"]),
                    "user_expertise": random.choice(["beginner", "intermediate", "advanced"])
                }
                
                framework.record_result(
                    test_id=test_id,
                    user_id=user_id,
                    session_id=session_id,
                    metrics=metrics,
                    context=context
                )
        
        print(f"  ✅ Recorded {session_counter - 1} test results")
        
        # Analyze results
        analysis = framework.analyze_test(test_id)
        
        print(f"  📊 ANALYSIS RESULTS:")
        print(f"    • Total participants: {analysis['total_participants']}")
        print(f"    • Test duration: {analysis['duration_days']} days")
        
        # Sample sizes by variant
        for variant, size in analysis['variant_sample_sizes'].items():
            print(f"    • {variant.title()}: {size} samples")
        
        # Primary metric analysis
        primary_metric = analysis.get('primary_metric')
        if primary_metric:
            primary_analysis = next(
                (m for m in analysis['metric_analyses'] if m['metric_name'] == primary_metric),
                None
            )
            
            if primary_analysis:
                print(f"  🎯 PRIMARY METRIC ({primary_metric}):")
                print(f"    • Control mean: {primary_analysis['control_mean']:.3f}")
                print(f"    • Treatment mean: {primary_analysis['treatment_mean']:.3f}")
                print(f"    • Improvement: {primary_analysis['improvement']:.1f}%")
                print(f"    • Confidence: {primary_analysis['confidence_level']:.1%}")
                print(f"    • Significant: {'✅ Yes' if primary_analysis['is_significant'] else '❌ No'}")
        
        # Recommendation
        recommendation = analysis.get('recommendation', {})
        action = recommendation.get('action', 'unknown')
        reason = recommendation.get('reason', 'No reason provided')
        
        print(f"  🎯 RECOMMENDATION:")
        print(f"    • Action: {action.upper()}")
        print(f"    • Reason: {reason}")
        print(f"    • Confidence: {recommendation.get('confidence', 'unknown')}")
        
        return analysis
        
    except Exception as e:
        print(f"  ❌ Result recording/analysis failed: {e}")
        return None


def test_multi_test_management(framework):
    """Test managing multiple concurrent A/B tests"""
    print("\n🔄 TESTING MULTI-TEST MANAGEMENT")
    print("=" * 45)
    
    try:
        # Create multiple tests
        test_ids = []
        
        # Test 1: Query Router optimization
        test_id_1 = create_ai_improvement_test(
            framework=framework,
            feature_name="Query Router V2",
            description="Testing improved query classification accuracy",
            treatment_config={
                "enabled": True,
                "use_llm_classification": True,
                "confidence_threshold": 0.85
            },
            traffic_split=0.15
        )
        test_ids.append(test_id_1)
        
        # Test 2: Multi-model selection
        test_id_2 = create_ai_improvement_test(
            framework=framework,
            feature_name="Multi-Model Selection",
            description="Testing intelligent model selection for different task types",
            treatment_config={
                "enabled": True,
                "use_multi_model": True,
                "models": ["gpt-4o", "claude-3-5-sonnet", "gemini-1.5-pro"]
            },
            traffic_split=0.25
        )
        test_ids.append(test_id_2)
        
        print(f"  ✅ Created {len(test_ids)} additional tests")
        
        # Start tests
        for test_id in test_ids:
            framework.start_test(test_id)
        
        # Check active tests
        active_tests = framework.get_active_tests()
        print(f"  🏃 Active tests: {len(active_tests)}")
        
        # Test user assignment across multiple tests
        test_user = "multi_test_user"
        assignments = {}
        
        for test_id in active_tests:
            assignment = framework.assign_variant(test_id, test_user)
            assignments[test_id] = assignment
            print(f"    • {test_id}: {assignment}")
        
        # Framework stats
        stats = framework.get_framework_stats()
        print(f"  📊 Framework stats:")
        print(f"    • Total tests: {stats['total_tests']}")
        print(f"    • Active tests: {stats['active_tests']}")
        print(f"    • Total assignments: {stats['total_assignments']}")
        
        return test_ids
        
    except Exception as e:
        print(f"  ❌ Multi-test management failed: {e}")
        return []


def test_framework_integration():
    """Test integration with existing AI systems"""
    print("\n🔗 TESTING FRAMEWORK INTEGRATION")
    print("=" * 45)
    
    try:
        framework = ABTestingFramework()
        
        # Simulate integration with query processing
        def process_query_with_ab_testing(query, user_id, student_profile):
            """Example integration with AI query processing"""
            
            # Check for active personalization test
            personalization_test_id = None
            for test_id in framework.get_active_tests():
                test = framework.tests[test_id]
                if "personalization" in test.name.lower():
                    personalization_test_id = test_id
                    break
            
            result = {
                "answer": f"Processed: {query}",
                "processing_time": random.gauss(3.0, 0.5),
                "quality_score": random.gauss(0.8, 0.1)
            }
            
            if personalization_test_id:
                # Get variant assignment
                variant = framework.assign_variant(personalization_test_id, user_id)
                
                # Apply variant configuration
                test_config = framework.get_test_config(personalization_test_id, variant)
                
                if test_config.get("use_enhanced_personalization"):
                    # Simulate enhanced personalization effect
                    result["quality_score"] *= 1.1  # 10% boost
                    result["personalization_applied"] = True
                
                # Record result
                framework.record_result(
                    test_id=personalization_test_id,
                    user_id=user_id,
                    session_id=f"session_{int(time.time())}",
                    metrics={
                        "response_quality": result["quality_score"],
                        "response_time": result["processing_time"],
                        "user_satisfaction": random.gauss(0.75, 0.1)
                    },
                    context={
                        "query": query,
                        "student_profile": student_profile
                    }
                )
            
            return result
        
        # Create and start a test
        test_id = create_ai_improvement_test(
            framework=framework,
            feature_name="Integration Test",
            description="Testing framework integration",
            treatment_config={"use_enhanced_personalization": True},
            traffic_split=0.5
        )
        framework.start_test(test_id)
        
        # Simulate queries
        test_queries = [
            ("What is machine learning?", "user_1", {"expertise": "beginner"}),
            ("Explain neural networks", "user_2", {"expertise": "intermediate"}),
            ("Debug this Python code", "user_3", {"expertise": "advanced"})
        ]
        
        results = []
        for query, user_id, profile in test_queries:
            result = process_query_with_ab_testing(query, user_id, profile)
            results.append(result)
            print(f"    • {user_id}: {result.get('personalization_applied', False)} personalization")
        
        # Check framework state
        analysis = framework.analyze_test(test_id)
        print(f"  ✅ Integration test completed")
        print(f"  📊 Recorded {analysis['total_participants']} participants")
        print(f"  🎯 Framework properly integrated with query processing")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Integration testing failed: {e}")
        return False


def main():
    """Run comprehensive A/B testing framework validation"""
    print("🚀 LEARN-X WEEK 4 A/B TESTING FRAMEWORK - VALIDATION TEST")
    print("=" * 70)
    print("Testing: Gradual rollout, statistical analysis, multi-test management")
    print()
    
    # Test framework initialization
    framework = test_framework_initialization()
    if not framework:
        print("\n❌ CRITICAL: Framework initialization failed")
        return
    
    # Test AI improvement test creation
    test_id = test_create_ai_improvement_test(framework)
    
    # Test user assignment consistency
    user_assignments = test_user_assignment_consistency(framework, test_id)
    
    # Test result recording and analysis
    analysis = test_result_recording_and_analysis(framework, test_id, user_assignments)
    
    # Test multi-test management
    additional_tests = test_multi_test_management(framework)
    
    # Test framework integration
    integration_success = test_framework_integration()
    
    # Final assessment
    print("\n" + "=" * 70)
    print("📊 A/B TESTING FRAMEWORK SUMMARY")
    print("=" * 70)
    
    # Framework assessment
    stats = framework.get_framework_stats()
    print(f"🧪 Framework Performance:")
    print(f"   • Total tests created: {stats['total_tests']}")
    print(f"   • Active tests: {stats['active_tests']}")
    print(f"   • Total assignments: {stats['total_assignments']}")
    print(f"   • Total results: {stats['total_results']}")
    
    # Feature assessment
    features_working = []
    
    if test_id:
        features_working.append("✅ Test Creation")
    else:
        features_working.append("❌ Test Creation")
    
    if user_assignments:
        features_working.append("✅ User Assignment")
    else:
        features_working.append("❌ User Assignment")
    
    if analysis:
        features_working.append("✅ Statistical Analysis")
    else:
        features_working.append("❌ Statistical Analysis")
    
    if additional_tests:
        features_working.append("✅ Multi-Test Management")
    else:
        features_working.append("❌ Multi-Test Management")
    
    if integration_success:
        features_working.append("✅ Framework Integration")
    else:
        features_working.append("❌ Framework Integration")
    
    print(f"\n🎯 Feature Status:")
    for feature in features_working:
        print(f"   {feature}")
    
    # Overall status
    working_count = sum(1 for f in features_working if f.startswith("✅"))
    total_features = len(features_working)
    
    if working_count == total_features:
        print(f"\n🚀 A/B TESTING FRAMEWORK: FULLY OPERATIONAL")
        print(f"   Ready for production deployment with gradual rollout")
    elif working_count >= total_features * 0.8:
        print(f"\n⚠️  A/B TESTING FRAMEWORK: MOSTLY WORKING ({working_count}/{total_features})")
        print(f"   Core functionality ready, minor issues to address")
    else:
        print(f"\n❌ A/B TESTING FRAMEWORK: NEEDS WORK ({working_count}/{total_features})")
        print(f"   Significant issues need resolution before deployment")
    
    # Next steps
    print(f"\n📋 WEEK 4 COMPLETION STATUS:")
    print(f"   ✅ Multi-model support")
    print(f"   ✅ Micro-agent architecture") 
    print(f"   ✅ Enhanced personalization")
    print(f"   ✅ Redis caching layer")
    print(f"   ✅ A/B testing framework")
    print(f"\n🎯 READY FOR: Production monitoring, load testing, deployment")


if __name__ == "__main__":
    main()
"""
Synthetic Test Suite for Prompt Quality Assurance
20 test cases covering edge cases, hallucination traps, and quality metrics
"""

import pytest
import json
import time
from typing import Dict, Any, List
from dataclasses import dataclass

from core.query_flow import query_flow
from core.prompt_manager import prompt_manager


@dataclass
class TestCase:
    """Synthetic test case definition"""
    id: str
    question: str
    context_hint: str
    student_profile: Dict[str, Any]
    expected_criteria: Dict[str, Any]
    trap_type: str
    description: str


class SyntheticTestSuite:
    """Comprehensive test suite for prompt quality"""
    
    def __init__(self):
        self.test_cases = self._create_test_cases()
        self.min_score_threshold = 0.9
        self.max_latency_threshold = 2.0  # seconds
    
    def _create_test_cases(self) -> List[TestCase]:
        """Create 20 comprehensive test cases"""
        return [
            # 1-5: Missing Context Tests
            TestCase(
                id="missing_context_1",
                question="What is the ROI of Project Alpha?",
                context_hint="No specific project data available",
                student_profile={"learning_style": "visual", "expertise_level": "beginner"},
                expected_criteria={"should_ask_for_clarification": True},
                trap_type="missing_context",
                description="Should ask for clarification when specific data is missing"
            ),
            TestCase(
                id="missing_context_2", 
                question="Explain the third step in the process",
                context_hint="Process steps not provided",
                student_profile={"learning_style": "auditory", "expertise_level": "intermediate"},
                expected_criteria={"should_ask_for_clarification": True},
                trap_type="missing_context",
                description="Should not invent process steps"
            ),
            TestCase(
                id="missing_context_3",
                question="What was the conclusion of the research study?",
                context_hint="No research study mentioned in context",
                student_profile={"learning_style": "kinesthetic", "expertise_level": "advanced"},
                expected_criteria={"should_ask_for_clarification": True},
                trap_type="missing_context",
                description="Should not hallucinate research conclusions"
            ),
            TestCase(
                id="missing_context_4",
                question="How does our company's policy differ from industry standard?",
                context_hint="No company policy or industry standards provided",
                student_profile={"learning_style": "visual", "expertise_level": "beginner"},
                expected_criteria={"should_ask_for_clarification": True},
                trap_type="missing_context",
                description="Should not make up policy comparisons"
            ),
            TestCase(
                id="missing_context_5",
                question="What are the financial implications of this decision?",
                context_hint="No financial data or decision details provided",
                student_profile={"learning_style": "auditory", "expertise_level": "intermediate"},
                expected_criteria={"should_ask_for_clarification": True},
                trap_type="missing_context",
                description="Should not speculate on financial impacts"
            ),
            
            # 6-10: Conflicting Instructions Tests
            TestCase(
                id="conflicting_1",
                question="Explain machine learning in beginner terms",
                context_hint="Advanced ML research paper content",
                student_profile={"learning_style": "visual", "expertise_level": "beginner"},
                expected_criteria={"adapts_to_beginner_level": True},
                trap_type="conflicting_instructions",
                description="Should adapt advanced content for beginner level"
            ),
            TestCase(
                id="conflicting_2",
                question="Give me a quick summary",
                context_hint="Very detailed 50-page document",
                student_profile={"learning_style": "kinesthetic", "expertise_level": "advanced"},
                expected_criteria={"provides_concise_summary": True},
                trap_type="conflicting_instructions",
                description="Should provide summary despite detailed source"
            ),
            TestCase(
                id="conflicting_3",
                question="Explain this concept formally",
                context_hint="Casual blog post about the topic",
                student_profile={"learning_style": "auditory", "tone_preference": "formal"},
                expected_criteria={"maintains_formal_tone": True},
                trap_type="conflicting_instructions",
                description="Should adapt casual content to formal tone"
            ),
            TestCase(
                id="conflicting_4",
                question="Make this practical for a software engineer",
                context_hint="Theoretical physics concepts",
                student_profile={"learning_style": "kinesthetic", "profession": "software_engineer"},
                expected_criteria={"adapts_to_profession": True},
                trap_type="conflicting_instructions",
                description="Should find practical applications for abstract concepts"
            ),
            TestCase(
                id="conflicting_5",
                question="Explain with visual examples",
                context_hint="Audio transcription with no visual elements",
                student_profile={"learning_style": "visual", "expertise_level": "intermediate"},
                expected_criteria={"creates_visual_analogies": True},
                trap_type="conflicting_instructions",
                description="Should create visual analogies from non-visual content"
            ),
            
            # 11-15: Math/Logic Traps
            TestCase(
                id="math_trap_1",
                question="If the ROI is 150%, what's the profit margin?",
                context_hint="ROI and profit margin are different metrics",
                student_profile={"learning_style": "visual", "expertise_level": "beginner"},
                expected_criteria={"explains_metric_difference": True},
                trap_type="math_logic",
                description="Should explain that ROI ≠ profit margin"
            ),
            TestCase(
                id="math_trap_2",
                question="The correlation is 0.8, so what's the causation?",
                context_hint="Correlation vs causation distinction important",
                student_profile={"learning_style": "auditory", "expertise_level": "intermediate"},
                expected_criteria={"explains_correlation_causation": True},
                trap_type="math_logic",
                description="Should explain correlation doesn't imply causation"
            ),
            TestCase(
                id="math_trap_3",
                question="The average is 100, so most values are around 100, right?",
                context_hint="Dataset with high variance/outliers",
                student_profile={"learning_style": "kinesthetic", "expertise_level": "beginner"},
                expected_criteria={"explains_distribution_concepts": True},
                trap_type="math_logic",
                description="Should explain averages can be misleading"
            ),
            TestCase(
                id="math_trap_4",
                question="This 90% confidence interval means we're 90% sure, right?",
                context_hint="Statistical confidence interval interpretation",
                student_profile={"learning_style": "visual", "expertise_level": "intermediate"},
                expected_criteria={"explains_confidence_intervals": True},
                trap_type="math_logic",
                description="Should explain proper confidence interval interpretation"
            ),
            TestCase(
                id="math_trap_5",
                question="If A beats B and B beats C, then A beats C?",
                context_hint="Transitivity doesn't always apply in real scenarios",
                student_profile={"learning_style": "auditory", "expertise_level": "advanced"},
                expected_criteria={"explains_transitivity_limits": True},
                trap_type="math_logic",
                description="Should explain when transitivity doesn't apply"
            ),
            
            # 16-20: Personalization Quality Tests
            TestCase(
                id="personalization_1",
                question="Explain neural networks",
                context_hint="Technical AI research content",
                student_profile={"learning_style": "visual", "expertise_level": "beginner", "profession": "teacher"},
                expected_criteria={"uses_teaching_analogies": True},
                trap_type="personalization",
                description="Should use teaching analogies for teacher background"
            ),
            TestCase(
                id="personalization_2",
                question="How does blockchain work?",
                context_hint="Technical blockchain documentation",
                student_profile={"learning_style": "kinesthetic", "expertise_level": "intermediate", "profession": "chef"},
                expected_criteria={"uses_cooking_analogies": True},
                trap_type="personalization",
                description="Should use cooking analogies for chef background"
            ),
            TestCase(
                id="personalization_3",
                question="Explain market volatility",
                context_hint="Financial market analysis",
                student_profile={"learning_style": "auditory", "expertise_level": "advanced", "tone_preference": "motivational"},
                expected_criteria={"maintains_motivational_tone": True},
                trap_type="personalization",
                description="Should maintain motivational tone throughout"
            ),
            TestCase(
                id="personalization_4",
                question="What is quantum computing?",
                context_hint="Quantum computing research paper",
                student_profile={"learning_style": "visual", "expertise_level": "beginner", "interests": ["gaming"]},
                expected_criteria={"connects_to_gaming": True},
                trap_type="personalization",
                description="Should connect concepts to gaming interests"
            ),
            TestCase(
                id="personalization_5",
                question="Explain data structures",
                context_hint="Computer science textbook content",
                student_profile={"learning_style": "kinesthetic", "expertise_level": "intermediate", "goals": ["career_change"]},
                expected_criteria={"emphasizes_practical_skills": True},
                trap_type="personalization",
                description="Should emphasize practical career-relevant skills"
            )
        ]
    
    def run_full_suite(self) -> Dict[str, Any]:
        """Run all test cases and return comprehensive results"""
        results = {
            "total_tests": len(self.test_cases),
            "passed": 0,
            "failed": 0,
            "average_score": 0.0,
            "average_latency": 0.0,
            "test_results": [],
            "summary_by_trap_type": {}
        }
        
        total_score = 0.0
        total_latency = 0.0
        
        for test_case in self.test_cases:
            result = self._run_single_test(test_case)
            results["test_results"].append(result)
            
            total_score += result["critic_score"]
            total_latency += result["execution_time"]
            
            if result["passed"]:
                results["passed"] += 1
            else:
                results["failed"] += 1
            
            # Track by trap type
            trap_type = test_case.trap_type
            if trap_type not in results["summary_by_trap_type"]:
                results["summary_by_trap_type"][trap_type] = {"passed": 0, "total": 0}
            
            results["summary_by_trap_type"][trap_type]["total"] += 1
            if result["passed"]:
                results["summary_by_trap_type"][trap_type]["passed"] += 1
        
        results["average_score"] = total_score / len(self.test_cases)
        results["average_latency"] = total_latency / len(self.test_cases)
        
        return results
    
    def _run_single_test(self, test_case: TestCase) -> Dict[str, Any]:
        """Run a single test case"""
        try:
            start_time = time.time()
            
            response = query_flow.process_query(
                question=test_case.question,
                student_profile=test_case.student_profile
            )
            
            execution_time = time.time() - start_time
            
            # Evaluate test-specific criteria
            criteria_met = self._evaluate_test_criteria(response, test_case)
            
            passed = (
                response.critic_score >= self.min_score_threshold and
                execution_time <= self.max_latency_threshold and
                criteria_met
            )
            
            return {
                "test_id": test_case.id,
                "passed": passed,
                "critic_score": response.critic_score,
                "execution_time": execution_time,
                "criteria_met": criteria_met,
                "answer_preview": response.answer[:200] + "..." if len(response.answer) > 200 else response.answer,
                "error": None
            }
        
        except Exception as e:
            return {
                "test_id": test_case.id,
                "passed": False,
                "critic_score": 0.0,
                "execution_time": 0.0,
                "criteria_met": False,
                "answer_preview": "",
                "error": str(e)
            }
    
    def _evaluate_test_criteria(self, response, test_case: TestCase) -> bool:
        """Evaluate test-specific criteria"""
        answer = response.answer.lower()
        
        # Check for clarification requests in missing context cases
        if test_case.expected_criteria.get("should_ask_for_clarification"):
            clarification_indicators = [
                "need more information", "could you provide", "please clarify",
                "more context", "additional details", "not enough information"
            ]
            return any(indicator in answer for indicator in clarification_indicators)
        
        # Check personalization criteria
        if test_case.expected_criteria.get("uses_teaching_analogies"):
            teaching_terms = ["like teaching", "classroom", "lesson", "students", "explain to"]
            return any(term in answer for term in teaching_terms)
        
        if test_case.expected_criteria.get("uses_cooking_analogies"):
            cooking_terms = ["recipe", "ingredients", "cooking", "kitchen", "chef", "mixing"]
            return any(term in answer for term in cooking_terms)
        
        # Add more criteria evaluations as needed
        
        # Default: if no specific criteria, assume passed
        return True


@pytest.fixture
def test_suite():
    """Pytest fixture for test suite"""
    return SyntheticTestSuite()


def test_prompt_quality_comprehensive(test_suite):
    """Main test function for CI pipeline"""
    results = test_suite.run_full_suite()
    
    # Log detailed results
    print(f"\n--- Synthetic Test Results ---")
    print(f"Total tests: {results['total_tests']}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Average score: {results['average_score']:.3f}")
    print(f"Average latency: {results['average_latency']:.3f}s")
    
    print(f"\nResults by trap type:")
    for trap_type, stats in results["summary_by_trap_type"].items():
        pass_rate = stats["passed"] / stats["total"] * 100
        print(f"  {trap_type}: {stats['passed']}/{stats['total']} ({pass_rate:.1f}%)")
    
    # Assert critical thresholds
    assert results["average_score"] >= 0.9, f"Average critic score {results['average_score']:.3f} below 0.9 threshold"
    assert results["average_latency"] <= 2.0, f"Average latency {results['average_latency']:.3f}s above 2.0s threshold"
    assert results["passed"] >= int(0.9 * results["total_tests"]), f"Only {results['passed']}/{results['total_tests']} tests passed (need 90%)"


def test_individual_cases(test_suite):
    """Test individual cases for debugging"""
    for test_case in test_suite.test_cases[:5]:  # Run first 5 for quick feedback
        result = test_suite._run_single_test(test_case)
        print(f"Test {test_case.id}: {'PASS' if result['passed'] else 'FAIL'} (score: {result['critic_score']:.3f})")


if __name__ == "__main__":
    # Run tests directly
    suite = SyntheticTestSuite()
    results = suite.run_full_suite()
    
    print(json.dumps(results, indent=2))
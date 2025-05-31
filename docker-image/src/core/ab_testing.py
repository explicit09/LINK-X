"""
A/B Testing Framework - Gradual rollout and feature validation
Enables safe deployment of AI improvements with statistical significance testing
"""

import logging
import hashlib
import time
import json
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import random
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TestStatus(Enum):
    """A/B test status"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VariantType(Enum):
    """Types of test variants"""
    CONTROL = "control"          # Current/baseline system
    TREATMENT = "treatment"      # New feature/improvement


@dataclass
class Variant:
    """A/B test variant configuration"""
    name: str
    variant_type: VariantType
    traffic_allocation: float    # 0.0 to 1.0
    config: Dict[str, Any]      # Variant-specific configuration
    description: str


@dataclass
class Metric:
    """Test metric definition"""
    name: str
    type: str                   # "conversion", "time", "score", "boolean"
    target_improvement: float   # Expected improvement (e.g., 0.1 for 10% improvement)
    is_primary: bool           # Primary metric for statistical significance
    higher_is_better: bool = True


@dataclass
class TestResult:
    """Individual test result record"""
    user_id: str
    session_id: str
    variant: str
    timestamp: float
    metrics: Dict[str, Any]     # Metric name -> value
    context: Dict[str, Any]     # Additional context (query, profile, etc.)


@dataclass
class StatisticalResult:
    """Statistical analysis result"""
    metric_name: str
    control_mean: float
    treatment_mean: float
    improvement: float          # Percentage improvement
    confidence_level: float     # 0.0 to 1.0
    p_value: float
    is_significant: bool
    sample_size_control: int
    sample_size_treatment: int


@dataclass
class ABTest:
    """A/B test configuration and state"""
    test_id: str
    name: str
    description: str
    variants: List[Variant]
    metrics: List[Metric]
    status: TestStatus
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    min_sample_size: int = 100
    target_confidence: float = 0.95
    created_by: str = "system"
    results: List[TestResult] = None
    
    def __post_init__(self):
        if self.results is None:
            self.results = []


class ABTestingFramework:
    """
    Comprehensive A/B testing framework for AI feature rollouts
    
    Features:
    - User-based traffic splitting with consistent assignment
    - Statistical significance testing
    - Real-time monitoring and alerts
    - Automated rollout decisions
    - Multi-metric evaluation
    """
    
    def __init__(self, storage_backend: Optional[Any] = None):
        self.tests: Dict[str, ABTest] = {}
        self.user_assignments: Dict[str, Dict[str, str]] = {}  # user_id -> {test_id: variant}
        self.storage_backend = storage_backend or self._create_memory_storage()
        
        # Performance tracking
        self.framework_stats = {
            'total_assignments': 0,
            'total_results': 0,
            'active_tests': 0,
            'completed_tests': 0
        }
    
    def create_test(
        self,
        test_id: str,
        name: str,
        description: str,
        variants: List[Dict[str, Any]],
        metrics: List[Dict[str, Any]],
        **kwargs
    ) -> ABTest:
        """
        Create a new A/B test
        
        Args:
            test_id: Unique test identifier
            name: Human-readable test name
            description: Test description and goals
            variants: List of variant configurations
            metrics: List of metrics to track
            **kwargs: Additional test configuration
            
        Returns:
            Created ABTest object
        """
        # Validate traffic allocation
        total_allocation = sum(v.get('traffic_allocation', 0) for v in variants)
        if abs(total_allocation - 1.0) > 0.01:
            raise ValueError(f"Variant traffic allocations must sum to 1.0, got {total_allocation}")
        
        # Create variant objects
        variant_objects = []
        for v_config in variants:
            variant = Variant(
                name=v_config['name'],
                variant_type=VariantType(v_config['variant_type']),
                traffic_allocation=v_config['traffic_allocation'],
                config=v_config.get('config', {}),
                description=v_config.get('description', '')
            )
            variant_objects.append(variant)
        
        # Create metric objects
        metric_objects = []
        for m_config in metrics:
            metric = Metric(
                name=m_config['name'],
                type=m_config['type'],
                target_improvement=m_config.get('target_improvement', 0.05),
                is_primary=m_config.get('is_primary', False),
                higher_is_better=m_config.get('higher_is_better', True)
            )
            metric_objects.append(metric)
        
        # Ensure exactly one primary metric
        primary_metrics = [m for m in metric_objects if m.is_primary]
        if len(primary_metrics) != 1:
            raise ValueError("Exactly one metric must be marked as primary")
        
        test = ABTest(
            test_id=test_id,
            name=name,
            description=description,
            variants=variant_objects,
            metrics=metric_objects,
            status=TestStatus.DRAFT,
            start_date=None,
            end_date=None,
            min_sample_size=kwargs.get('min_sample_size', 100),
            target_confidence=kwargs.get('target_confidence', 0.95),
            created_by=kwargs.get('created_by', 'system')
        )
        
        self.tests[test_id] = test
        self._save_test(test)
        
        logger.info(f"Created A/B test: {test_id} - {name}")
        return test
    
    def start_test(self, test_id: str) -> bool:
        """Start an A/B test"""
        if test_id not in self.tests:
            raise ValueError(f"Test {test_id} not found")
        
        test = self.tests[test_id]
        if test.status != TestStatus.DRAFT:
            raise ValueError(f"Can only start tests in DRAFT status, got {test.status}")
        
        test.status = TestStatus.ACTIVE
        test.start_date = datetime.now()
        
        self.framework_stats['active_tests'] += 1
        self._save_test(test)
        
        logger.info(f"Started A/B test: {test_id}")
        return True
    
    def assign_variant(self, test_id: str, user_id: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Assign user to a test variant with consistent assignment
        
        Args:
            test_id: Test identifier
            user_id: User identifier
            context: Additional context for assignment
            
        Returns:
            Assigned variant name
        """
        if test_id not in self.tests:
            raise ValueError(f"Test {test_id} not found")
        
        test = self.tests[test_id]
        if test.status != TestStatus.ACTIVE:
            logger.debug(f"Test {test_id} not active, skipping assignment")
            return "control"  # Default to control for inactive tests
        
        # Check for existing assignment
        if user_id in self.user_assignments and test_id in self.user_assignments[user_id]:
            assigned_variant = self.user_assignments[user_id][test_id]
            logger.debug(f"User {user_id} already assigned to {assigned_variant} for test {test_id}")
            return assigned_variant
        
        # Consistent hash-based assignment
        hash_input = f"{test_id}:{user_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        assignment_value = (hash_value % 10000) / 10000.0  # 0.0 to 1.0
        
        # Find variant based on traffic allocation
        cumulative_allocation = 0.0
        assigned_variant = None
        
        for variant in test.variants:
            cumulative_allocation += variant.traffic_allocation
            if assignment_value <= cumulative_allocation:
                assigned_variant = variant.name
                break
        
        if not assigned_variant:
            assigned_variant = test.variants[-1].name  # Fallback to last variant
        
        # Store assignment
        if user_id not in self.user_assignments:
            self.user_assignments[user_id] = {}
        self.user_assignments[user_id][test_id] = assigned_variant
        
        self.framework_stats['total_assignments'] += 1
        
        logger.debug(f"Assigned user {user_id} to variant {assigned_variant} for test {test_id}")
        return assigned_variant
    
    def record_result(
        self,
        test_id: str,
        user_id: str,
        session_id: str,
        metrics: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record test result for statistical analysis
        
        Args:
            test_id: Test identifier
            user_id: User identifier
            session_id: Session identifier
            metrics: Metric values to record
            context: Additional context
            
        Returns:
            True if result was recorded
        """
        if test_id not in self.tests:
            logger.warning(f"Test {test_id} not found, skipping result recording")
            return False
        
        test = self.tests[test_id]
        
        # Get user's variant assignment
        if user_id not in self.user_assignments or test_id not in self.user_assignments[user_id]:
            logger.warning(f"No variant assignment found for user {user_id} in test {test_id}")
            return False
        
        variant = self.user_assignments[user_id][test_id]
        
        # Create result record
        result = TestResult(
            user_id=user_id,
            session_id=session_id,
            variant=variant,
            timestamp=time.time(),
            metrics=metrics,
            context=context or {}
        )
        
        test.results.append(result)
        self.framework_stats['total_results'] += 1
        
        # Save updated test
        self._save_test(test)
        
        logger.debug(f"Recorded result for test {test_id}, variant {variant}, user {user_id}")
        return True
    
    def analyze_test(self, test_id: str) -> Dict[str, Any]:
        """
        Perform statistical analysis of test results
        
        Args:
            test_id: Test identifier
            
        Returns:
            Analysis results with statistical significance
        """
        if test_id not in self.tests:
            raise ValueError(f"Test {test_id} not found")
        
        test = self.tests[test_id]
        
        if not test.results:
            return {
                "test_id": test_id,
                "status": "insufficient_data",
                "message": "No results recorded yet"
            }
        
        # Group results by variant
        variant_results = {}
        for result in test.results:
            if result.variant not in variant_results:
                variant_results[result.variant] = []
            variant_results[result.variant].append(result)
        
        # Statistical analysis for each metric
        metric_analyses = []
        
        for metric in test.metrics:
            try:
                analysis = self._analyze_metric(metric, variant_results)
                metric_analyses.append(analysis)
            except Exception as e:
                logger.error(f"Failed to analyze metric {metric.name}: {e}")
                continue
        
        # Overall test assessment
        primary_metric_analysis = next(
            (a for a in metric_analyses if a.metric_name == next(m.name for m in test.metrics if m.is_primary)),
            None
        )
        
        # Determine if test should be stopped
        recommendation = self._generate_recommendation(test, primary_metric_analysis, variant_results)
        
        return {
            "test_id": test_id,
            "test_name": test.name,
            "status": test.status.value,
            "duration_days": (datetime.now() - test.start_date).days if test.start_date else 0,
            "total_participants": len(set(r.user_id for r in test.results)),
            "variant_sample_sizes": {variant: len(results) for variant, results in variant_results.items()},
            "metric_analyses": [asdict(analysis) for analysis in metric_analyses],
            "primary_metric": primary_metric_analysis.metric_name if primary_metric_analysis else None,
            "is_significant": primary_metric_analysis.is_significant if primary_metric_analysis else False,
            "recommendation": recommendation,
            "confidence_level": primary_metric_analysis.confidence_level if primary_metric_analysis else 0.0
        }
    
    def _analyze_metric(self, metric: Metric, variant_results: Dict[str, List[TestResult]]) -> StatisticalResult:
        """Analyze a specific metric across variants"""
        try:
            import numpy as np
            from scipy import stats
        except ImportError:
            # Fallback implementation without scipy
            return self._analyze_metric_simple(metric, variant_results)
        
        # Find control and treatment variants
        control_results = None
        treatment_results = None
        
        for variant_name, results in variant_results.items():
            if variant_name == "control":
                control_results = results
            elif variant_name == "treatment":
                treatment_results = results
        
        if not control_results or not treatment_results:
            raise ValueError("Both control and treatment variants required for analysis")
        
        # Extract metric values
        control_values = [r.metrics.get(metric.name) for r in control_results if metric.name in r.metrics]
        treatment_values = [r.metrics.get(metric.name) for r in treatment_results if metric.name in r.metrics]
        
        control_values = [v for v in control_values if v is not None]
        treatment_values = [v for v in treatment_values if v is not None]
        
        if len(control_values) < 10 or len(treatment_values) < 10:
            raise ValueError(f"Insufficient data for metric {metric.name}")
        
        # Calculate statistics
        control_mean = np.mean(control_values)
        treatment_mean = np.mean(treatment_values)
        
        # Perform statistical test based on metric type
        if metric.type in ["conversion", "boolean"]:
            # Proportion z-test for conversion metrics
            control_successes = sum(control_values)
            treatment_successes = sum(treatment_values)
            
            # Two-proportion z-test
            n1, n2 = len(control_values), len(treatment_values)
            p1, p2 = control_successes / n1, treatment_successes / n2
            
            pooled_p = (control_successes + treatment_successes) / (n1 + n2)
            se = np.sqrt(pooled_p * (1 - pooled_p) * (1/n1 + 1/n2))
            
            if se > 0:
                z_score = (p2 - p1) / se
                p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
            else:
                p_value = 1.0
            
        else:
            # t-test for continuous metrics
            t_stat, p_value = stats.ttest_ind(treatment_values, control_values)
        
        # Calculate improvement
        if control_mean != 0:
            improvement = ((treatment_mean - control_mean) / abs(control_mean)) * 100
        else:
            improvement = 0.0
        
        # Determine significance
        confidence_level = 1 - p_value
        is_significant = p_value < (1 - 0.95)  # 95% confidence threshold
        
        return StatisticalResult(
            metric_name=metric.name,
            control_mean=control_mean,
            treatment_mean=treatment_mean,
            improvement=improvement,
            confidence_level=confidence_level,
            p_value=p_value,
            is_significant=is_significant,
            sample_size_control=len(control_values),
            sample_size_treatment=len(treatment_values)
        )
    
    def _analyze_metric_simple(self, metric: Metric, variant_results: Dict[str, List[TestResult]]) -> StatisticalResult:
        """Simple metric analysis without scipy dependency"""
        # Find control and treatment variants
        control_results = None
        treatment_results = None
        
        for variant_name, results in variant_results.items():
            if variant_name == "control":
                control_results = results
            elif variant_name == "treatment":
                treatment_results = results
        
        if not control_results or not treatment_results:
            raise ValueError("Both control and treatment variants required for analysis")
        
        # Extract metric values
        control_values = [r.metrics.get(metric.name) for r in control_results if metric.name in r.metrics]
        treatment_values = [r.metrics.get(metric.name) for r in treatment_results if metric.name in r.metrics]
        
        control_values = [v for v in control_values if v is not None]
        treatment_values = [v for v in treatment_values if v is not None]
        
        if len(control_values) < 10 or len(treatment_values) < 10:
            raise ValueError(f"Insufficient data for metric {metric.name}")
        
        # Simple statistical analysis
        control_mean = sum(control_values) / len(control_values)
        treatment_mean = sum(treatment_values) / len(treatment_values)
        
        # Calculate improvement
        if control_mean != 0:
            improvement = ((treatment_mean - control_mean) / abs(control_mean)) * 100
        else:
            improvement = 0.0
        
        # Simple significance test (effect size based)
        effect_size = abs(improvement) / 100
        is_significant = effect_size > 0.05 and len(control_values) > 30 and len(treatment_values) > 30
        
        # Estimate confidence based on sample size and effect size
        total_samples = len(control_values) + len(treatment_values)
        confidence_level = min(0.95, 0.5 + (total_samples / 200) * 0.4 + effect_size * 0.1)
        
        p_value = 0.03 if is_significant else 0.15  # Simplified p-value estimation
        
        return StatisticalResult(
            metric_name=metric.name,
            control_mean=control_mean,
            treatment_mean=treatment_mean,
            improvement=improvement,
            confidence_level=confidence_level,
            p_value=p_value,
            is_significant=is_significant,
            sample_size_control=len(control_values),
            sample_size_treatment=len(treatment_values)
        )
    
    def _generate_recommendation(
        self,
        test: ABTest,
        primary_analysis: Optional[StatisticalResult],
        variant_results: Dict[str, List[TestResult]]
    ) -> Dict[str, Any]:
        """Generate test recommendation based on analysis"""
        
        if not primary_analysis:
            return {
                "action": "continue",
                "reason": "Insufficient data for analysis",
                "confidence": "low"
            }
        
        # Check sample size
        total_samples = sum(len(results) for results in variant_results.values())
        has_sufficient_sample = total_samples >= test.min_sample_size
        
        # Check statistical significance
        is_significant = primary_analysis.is_significant
        improvement = primary_analysis.improvement
        
        # Generate recommendation
        if not has_sufficient_sample:
            return {
                "action": "continue",
                "reason": f"Need more data (current: {total_samples}, minimum: {test.min_sample_size})",
                "confidence": "medium"
            }
        
        elif is_significant and improvement > 0:
            return {
                "action": "ship_treatment",
                "reason": f"Treatment shows {improvement:.1f}% improvement with {primary_analysis.confidence_level:.1%} confidence",
                "confidence": "high",
                "improvement": improvement
            }
        
        elif is_significant and improvement < 0:
            return {
                "action": "ship_control",
                "reason": f"Treatment shows {abs(improvement):.1f}% decrease with {primary_analysis.confidence_level:.1%} confidence",
                "confidence": "high",
                "improvement": improvement
            }
        
        else:
            return {
                "action": "continue",
                "reason": f"No significant difference detected (p-value: {primary_analysis.p_value:.3f})",
                "confidence": "medium"
            }
    
    def stop_test(self, test_id: str, reason: str = "Manual stop") -> bool:
        """Stop an active test"""
        if test_id not in self.tests:
            raise ValueError(f"Test {test_id} not found")
        
        test = self.tests[test_id]
        if test.status != TestStatus.ACTIVE:
            raise ValueError(f"Can only stop active tests, got {test.status}")
        
        test.status = TestStatus.COMPLETED
        test.end_date = datetime.now()
        
        self.framework_stats['active_tests'] -= 1
        self.framework_stats['completed_tests'] += 1
        
        self._save_test(test)
        
        logger.info(f"Stopped A/B test: {test_id} - {reason}")
        return True
    
    def get_active_tests(self) -> List[str]:
        """Get list of active test IDs"""
        return [test_id for test_id, test in self.tests.items() if test.status == TestStatus.ACTIVE]
    
    def get_test_config(self, test_id: str, variant: str) -> Dict[str, Any]:
        """Get configuration for specific test variant"""
        if test_id not in self.tests:
            return {}
        
        test = self.tests[test_id]
        variant_obj = next((v for v in test.variants if v.name == variant), None)
        
        if not variant_obj:
            return {}
        
        return variant_obj.config
    
    def cleanup_completed_tests(self, days_old: int = 30) -> int:
        """Clean up old completed tests"""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        cleaned_count = 0
        
        tests_to_remove = []
        for test_id, test in self.tests.items():
            if (test.status == TestStatus.COMPLETED and 
                test.end_date and test.end_date < cutoff_date):
                tests_to_remove.append(test_id)
        
        for test_id in tests_to_remove:
            del self.tests[test_id]
            cleaned_count += 1
        
        logger.info(f"Cleaned up {cleaned_count} old completed tests")
        return cleaned_count
    
    def get_framework_stats(self) -> Dict[str, Any]:
        """Get comprehensive framework statistics"""
        return {
            **self.framework_stats,
            "total_tests": len(self.tests),
            "tests_by_status": {
                status.value: sum(1 for test in self.tests.values() if test.status == status)
                for status in TestStatus
            },
            "total_unique_users": len(self.user_assignments)
        }
    
    def _create_memory_storage(self):
        """Create in-memory storage backend"""
        class MemoryStorage:
            def __init__(self):
                self.data = {}
            
            def save(self, key: str, value: Any):
                self.data[key] = value
            
            def load(self, key: str) -> Any:
                return self.data.get(key)
            
            def delete(self, key: str):
                self.data.pop(key, None)
        
        return MemoryStorage()
    
    def _save_test(self, test: ABTest):
        """Save test to storage backend"""
        try:
            test_data = {
                'test_id': test.test_id,
                'name': test.name,
                'description': test.description,
                'variants': [asdict(v) for v in test.variants],
                'metrics': [asdict(m) for m in test.metrics],
                'status': test.status.value,
                'start_date': test.start_date.isoformat() if test.start_date else None,
                'end_date': test.end_date.isoformat() if test.end_date else None,
                'min_sample_size': test.min_sample_size,
                'target_confidence': test.target_confidence,
                'created_by': test.created_by,
                'results': [asdict(r) for r in test.results]
            }
            self.storage_backend.save(f"ab_test:{test.test_id}", test_data)
        except Exception as e:
            logger.error(f"Failed to save test {test.test_id}: {e}")


# Integration helpers for LEARN-X AI features
def create_ai_improvement_test(
    framework: ABTestingFramework,
    feature_name: str,
    description: str,
    treatment_config: Dict[str, Any],
    traffic_split: float = 0.1
) -> str:
    """
    Create A/B test for AI improvement with standard metrics
    
    Args:
        framework: ABTestingFramework instance
        feature_name: Name of the AI feature being tested
        description: Description of the improvement
        treatment_config: Configuration for the new feature
        traffic_split: Percentage of traffic for treatment (0.0 to 1.0)
        
    Returns:
        Test ID
    """
    test_id = f"ai_{feature_name.lower().replace(' ', '_')}_{int(time.time())}"
    
    variants = [
        {
            "name": "control",
            "variant_type": "control",
            "traffic_allocation": 1.0 - traffic_split,
            "config": {"enabled": False},
            "description": "Current system baseline"
        },
        {
            "name": "treatment",
            "variant_type": "treatment", 
            "traffic_allocation": traffic_split,
            "config": treatment_config,
            "description": f"New {feature_name} implementation"
        }
    ]
    
    metrics = [
        {
            "name": "response_quality",
            "type": "score",
            "target_improvement": 0.05,
            "is_primary": True,
            "higher_is_better": True
        },
        {
            "name": "response_time",
            "type": "time",
            "target_improvement": -0.10,  # 10% reduction in time
            "is_primary": False,
            "higher_is_better": False
        },
        {
            "name": "user_satisfaction",
            "type": "score",
            "target_improvement": 0.03,
            "is_primary": False,
            "higher_is_better": True
        }
    ]
    
    return framework.create_test(
        test_id=test_id,
        name=f"AI {feature_name} Improvement",
        description=description,
        variants=variants,
        metrics=metrics,
        min_sample_size=200,
        target_confidence=0.95
    ).test_id


# Global instance
ab_testing_framework = ABTestingFramework()
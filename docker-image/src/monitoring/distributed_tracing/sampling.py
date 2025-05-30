"""
Sampling strategies for distributed tracing.

This module provides various sampling strategies to control the volume of
traces collected while maintaining visibility into system behavior.
"""
import random
import time
import hashlib
from typing import Dict, Any, Optional, Protocol
from abc import ABC, abstractmethod


class SamplingDecision:
    """Result of a sampling decision."""
    
    def __init__(self, sampled: bool, tags: Optional[Dict[str, Any]] = None):
        """Initialize sampling decision.
        
        Args:
            sampled: Whether the trace should be sampled
            tags: Optional tags to add to the span
        """
        self.sampled = sampled
        self.tags = tags or {}


class SamplingStrategy(ABC):
    """Abstract base class for sampling strategies."""
    
    @abstractmethod
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Determine if a trace should be sampled.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision indicating whether to sample
        """
        pass


class AlwaysSampler(SamplingStrategy):
    """Sampler that always samples (100% sampling rate)."""
    
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Always return true for sampling.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision with sampled=True
        """
        return SamplingDecision(sampled=True, tags={"sampler.type": "always"})


class NeverSampler(SamplingStrategy):
    """Sampler that never samples (0% sampling rate)."""
    
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Always return false for sampling.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision with sampled=False
        """
        return SamplingDecision(sampled=False, tags={"sampler.type": "never"})


class ProbabilisticSampler(SamplingStrategy):
    """Sampler that samples based on a probability."""
    
    def __init__(self, sampling_rate: float):
        """Initialize with sampling rate.
        
        Args:
            sampling_rate: Probability of sampling (0.0 to 1.0)
        """
        if not 0.0 <= sampling_rate <= 1.0:
            raise ValueError("Sampling rate must be between 0.0 and 1.0")
        self.sampling_rate = sampling_rate
    
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Sample based on probability.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision based on random probability
        """
        sampled = random.random() < self.sampling_rate
        return SamplingDecision(
            sampled=sampled, 
            tags={
                "sampler.type": "probabilistic",
                "sampler.param": self.sampling_rate
            }
        )


class RateLimitingSampler(SamplingStrategy):
    """Sampler that limits the rate of sampled traces."""
    
    def __init__(self, max_traces_per_second: float):
        """Initialize with rate limit.
        
        Args:
            max_traces_per_second: Maximum number of traces to sample per second
        """
        if max_traces_per_second <= 0:
            raise ValueError("Max traces per second must be positive")
        
        self.max_traces_per_second = max_traces_per_second
        self.min_interval = 1.0 / max_traces_per_second
        self.last_sample_time = 0.0
    
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Sample based on rate limit.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision based on rate limit
        """
        current_time = time.time()
        time_since_last = current_time - self.last_sample_time
        
        if time_since_last >= self.min_interval:
            self.last_sample_time = current_time
            return SamplingDecision(
                sampled=True,
                tags={
                    "sampler.type": "rate_limiting",
                    "sampler.param": self.max_traces_per_second
                }
            )
        
        return SamplingDecision(sampled=False)


class AdaptiveSampler(SamplingStrategy):
    """Sampler that adapts sampling rate based on system load."""
    
    def __init__(self, target_rate: float = 1.0, 
                 min_rate: float = 0.01, 
                 max_rate: float = 1.0):
        """Initialize adaptive sampler.
        
        Args:
            target_rate: Target sampling rate under normal conditions
            min_rate: Minimum sampling rate under high load
            max_rate: Maximum sampling rate under low load
        """
        self.target_rate = target_rate
        self.min_rate = min_rate
        self.max_rate = max_rate
        self.current_rate = target_rate
        
        # Track recent decisions for adaptation
        self.decision_window = []
        self.window_size = 1000
        self.last_adjustment = time.time()
        self.adjustment_interval = 60.0  # Adjust every minute
    
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Sample based on adaptive rate.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision based on adaptive rate
        """
        # Check if we need to adjust the rate
        current_time = time.time()
        if current_time - self.last_adjustment > self.adjustment_interval:
            self._adjust_rate()
            self.last_adjustment = current_time
        
        # Make sampling decision
        sampled = random.random() < self.current_rate
        
        # Track decision
        self.decision_window.append(sampled)
        if len(self.decision_window) > self.window_size:
            self.decision_window.pop(0)
        
        return SamplingDecision(
            sampled=sampled,
            tags={
                "sampler.type": "adaptive",
                "sampler.param": self.current_rate
            }
        )
    
    def _adjust_rate(self) -> None:
        """Adjust sampling rate based on recent history."""
        if not self.decision_window:
            return
        
        # Calculate actual sampling rate
        actual_rate = sum(self.decision_window) / len(self.decision_window)
        
        # Simple adjustment logic
        if actual_rate > self.target_rate * 1.2:
            # Reduce rate if sampling too much
            self.current_rate *= 0.9
        elif actual_rate < self.target_rate * 0.8:
            # Increase rate if sampling too little
            self.current_rate *= 1.1
        
        # Clamp to min/max
        self.current_rate = max(self.min_rate, min(self.max_rate, self.current_rate))


class PriorityBasedSampler(SamplingStrategy):
    """Sampler that samples based on operation priority."""
    
    def __init__(self, default_rate: float = 0.1):
        """Initialize priority-based sampler.
        
        Args:
            default_rate: Default sampling rate for operations without priority
        """
        self.default_rate = default_rate
        self.priority_rates = {
            "critical": 1.0,      # Always sample critical operations
            "high": 0.5,          # 50% sampling for high priority
            "medium": 0.1,        # 10% sampling for medium priority
            "low": 0.01,          # 1% sampling for low priority
        }
        self.operation_priorities: Dict[str, str] = {}
    
    def set_operation_priority(self, operation_name: str, priority: str) -> None:
        """Set priority for an operation.
        
        Args:
            operation_name: Name of the operation
            priority: Priority level ("critical", "high", "medium", "low")
        """
        if priority not in self.priority_rates:
            raise ValueError(f"Invalid priority: {priority}")
        self.operation_priorities[operation_name] = priority
    
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Sample based on operation priority.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision based on priority
        """
        # Check if operation has explicit priority
        priority = self.operation_priorities.get(operation_name)
        
        # Check tags for priority hint
        if not priority:
            priority = tags.get("priority", tags.get("sampling.priority"))
        
        # Get sampling rate based on priority
        if priority and priority in self.priority_rates:
            rate = self.priority_rates[priority]
        else:
            rate = self.default_rate
            priority = "default"
        
        sampled = random.random() < rate
        
        return SamplingDecision(
            sampled=sampled,
            tags={
                "sampler.type": "priority",
                "sampler.priority": priority,
                "sampler.param": rate
            }
        )


class ConsistentSampler(SamplingStrategy):
    """Sampler that makes consistent decisions for the same trace ID."""
    
    def __init__(self, sampling_rate: float):
        """Initialize consistent sampler.
        
        Args:
            sampling_rate: Probability of sampling (0.0 to 1.0)
        """
        if not 0.0 <= sampling_rate <= 1.0:
            raise ValueError("Sampling rate must be between 0.0 and 1.0")
        self.sampling_rate = sampling_rate
        self.threshold = int(sampling_rate * (2**64 - 1))
    
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Sample consistently based on trace ID.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision that's consistent for the same trace_id
        """
        # Hash the trace ID to get a consistent value
        hash_bytes = hashlib.md5(trace_id.encode()).digest()
        hash_value = int.from_bytes(hash_bytes[:8], byteorder='big')
        
        sampled = hash_value < self.threshold
        
        return SamplingDecision(
            sampled=sampled,
            tags={
                "sampler.type": "consistent",
                "sampler.param": self.sampling_rate
            }
        )


class CompositeSampler(SamplingStrategy):
    """Sampler that combines multiple sampling strategies."""
    
    def __init__(self, samplers: Dict[str, SamplingStrategy], 
                 default_sampler: Optional[SamplingStrategy] = None):
        """Initialize composite sampler.
        
        Args:
            samplers: Map of operation patterns to samplers
            default_sampler: Default sampler for unmatched operations
        """
        self.samplers = samplers
        self.default_sampler = default_sampler or AlwaysSampler()
    
    def should_sample(self, trace_id: str, operation_name: str, 
                     tags: Dict[str, Any]) -> SamplingDecision:
        """Sample based on operation-specific sampler.
        
        Args:
            trace_id: The trace ID
            operation_name: Name of the operation
            tags: Initial tags for the span
            
        Returns:
            SamplingDecision from the appropriate sampler
        """
        # Find matching sampler
        for pattern, sampler in self.samplers.items():
            if pattern in operation_name:
                return sampler.should_sample(trace_id, operation_name, tags)
        
        # Use default sampler
        return self.default_sampler.should_sample(trace_id, operation_name, tags)
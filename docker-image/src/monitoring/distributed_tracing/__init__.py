"""
Distributed tracing and APM (Application Performance Monitoring) module.

This package provides comprehensive tracing capabilities for production monitoring.
It includes span management, context handling, performance profiling, and APM data collection.
"""

# Core tracing components
from .span import TraceSpan
from .context import TraceContext, trace_context
from .tracer import DistributedTracer, tracer

# Performance monitoring
from .profiler import PerformanceProfiler
from .apm_collector import APMCollector, apm_collector

# Decorators
from .decorators import trace_function, trace_database_query

# Serialization utilities
from .serialization import TraceSerializer

# Sampling strategies
from .sampling import (
    SamplingStrategy,
    SamplingDecision,
    AlwaysSampler,
    NeverSampler,
    ProbabilisticSampler,
    RateLimitingSampler,
    AdaptiveSampler,
    PriorityBasedSampler,
    ConsistentSampler,
    CompositeSampler,
)

# Exporters
from .exporters import (
    SpanExporter,
    JaegerExporter,
    ZipkinExporter,
    PrometheusExporter,
    ConsoleExporter,
    BatchSpanExporter,
    CompositeExporter,
)

# Export key functions and classes
__all__ = [
    # Core components
    'TraceSpan',
    'TraceContext',
    'trace_context',
    'DistributedTracer',
    'tracer',
    
    # Performance monitoring
    'PerformanceProfiler',
    'APMCollector',
    'apm_collector',
    
    # Decorators
    'trace_function',
    'trace_database_query',
    
    # Serialization
    'TraceSerializer',
    
    # Sampling
    'SamplingStrategy',
    'SamplingDecision',
    'AlwaysSampler',
    'NeverSampler',
    'ProbabilisticSampler',
    'RateLimitingSampler',
    'AdaptiveSampler',
    'PriorityBasedSampler',
    'ConsistentSampler',
    'CompositeSampler',
    
    # Exporters
    'SpanExporter',
    'JaegerExporter',
    'ZipkinExporter',
    'PrometheusExporter',
    'ConsoleExporter',
    'BatchSpanExporter',
    'CompositeExporter',
]
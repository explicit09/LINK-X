"""
Distributed tracing and APM (Application Performance Monitoring) module.

This is a compatibility wrapper for the refactored distributed_tracing package.
All functionality has been modularized into separate components while maintaining
backward compatibility.

Original file backed up as distributed_tracing_original.py
"""

# Import all components from the modularized package
from .distributed_tracing import (
    # Core components
    TraceSpan,
    TraceContext,
    trace_context,
    DistributedTracer,
    tracer,
    
    # Performance monitoring
    PerformanceProfiler,
    APMCollector,
    apm_collector,
    
    # Decorators
    trace_function,
    trace_database_query,
    
    # Serialization
    TraceSerializer,
    
    # Sampling strategies
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
    
    # Exporters
    SpanExporter,
    JaegerExporter,
    ZipkinExporter,
    PrometheusExporter,
    ConsoleExporter,
    BatchSpanExporter,
    CompositeExporter,
)

# Re-export all components for backward compatibility
__all__ = [
    # Original exports (for backward compatibility)
    'tracer',
    'trace_context', 
    'PerformanceProfiler',
    'trace_function',
    'trace_database_query',
    'apm_collector',
    'TraceSpan',
    'DistributedTracer',
    
    # Additional exports
    'TraceContext',
    'APMCollector',
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
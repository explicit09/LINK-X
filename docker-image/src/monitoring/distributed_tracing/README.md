# Distributed Tracing Module

This module provides comprehensive distributed tracing and Application Performance Monitoring (APM) capabilities for the LINK-X1 backend.

## Architecture

The module has been refactored into a modular architecture with the following components:

### Core Components

- **`span.py`**: Defines the `TraceSpan` class representing individual spans in a distributed trace
- **`context.py`**: Provides thread-local context management for tracking current traces and spans
- **`tracer.py`**: Implements the main `DistributedTracer` class for managing traces

### Performance Monitoring

- **`profiler.py`**: Advanced performance profiler with memory and CPU tracking
- **`apm_collector.py`**: APM data collector for system metrics and trace analytics

### Utilities

- **`decorators.py`**: Decorators for automatic tracing of functions and database queries
- **`serialization.py`**: Utilities for serializing traces to various formats (Jaeger, Zipkin, OTLP)
- **`sampling.py`**: Various sampling strategies to control trace volume
- **`exporters.py`**: Exporters for sending traces to different backends
- **`config.py`**: Configuration utilities and examples

## Usage

### Basic Usage

```python
from monitoring.distributed_tracing import tracer, trace_function

# Using context manager
with tracer.trace("my_operation", user_id=123) as span:
    span.add_tag("key", "value")
    span.add_log("Processing started")
    # Your code here

# Using decorator
@trace_function()
def my_function():
    # Your code here
    pass
```

### Performance Profiling

```python
from monitoring.distributed_tracing import PerformanceProfiler

with PerformanceProfiler("data_processing") as profiler:
    # Process data
    profiler.checkpoint("data_loaded")
    # Transform data
    profiler.checkpoint("data_transformed")
    # Save results
```

### Sampling Strategies

```python
from monitoring.distributed_tracing import ProbabilisticSampler, tracer

# Sample 10% of traces
sampler = ProbabilisticSampler(0.1)

# Use with tracer
if sampler.should_sample(trace_id, operation, tags).sampled:
    with tracer.trace("operation") as span:
        # Traced code
```

### Exporting Traces

```python
from monitoring.distributed_tracing import (
    JaegerExporter, 
    BatchSpanExporter,
    tracer
)

# Create exporter
jaeger = JaegerExporter(endpoint="http://localhost:14268/api/traces")
exporter = BatchSpanExporter(jaeger)

# Export spans
spans = tracer.get_active_spans()
exporter.export(spans)
```

### Configuration

The module can be configured using environment variables:

```bash
# Service configuration
export TRACING_SERVICE_NAME=my-service

# Sampling configuration
export TRACING_SAMPLING_STRATEGY=adaptive
export TRACING_SAMPLING_RATE=0.1

# Exporter configuration
export TRACING_EXPORTER=jaeger,prometheus
export JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# Batching configuration
export TRACING_BATCH_ENABLED=true
export TRACING_BATCH_SIZE=100
```

## Sampling Strategies

The module provides various sampling strategies:

- **AlwaysSampler**: Samples all traces (100%)
- **NeverSampler**: Samples no traces (0%)
- **ProbabilisticSampler**: Random sampling based on probability
- **RateLimitingSampler**: Limits traces per second
- **AdaptiveSampler**: Adjusts sampling rate based on load
- **PriorityBasedSampler**: Samples based on operation priority
- **ConsistentSampler**: Consistent decisions for same trace ID
- **CompositeSampler**: Combines multiple strategies

## Exporters

Supported trace exporters:

- **JaegerExporter**: Sends traces to Jaeger
- **ZipkinExporter**: Sends traces to Zipkin
- **PrometheusExporter**: Exposes metrics to Prometheus
- **ConsoleExporter**: Prints traces to console (debugging)
- **BatchSpanExporter**: Batches spans before export
- **CompositeExporter**: Sends to multiple exporters

## Migration from Original Module

The refactored module maintains full backward compatibility. The original `distributed_tracing.py` file now serves as a compatibility wrapper that imports from the modularized components.

All existing code using the module will continue to work without changes:

```python
# This still works
from monitoring.distributed_tracing import tracer, trace_function
```

## Best Practices

1. **Use appropriate sampling**: Don't sample 100% in production
2. **Add meaningful tags**: Include user IDs, request IDs, etc.
3. **Use performance profiler** for critical operations
4. **Configure batching** for high-volume environments
5. **Monitor APM metrics** to understand system behavior

## Example: Complete Setup

```python
from monitoring.distributed_tracing import (
    tracer,
    TracingConfig,
    AdaptiveSampler,
    BatchSpanExporter,
    CompositeExporter,
    JaegerExporter,
    PrometheusExporter,
)

# Configure from environment
config = TracingConfig()

# Create custom sampler
sampler = AdaptiveSampler(target_rate=0.1)

# Create exporters
jaeger = JaegerExporter(endpoint=config.jaeger_endpoint)
prometheus = PrometheusExporter()
composite = CompositeExporter([jaeger, prometheus])
exporter = BatchSpanExporter(composite)

# Configure tracer
config.configure_tracer(tracer)

# Use in application
@trace_function()
def process_request(request_id):
    with tracer.trace("validate_request", request_id=request_id) as span:
        # Validation logic
        pass
    
    with tracer.trace("process_data", request_id=request_id) as span:
        # Processing logic
        pass
```

## Testing

The modular architecture makes testing easier:

```python
from monitoring.distributed_tracing import (
    TraceSpan,
    NeverSampler,
    ConsoleExporter,
)

# Use NeverSampler in tests to disable tracing
sampler = NeverSampler()

# Use ConsoleExporter for debugging
exporter = ConsoleExporter(pretty_print=True)

# Test individual components
span = TraceSpan(
    trace_id="test-trace",
    span_id="test-span",
    parent_span_id=None,
    operation_name="test",
    start_time=time.time()
)
span.finish()
```
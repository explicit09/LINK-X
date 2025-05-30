"""
Configuration utilities for distributed tracing.

This module provides configuration helpers and examples for setting up
distributed tracing with various backends and sampling strategies.
"""
import os
import logging
from typing import Optional, Dict, Any

from .tracer import DistributedTracer
from .sampling import (
    SamplingStrategy,
    AlwaysSampler,
    ProbabilisticSampler,
    RateLimitingSampler,
    AdaptiveSampler,
    PriorityBasedSampler,
    CompositeSampler,
)
from .exporters import (
    SpanExporter,
    JaegerExporter,
    ZipkinExporter,
    PrometheusExporter,
    ConsoleExporter,
    BatchSpanExporter,
    CompositeExporter,
)

logger = logging.getLogger(__name__)


class TracingConfig:
    """Configuration for distributed tracing."""
    
    def __init__(self):
        """Initialize tracing configuration from environment variables."""
        # Service configuration
        self.service_name = os.getenv('TRACING_SERVICE_NAME', 'learn-x-backend')
        
        # Sampling configuration
        self.sampling_rate = float(os.getenv('TRACING_SAMPLING_RATE', '1.0'))
        self.sampling_strategy = os.getenv('TRACING_SAMPLING_STRATEGY', 'probabilistic')
        
        # Exporter configuration
        self.exporter_type = os.getenv('TRACING_EXPORTER', 'console')
        self.jaeger_endpoint = os.getenv('JAEGER_ENDPOINT', 'http://localhost:14268/api/traces')
        self.zipkin_endpoint = os.getenv('ZIPKIN_ENDPOINT', 'http://localhost:9411/api/v2/spans')
        
        # Batching configuration
        self.batch_enabled = os.getenv('TRACING_BATCH_ENABLED', 'true').lower() == 'true'
        self.batch_size = int(os.getenv('TRACING_BATCH_SIZE', '100'))
        self.batch_delay_ms = int(os.getenv('TRACING_BATCH_DELAY_MS', '5000'))
        
        # Debug configuration
        self.debug_enabled = os.getenv('TRACING_DEBUG', 'false').lower() == 'true'
    
    def create_sampler(self) -> SamplingStrategy:
        """Create sampling strategy based on configuration.
        
        Returns:
            Configured sampling strategy
        """
        if self.sampling_strategy == 'always':
            return AlwaysSampler()
        
        elif self.sampling_strategy == 'probabilistic':
            return ProbabilisticSampler(self.sampling_rate)
        
        elif self.sampling_strategy == 'rate_limiting':
            max_traces_per_second = float(os.getenv('TRACING_RATE_LIMIT', '10.0'))
            return RateLimitingSampler(max_traces_per_second)
        
        elif self.sampling_strategy == 'adaptive':
            return AdaptiveSampler(
                target_rate=self.sampling_rate,
                min_rate=0.001,
                max_rate=1.0
            )
        
        elif self.sampling_strategy == 'priority':
            sampler = PriorityBasedSampler(default_rate=self.sampling_rate)
            
            # Configure priority operations from environment
            critical_ops = os.getenv('TRACING_CRITICAL_OPS', '').split(',')
            for op in critical_ops:
                if op.strip():
                    sampler.set_operation_priority(op.strip(), 'critical')
            
            return sampler
        
        elif self.sampling_strategy == 'composite':
            # Create composite sampler with different strategies per operation
            samplers = {
                'db.': ProbabilisticSampler(0.1),  # 10% for database operations
                'api.': ProbabilisticSampler(0.5),  # 50% for API operations
                'file.': AlwaysSampler(),  # Always sample file operations
            }
            return CompositeSampler(samplers, default_sampler=ProbabilisticSampler(self.sampling_rate))
        
        else:
            logger.warning(f"Unknown sampling strategy: {self.sampling_strategy}, using probabilistic")
            return ProbabilisticSampler(self.sampling_rate)
    
    def create_exporter(self) -> SpanExporter:
        """Create span exporter based on configuration.
        
        Returns:
            Configured span exporter
        """
        exporters = []
        
        # Parse exporter types (comma-separated for multiple exporters)
        exporter_types = [e.strip() for e in self.exporter_type.split(',')]
        
        for exporter_type in exporter_types:
            if exporter_type == 'jaeger':
                exporters.append(JaegerExporter(
                    endpoint=self.jaeger_endpoint,
                    service_name=self.service_name
                ))
                
            elif exporter_type == 'zipkin':
                exporters.append(ZipkinExporter(
                    endpoint=self.zipkin_endpoint
                ))
                
            elif exporter_type == 'prometheus':
                exporters.append(PrometheusExporter())
                
            elif exporter_type == 'console':
                exporters.append(ConsoleExporter(pretty_print=self.debug_enabled))
                
            else:
                logger.warning(f"Unknown exporter type: {exporter_type}")
        
        # Use console exporter if no valid exporters configured
        if not exporters:
            logger.warning("No valid exporters configured, using console exporter")
            exporters.append(ConsoleExporter())
        
        # Create composite exporter if multiple exporters
        if len(exporters) == 1:
            exporter = exporters[0]
        else:
            exporter = CompositeExporter(exporters)
        
        # Wrap in batch exporter if enabled
        if self.batch_enabled:
            exporter = BatchSpanExporter(
                exporter=exporter,
                max_batch_size=self.batch_size,
                schedule_delay_millis=self.batch_delay_ms
            )
        
        return exporter
    
    def configure_tracer(self, tracer: DistributedTracer) -> None:
        """Configure the global tracer with settings.
        
        Args:
            tracer: The tracer to configure
        """
        # Update service name
        tracer.service_name = self.service_name
        
        # Configure max completed traces
        max_traces = int(os.getenv('TRACING_MAX_COMPLETED_TRACES', '1000'))
        tracer.max_completed_traces = max_traces
        
        logger.info(
            f"Configured tracer: service={self.service_name}, "
            f"sampling={self.sampling_strategy}@{self.sampling_rate}, "
            f"exporter={self.exporter_type}, batch={self.batch_enabled}"
        )


def create_configured_tracer() -> DistributedTracer:
    """Create a tracer with configuration from environment.
    
    Returns:
        Configured DistributedTracer instance
    """
    config = TracingConfig()
    tracer = DistributedTracer(service_name=config.service_name)
    config.configure_tracer(tracer)
    return tracer


def setup_tracing_middleware(app: Any, config: Optional[TracingConfig] = None) -> None:
    """Setup tracing middleware for a web application.
    
    Args:
        app: The web application (Flask, FastAPI, etc.)
        config: Optional tracing configuration
    """
    if config is None:
        config = TracingConfig()
    
    # Create sampler and exporter
    sampler = config.create_sampler()
    exporter = config.create_exporter()
    
    # Configure based on framework
    if hasattr(app, 'before_request'):  # Flask
        from .integrations.flask import setup_flask_tracing
        setup_flask_tracing(app, sampler, exporter)
        
    elif hasattr(app, 'add_middleware'):  # FastAPI
        from .integrations.fastapi import setup_fastapi_tracing
        setup_fastapi_tracing(app, sampler, exporter)
        
    else:
        logger.warning("Unknown application framework for tracing setup")


# Example configurations for different environments
DEVELOPMENT_CONFIG = {
    'TRACING_SERVICE_NAME': 'learn-x-dev',
    'TRACING_SAMPLING_RATE': '1.0',  # Sample everything in dev
    'TRACING_SAMPLING_STRATEGY': 'always',
    'TRACING_EXPORTER': 'console',
    'TRACING_BATCH_ENABLED': 'false',
    'TRACING_DEBUG': 'true',
}

PRODUCTION_CONFIG = {
    'TRACING_SERVICE_NAME': 'learn-x-prod',
    'TRACING_SAMPLING_RATE': '0.1',  # Sample 10% in production
    'TRACING_SAMPLING_STRATEGY': 'adaptive',
    'TRACING_EXPORTER': 'jaeger,prometheus',
    'TRACING_BATCH_ENABLED': 'true',
    'TRACING_BATCH_SIZE': '500',
    'TRACING_DEBUG': 'false',
    'JAEGER_ENDPOINT': 'http://jaeger-collector:14268/api/traces',
}

TESTING_CONFIG = {
    'TRACING_SERVICE_NAME': 'learn-x-test',
    'TRACING_SAMPLING_RATE': '0.0',  # No sampling in tests by default
    'TRACING_SAMPLING_STRATEGY': 'never',
    'TRACING_EXPORTER': 'console',
    'TRACING_BATCH_ENABLED': 'false',
    'TRACING_DEBUG': 'false',
}
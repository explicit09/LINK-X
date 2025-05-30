"""
Exporters for sending trace data to various backends.

This module provides exporters for Jaeger, Zipkin, Prometheus, and other
tracing backends.
"""
import json
import logging
import time
from typing import List, Dict, Any, Optional, Protocol
from abc import ABC, abstractmethod
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, Future

from .span import TraceSpan
from .serialization import TraceSerializer

logger = logging.getLogger(__name__)


class SpanExporter(ABC):
    """Abstract base class for span exporters."""
    
    @abstractmethod
    def export(self, spans: List[TraceSpan]) -> bool:
        """Export spans to the backend.
        
        Args:
            spans: List of spans to export
            
        Returns:
            True if export was successful, False otherwise
        """
        pass
    
    @abstractmethod
    def shutdown(self) -> None:
        """Shutdown the exporter and cleanup resources."""
        pass


class JaegerExporter(SpanExporter):
    """Exporter for sending spans to Jaeger."""
    
    def __init__(self, endpoint: str = "http://localhost:14268/api/traces",
                 service_name: str = "learn-x-backend",
                 timeout: float = 10.0):
        """Initialize Jaeger exporter.
        
        Args:
            endpoint: Jaeger collector endpoint
            service_name: Service name for spans
            timeout: Request timeout in seconds
        """
        self.endpoint = endpoint
        self.service_name = service_name
        self.timeout = timeout
        self.session_active = True
    
    def export(self, spans: List[TraceSpan]) -> bool:
        """Export spans to Jaeger.
        
        Args:
            spans: List of spans to export
            
        Returns:
            True if export was successful
        """
        if not self.session_active or not spans:
            return False
        
        try:
            # Convert spans to Jaeger format
            jaeger_spans = TraceSerializer.serialize_batch(spans, format="jaeger")
            
            # Group by trace ID
            traces: Dict[str, List[Dict[str, Any]]] = {}
            for span in jaeger_spans:
                trace_id = span["traceID"]
                if trace_id not in traces:
                    traces[trace_id] = []
                traces[trace_id].append(span)
            
            # Create Jaeger batch format
            batch = {
                "data": [
                    {
                        "traceID": trace_id,
                        "spans": trace_spans,
                        "process": {
                            "serviceName": self.service_name,
                            "tags": []
                        }
                    }
                    for trace_id, trace_spans in traces.items()
                ]
            }
            
            # Send to Jaeger
            data = json.dumps(batch).encode('utf-8')
            req = urllib.request.Request(
                self.endpoint,
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                if response.status == 202:  # Accepted
                    logger.debug(f"Successfully exported {len(spans)} spans to Jaeger")
                    return True
                else:
                    logger.warning(f"Jaeger returned status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to export spans to Jaeger: {e}")
            return False
    
    def shutdown(self) -> None:
        """Shutdown the exporter."""
        self.session_active = False


class ZipkinExporter(SpanExporter):
    """Exporter for sending spans to Zipkin."""
    
    def __init__(self, endpoint: str = "http://localhost:9411/api/v2/spans",
                 timeout: float = 10.0):
        """Initialize Zipkin exporter.
        
        Args:
            endpoint: Zipkin collector endpoint
            timeout: Request timeout in seconds
        """
        self.endpoint = endpoint
        self.timeout = timeout
        self.session_active = True
    
    def export(self, spans: List[TraceSpan]) -> bool:
        """Export spans to Zipkin.
        
        Args:
            spans: List of spans to export
            
        Returns:
            True if export was successful
        """
        if not self.session_active or not spans:
            return False
        
        try:
            # Convert spans to Zipkin format
            zipkin_spans = TraceSerializer.serialize_batch(spans, format="zipkin")
            
            # Send to Zipkin
            data = json.dumps(zipkin_spans).encode('utf-8')
            req = urllib.request.Request(
                self.endpoint,
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                if response.status in (200, 202):  # OK or Accepted
                    logger.debug(f"Successfully exported {len(spans)} spans to Zipkin")
                    return True
                else:
                    logger.warning(f"Zipkin returned status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to export spans to Zipkin: {e}")
            return False
    
    def shutdown(self) -> None:
        """Shutdown the exporter."""
        self.session_active = False


class PrometheusExporter(SpanExporter):
    """Exporter for exposing metrics to Prometheus."""
    
    def __init__(self, registry=None):
        """Initialize Prometheus exporter.
        
        Args:
            registry: Prometheus registry (uses default if None)
        """
        try:
            from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
            
            self.registry = registry or CollectorRegistry()
            
            # Define metrics
            self.span_duration = Histogram(
                'trace_span_duration_seconds',
                'Duration of trace spans',
                ['service', 'operation', 'status'],
                registry=self.registry
            )
            
            self.span_counter = Counter(
                'trace_span_total',
                'Total number of trace spans',
                ['service', 'operation', 'status'],
                registry=self.registry
            )
            
            self.active_spans = Gauge(
                'trace_active_spans',
                'Number of currently active spans',
                ['service'],
                registry=self.registry
            )
            
            self.prometheus_available = True
            
        except ImportError:
            logger.warning("prometheus_client not available")
            self.prometheus_available = False
    
    def export(self, spans: List[TraceSpan]) -> bool:
        """Export span metrics to Prometheus.
        
        Args:
            spans: List of spans to export
            
        Returns:
            True if export was successful
        """
        if not self.prometheus_available or not spans:
            return False
        
        try:
            for span in spans:
                service = span.tags.get('service.name', 'unknown')
                operation = span.operation_name
                status = span.status
                
                # Record metrics
                if span.duration is not None:
                    self.span_duration.labels(
                        service=service,
                        operation=operation,
                        status=status
                    ).observe(span.duration)
                
                self.span_counter.labels(
                    service=service,
                    operation=operation,
                    status=status
                ).inc()
            
            logger.debug(f"Successfully exported {len(spans)} span metrics to Prometheus")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export metrics to Prometheus: {e}")
            return False
    
    def shutdown(self) -> None:
        """Shutdown the exporter."""
        pass  # Prometheus doesn't need explicit shutdown


class ConsoleExporter(SpanExporter):
    """Exporter that prints spans to console (for debugging)."""
    
    def __init__(self, pretty_print: bool = True):
        """Initialize console exporter.
        
        Args:
            pretty_print: Whether to pretty-print JSON output
        """
        self.pretty_print = pretty_print
    
    def export(self, spans: List[TraceSpan]) -> bool:
        """Export spans to console.
        
        Args:
            spans: List of spans to export
            
        Returns:
            Always returns True
        """
        try:
            for span in spans:
                span_dict = span.to_dict()
                
                if self.pretty_print:
                    print(f"\n--- Span: {span.operation_name} ---")
                    print(json.dumps(span_dict, indent=2, default=str))
                else:
                    print(json.dumps(span_dict, default=str))
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to export spans to console: {e}")
            return False
    
    def shutdown(self) -> None:
        """Shutdown the exporter."""
        pass


class BatchSpanExporter(SpanExporter):
    """Base class for exporters that batch spans before sending."""
    
    def __init__(self, exporter: SpanExporter, 
                 max_batch_size: int = 100,
                 max_queue_size: int = 2048,
                 schedule_delay_millis: int = 5000):
        """Initialize batch exporter.
        
        Args:
            exporter: The underlying exporter to use
            max_batch_size: Maximum spans per batch
            max_queue_size: Maximum spans to queue
            schedule_delay_millis: Delay between export attempts
        """
        self.exporter = exporter
        self.max_batch_size = max_batch_size
        self.max_queue_size = max_queue_size
        self.schedule_delay_millis = schedule_delay_millis
        
        self.queue: List[TraceSpan] = []
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="batch-exporter")
        self.shutdown_flag = False
        
        # Schedule periodic exports
        self._schedule_next_export()
    
    def export(self, spans: List[TraceSpan]) -> bool:
        """Add spans to the export queue.
        
        Args:
            spans: List of spans to export
            
        Returns:
            True if spans were queued successfully
        """
        if self.shutdown_flag:
            return False
        
        # Add to queue
        for span in spans:
            if len(self.queue) < self.max_queue_size:
                self.queue.append(span)
            else:
                logger.warning("Span queue full, dropping span")
                return False
        
        # Export immediately if batch is full
        if len(self.queue) >= self.max_batch_size:
            self._export_batch()
        
        return True
    
    def _export_batch(self) -> None:
        """Export a batch of spans."""
        if not self.queue:
            return
        
        # Get batch
        batch = self.queue[:self.max_batch_size]
        self.queue = self.queue[self.max_batch_size:]
        
        # Export batch
        try:
            success = self.exporter.export(batch)
            if not success:
                logger.warning(f"Failed to export batch of {len(batch)} spans")
        except Exception as e:
            logger.error(f"Error exporting batch: {e}")
    
    def _schedule_next_export(self) -> None:
        """Schedule the next export."""
        if not self.shutdown_flag:
            delay = self.schedule_delay_millis / 1000.0
            self.executor.submit(self._delayed_export, delay)
    
    def _delayed_export(self, delay: float) -> None:
        """Export after a delay."""
        time.sleep(delay)
        if not self.shutdown_flag:
            self._export_batch()
            self._schedule_next_export()
    
    def shutdown(self) -> None:
        """Shutdown the batch exporter."""
        self.shutdown_flag = True
        
        # Export remaining spans
        while self.queue:
            self._export_batch()
        
        # Shutdown executor and underlying exporter
        self.executor.shutdown(wait=True)
        self.exporter.shutdown()


class CompositeExporter(SpanExporter):
    """Exporter that sends spans to multiple exporters."""
    
    def __init__(self, exporters: List[SpanExporter]):
        """Initialize composite exporter.
        
        Args:
            exporters: List of exporters to use
        """
        self.exporters = exporters
    
    def export(self, spans: List[TraceSpan]) -> bool:
        """Export spans to all exporters.
        
        Args:
            spans: List of spans to export
            
        Returns:
            True if at least one exporter succeeded
        """
        success = False
        for exporter in self.exporters:
            try:
                if exporter.export(spans):
                    success = True
            except Exception as e:
                logger.error(f"Error in exporter {type(exporter).__name__}: {e}")
        
        return success
    
    def shutdown(self) -> None:
        """Shutdown all exporters."""
        for exporter in self.exporters:
            try:
                exporter.shutdown()
            except Exception as e:
                logger.error(f"Error shutting down exporter {type(exporter).__name__}: {e}")


# Export all exporter classes
__all__ = [
    'SpanExporter',
    'JaegerExporter',
    'ZipkinExporter',
    'PrometheusExporter',
    'ConsoleExporter',
    'BatchSpanExporter',
    'CompositeExporter',
]
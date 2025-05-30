"""
Main distributed tracer implementation.

This module provides the DistributedTracer class for managing traces and spans.
"""
import time
import uuid
import logging
from typing import Dict, Any, List, Optional, Generator
from contextlib import contextmanager

from .span import TraceSpan
from .context import trace_context

logger = logging.getLogger(__name__)


class DistributedTracer:
    """Main tracer for distributed tracing.
    
    This class manages the lifecycle of traces and spans, including creation,
    completion, and storage of trace data.
    """
    
    def __init__(self, service_name: str = "learn-x-backend"):
        """Initialize the tracer.
        
        Args:
            service_name: Name of the service for tagging spans
        """
        self.service_name = service_name
        self.spans: Dict[str, TraceSpan] = {}
        self.completed_traces: List[Dict[str, Any]] = []
        self.max_completed_traces = 1000  # Keep last 1000 traces
        
    def start_trace(self, operation_name: str, trace_id: Optional[str] = None) -> TraceSpan:
        """Start a new trace with a root span.
        
        Args:
            operation_name: Name of the operation being traced
            trace_id: Optional trace ID (generated if not provided)
            
        Returns:
            The created root span
        """
        if not trace_id:
            trace_id = str(uuid.uuid4())
        
        span_id = str(uuid.uuid4())
        span = TraceSpan(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=None,
            operation_name=operation_name,
            start_time=time.time()
        )
        
        # Add standard tags
        span.add_tag("service.name", self.service_name)
        span.add_tag("operation.name", operation_name)
        
        # Store span and update context
        self.spans[span_id] = span
        trace_context.set_current_trace(trace_id)
        trace_context.set_current_span(span)
        
        return span
    
    def start_span(self, operation_name: str, parent_span: Optional[TraceSpan] = None) -> TraceSpan:
        """Start a child span.
        
        Args:
            operation_name: Name of the operation being traced
            parent_span: Optional parent span (uses current span if not provided)
            
        Returns:
            The created child span
        """
        if not parent_span:
            parent_span = trace_context.get_current_span()
        
        if not parent_span:
            # No parent span, start a new trace
            return self.start_trace(operation_name)
        
        span_id = str(uuid.uuid4())
        span = TraceSpan(
            trace_id=parent_span.trace_id,
            span_id=span_id,
            parent_span_id=parent_span.span_id,
            operation_name=operation_name,
            start_time=time.time()
        )
        
        # Add standard tags
        span.add_tag("service.name", self.service_name)
        span.add_tag("operation.name", operation_name)
        
        # Store span and update context
        self.spans[span_id] = span
        trace_context.set_current_span(span)
        
        return span
    
    def finish_span(self, span: TraceSpan, error: Optional[Exception] = None) -> None:
        """Finish a span and potentially complete its trace.
        
        Args:
            span: The span to finish
            error: Optional exception if the span ended with an error
        """
        span.finish(error)
        
        # Log span completion
        logger.debug(
            f"Span completed: {span.operation_name} "
            f"duration={span.duration:.3f}s status={span.status}"
        )
        
        # Check if this completes a trace (root span)
        if span.parent_span_id is None:
            self._complete_trace(span.trace_id)
    
    def _complete_trace(self, trace_id: str) -> None:
        """Complete a trace and move to completed traces.
        
        Args:
            trace_id: ID of the trace to complete
        """
        # Find all spans belonging to this trace
        trace_spans = [span for span in self.spans.values() if span.trace_id == trace_id]
        
        if trace_spans:
            # Calculate trace statistics
            start_time = min(span.start_time for span in trace_spans)
            end_time = max(span.end_time or span.start_time for span in trace_spans)
            
            trace_data = {
                "trace_id": trace_id,
                "service_name": self.service_name,
                "spans": [span.to_dict() for span in trace_spans],
                "start_time": start_time,
                "duration": end_time - start_time,
                "span_count": len(trace_spans),
                "error_count": sum(1 for span in trace_spans if span.status == "error")
            }
            
            self.completed_traces.append(trace_data)
            
            # Remove from active spans
            for span in trace_spans:
                self.spans.pop(span.span_id, None)
            
            # Limit completed traces
            if len(self.completed_traces) > self.max_completed_traces:
                self.completed_traces = self.completed_traces[-self.max_completed_traces:]
            
            # Log trace completion
            logger.info(
                f"Trace completed: {trace_id} "
                f"duration={trace_data['duration']:.3f}s "
                f"spans={trace_data['span_count']} "
                f"errors={trace_data['error_count']}"
            )
    
    @contextmanager
    def trace(self, operation_name: str, **tags: Any) -> Generator[TraceSpan, None, None]:
        """Context manager for tracing operations.
        
        Args:
            operation_name: Name of the operation to trace
            **tags: Additional tags to add to the span
            
        Yields:
            The created span
        """
        span = self.start_span(operation_name)
        
        # Add provided tags
        for key, value in tags.items():
            span.add_tag(key, value)
        
        try:
            yield span
        except Exception as e:
            span.add_log(f"Error occurred: {str(e)}", level="error")
            self.finish_span(span, error=e)
            raise
        else:
            self.finish_span(span)
        finally:
            # Restore previous span context
            if span.parent_span_id:
                parent_span = self.spans.get(span.parent_span_id)
                if parent_span:
                    trace_context.set_current_span(parent_span)
                else:
                    trace_context.clear_current_span()
            else:
                trace_context.clear_current_span()
    
    def get_trace_by_id(self, trace_id: str) -> Optional[Dict[str, Any]]:
        """Get a completed trace by ID.
        
        Args:
            trace_id: ID of the trace to retrieve
            
        Returns:
            The trace data or None if not found
        """
        for trace in self.completed_traces:
            if trace["trace_id"] == trace_id:
                return trace
        return None
    
    def get_recent_traces(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent completed traces.
        
        Args:
            limit: Maximum number of traces to return
            
        Returns:
            List of recent trace data
        """
        return self.completed_traces[-limit:]
    
    def get_active_spans(self) -> List[TraceSpan]:
        """Get currently active spans.
        
        Returns:
            List of active TraceSpan objects
        """
        return list(self.spans.values())


# Global tracer instance
tracer = DistributedTracer()
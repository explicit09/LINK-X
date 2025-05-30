"""
Thread-local context management for distributed tracing.

This module provides thread-safe context management for tracking the current trace and span.
"""
import threading
from typing import Optional

from .span import TraceSpan


class TraceContext:
    """Thread-local trace context for managing current trace and span.
    
    This class provides thread-safe storage for the current trace ID and span,
    allowing nested operations to properly maintain parent-child relationships.
    """
    
    def __init__(self):
        """Initialize with thread-local storage."""
        self._local = threading.local()
    
    def get_current_trace(self) -> Optional[str]:
        """Get the current trace ID for this thread.
        
        Returns:
            The current trace ID or None if no trace is active
        """
        return getattr(self._local, 'trace_id', None)
    
    def get_current_span(self) -> Optional[TraceSpan]:
        """Get the current span for this thread.
        
        Returns:
            The current TraceSpan or None if no span is active
        """
        return getattr(self._local, 'current_span', None)
    
    def set_current_trace(self, trace_id: str) -> None:
        """Set the current trace ID for this thread.
        
        Args:
            trace_id: The trace ID to set as current
        """
        self._local.trace_id = trace_id
    
    def set_current_span(self, span: TraceSpan) -> None:
        """Set the current span for this thread.
        
        Args:
            span: The TraceSpan to set as current
        """
        self._local.current_span = span
    
    def clear_current_span(self) -> None:
        """Clear the current span for this thread."""
        if hasattr(self._local, 'current_span'):
            self._local.current_span = None
    
    def clear(self) -> None:
        """Clear all context for this thread."""
        if hasattr(self._local, 'trace_id'):
            self._local.trace_id = None
        if hasattr(self._local, 'current_span'):
            self._local.current_span = None


# Global trace context instance
trace_context = TraceContext()
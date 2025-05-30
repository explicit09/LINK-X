"""
Trace span implementation for distributed tracing.

This module provides the TraceSpan class which represents a single span in a distributed trace.
"""
import time
import traceback
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class TraceSpan:
    """Represents a single span in a distributed trace.
    
    Attributes:
        trace_id: Unique identifier for the entire trace
        span_id: Unique identifier for this span
        parent_span_id: ID of the parent span (None for root spans)
        operation_name: Name of the operation being traced
        start_time: Unix timestamp when the span started
        end_time: Unix timestamp when the span ended (None if not finished)
        duration: Duration of the span in seconds (None if not finished)
        tags: Key-value pairs providing metadata about the span
        logs: Time-stamped log entries associated with the span
        status: Current status of the span (started, finished, error)
        error: Error message if the span ended with an error
        stack_trace: Stack trace if the span ended with an error
    """
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    operation_name: str
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    tags: Dict[str, Any] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    status: str = "started"  # started, finished, error
    error: Optional[str] = None
    stack_trace: Optional[str] = None

    def finish(self, error: Optional[Exception] = None) -> None:
        """Finish the span and calculate duration.
        
        Args:
            error: Optional exception if the span ended with an error
        """
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time
        
        if error:
            self.status = "error"
            self.error = str(error)
            self.stack_trace = traceback.format_exc()
        else:
            self.status = "finished"

    def add_tag(self, key: str, value: Any) -> None:
        """Add a tag to the span.
        
        Args:
            key: Tag key
            value: Tag value
        """
        self.tags[key] = value

    def add_log(self, message: str, level: str = "info", **kwargs: Any) -> None:
        """Add a log entry to the span.
        
        Args:
            message: Log message
            level: Log level (default: "info")
            **kwargs: Additional key-value pairs to include in the log
        """
        log_entry = {
            "timestamp": time.time(),
            "level": level,
            "message": message,
            **kwargs
        }
        self.logs.append(log_entry)

    def to_dict(self) -> Dict[str, Any]:
        """Convert span to dictionary for serialization.
        
        Returns:
            Dictionary representation of the span
        """
        return {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "operation_name": self.operation_name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "tags": self.tags,
            "logs": self.logs,
            "status": self.status,
            "error": self.error,
            "stack_trace": self.stack_trace
        }
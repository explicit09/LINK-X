"""
Distributed tracing and APM (Application Performance Monitoring) module.
Provides comprehensive tracing capabilities for production monitoring.
"""
import time
import uuid
import logging
import threading
import traceback
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from contextlib import contextmanager
from dataclasses import dataclass, field
import psutil
import json

logger = logging.getLogger(__name__)

@dataclass
class TraceSpan:
    """Represents a single span in a distributed trace"""
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

    def finish(self, error: Exception = None):
        """Finish the span"""
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time
        
        if error:
            self.status = "error"
            self.error = str(error)
            self.stack_trace = traceback.format_exc()
        else:
            self.status = "finished"

    def add_tag(self, key: str, value: Any):
        """Add a tag to the span"""
        self.tags[key] = value

    def add_log(self, message: str, level: str = "info", **kwargs):
        """Add a log entry to the span"""
        log_entry = {
            "timestamp": time.time(),
            "level": level,
            "message": message,
            **kwargs
        }
        self.logs.append(log_entry)

    def to_dict(self) -> Dict[str, Any]:
        """Convert span to dictionary for serialization"""
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

class TraceContext:
    """Thread-local trace context"""
    
    def __init__(self):
        self._local = threading.local()
    
    def get_current_trace(self) -> Optional[str]:
        """Get current trace ID"""
        return getattr(self._local, 'trace_id', None)
    
    def get_current_span(self) -> Optional[TraceSpan]:
        """Get current span"""
        return getattr(self._local, 'current_span', None)
    
    def set_current_trace(self, trace_id: str):
        """Set current trace ID"""
        self._local.trace_id = trace_id
    
    def set_current_span(self, span: TraceSpan):
        """Set current span"""
        self._local.current_span = span
    
    def clear_current_span(self):
        """Clear current span"""
        self._local.current_span = None

# Global trace context
trace_context = TraceContext()

class DistributedTracer:
    """Main tracer for distributed tracing"""
    
    def __init__(self, service_name: str = "learn-x-backend"):
        self.service_name = service_name
        self.spans: Dict[str, TraceSpan] = {}
        self.completed_traces: List[Dict[str, Any]] = []
        self.max_completed_traces = 1000  # Keep last 1000 traces
        
    def start_trace(self, operation_name: str, trace_id: str = None) -> TraceSpan:
        """Start a new trace"""
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
        
        span.add_tag("service.name", self.service_name)
        span.add_tag("operation.name", operation_name)
        
        self.spans[span_id] = span
        trace_context.set_current_trace(trace_id)
        trace_context.set_current_span(span)
        
        return span
    
    def start_span(self, operation_name: str, parent_span: TraceSpan = None) -> TraceSpan:
        """Start a child span"""
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
        
        span.add_tag("service.name", self.service_name)
        span.add_tag("operation.name", operation_name)
        
        self.spans[span_id] = span
        trace_context.set_current_span(span)
        
        return span
    
    def finish_span(self, span: TraceSpan, error: Exception = None):
        """Finish a span"""
        span.finish(error)
        
        # Log span completion
        logger.debug(
            f"Span completed: {span.operation_name} "
            f"duration={span.duration:.3f}s status={span.status}"
        )
        
        # Check if this completes a trace
        if span.parent_span_id is None:
            self._complete_trace(span.trace_id)
    
    def _complete_trace(self, trace_id: str):
        """Complete a trace and move to completed traces"""
        trace_spans = [span for span in self.spans.values() if span.trace_id == trace_id]
        
        if trace_spans:
            trace_data = {
                "trace_id": trace_id,
                "service_name": self.service_name,
                "spans": [span.to_dict() for span in trace_spans],
                "start_time": min(span.start_time for span in trace_spans),
                "duration": max(span.end_time or span.start_time for span in trace_spans) - 
                           min(span.start_time for span in trace_spans),
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
    def trace(self, operation_name: str, **tags):
        """Context manager for tracing operations"""
        span = self.start_span(operation_name)
        
        # Add tags
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
        """Get a completed trace by ID"""
        for trace in self.completed_traces:
            if trace["trace_id"] == trace_id:
                return trace
        return None
    
    def get_recent_traces(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent completed traces"""
        return self.completed_traces[-limit:]
    
    def get_active_spans(self) -> List[TraceSpan]:
        """Get currently active spans"""
        return list(self.spans.values())

# Global tracer instance
tracer = DistributedTracer()

class PerformanceProfiler:
    """Advanced performance profiler with memory and CPU tracking"""
    
    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        self.start_memory = None
        self.start_cpu = None
        self.checkpoints = []
        self.process = psutil.Process()
    
    def __enter__(self):
        self.start_time = time.time()
        self.start_memory = self.process.memory_info().rss
        self.start_cpu = self.process.cpu_percent()
        return self
    
    def checkpoint(self, name: str, **metadata):
        """Add a performance checkpoint"""
        current_time = time.time()
        current_memory = self.process.memory_info().rss
        current_cpu = self.process.cpu_percent()
        
        checkpoint = {
            "name": name,
            "timestamp": current_time,
            "elapsed_time": current_time - self.start_time,
            "memory_usage": current_memory,
            "memory_delta": current_memory - self.start_memory,
            "cpu_percent": current_cpu,
            "metadata": metadata
        }
        
        self.checkpoints.append(checkpoint)
        
        # Add to current span if available
        current_span = trace_context.get_current_span()
        if current_span:
            current_span.add_log(
                f"Checkpoint: {name}",
                elapsed_time=checkpoint["elapsed_time"],
                memory_mb=checkpoint["memory_usage"] / 1024 / 1024,
                cpu_percent=checkpoint["cpu_percent"],
                **metadata
            )
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        total_time = time.time() - self.start_time
        final_memory = self.process.memory_info().rss
        final_cpu = self.process.cpu_percent()
        
        profile_summary = {
            "profile_name": self.name,
            "total_time": total_time,
            "memory_start": self.start_memory,
            "memory_end": final_memory,
            "memory_delta": final_memory - self.start_memory,
            "cpu_start": self.start_cpu,
            "cpu_end": final_cpu,
            "checkpoint_count": len(self.checkpoints),
            "checkpoints": self.checkpoints
        }
        
        # Log profile summary
        logger.info(
            f"Performance profile '{self.name}' completed: "
            f"time={total_time:.3f}s "
            f"memory_delta={profile_summary['memory_delta']/1024/1024:.1f}MB "
            f"checkpoints={len(self.checkpoints)}"
        )
        
        # Add to current span if available
        current_span = trace_context.get_current_span()
        if current_span:
            current_span.add_tag("profile.total_time", total_time)
            current_span.add_tag("profile.memory_delta_mb", profile_summary['memory_delta']/1024/1024)
            current_span.add_tag("profile.checkpoint_count", len(self.checkpoints))

def trace_function(operation_name: str = None, **span_tags):
    """Decorator to trace function calls"""
    def decorator(func: Callable) -> Callable:
        op_name = operation_name or f"{func.__module__}.{func.__name__}"
        
        def wrapper(*args, **kwargs):
            with tracer.trace(op_name, **span_tags) as span:
                # Add function metadata
                span.add_tag("function.name", func.__name__)
                span.add_tag("function.module", func.__module__)
                span.add_tag("function.args_count", len(args))
                span.add_tag("function.kwargs_count", len(kwargs))
                
                result = func(*args, **kwargs)
                
                # Add result metadata if simple type
                if isinstance(result, (str, int, float, bool)):
                    span.add_tag("function.result_type", type(result).__name__)
                    span.add_tag("function.result_value", str(result)[:100])
                
                return result
        
        return wrapper
    return decorator

def trace_database_query(query_type: str, table: str = None):
    """Decorator to trace database queries"""
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            with tracer.trace(f"db.{query_type}", 
                             db_type="postgresql",
                             db_table=table,
                             query_type=query_type) as span:
                
                # Start performance profiling
                with PerformanceProfiler(f"db_query_{query_type}") as profiler:
                    result = func(*args, **kwargs)
                    
                    # Add query metadata
                    if hasattr(result, '__len__'):
                        try:
                            span.add_tag("db.result_count", len(result))
                        except:
                            pass
                    
                    profiler.checkpoint("query_completed")
                
                return result
        
        return wrapper
    return decorator

class APMCollector:
    """Application Performance Monitoring data collector"""
    
    def __init__(self):
        self.metrics_buffer = []
        self.max_buffer_size = 1000
        
    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect current system metrics"""
        try:
            process = psutil.Process()
            
            metrics = {
                "timestamp": time.time(),
                "memory": {
                    "rss": process.memory_info().rss,
                    "vms": process.memory_info().vms,
                    "percent": process.memory_percent()
                },
                "cpu": {
                    "percent": process.cpu_percent(),
                    "times": process.cpu_times()._asdict()
                },
                "io": process.io_counters()._asdict() if hasattr(process, 'io_counters') else {},
                "threads": process.num_threads(),
                "connections": len(process.connections()) if hasattr(process, 'connections') else 0
            }
            
            # System-wide metrics
            metrics["system"] = {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent,
                "load_avg": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return {}
    
    def collect_trace_metrics(self) -> Dict[str, Any]:
        """Collect trace-related metrics"""
        active_spans = tracer.get_active_spans()
        recent_traces = tracer.get_recent_traces(50)
        
        if not recent_traces:
            return {}
        
        # Calculate trace statistics
        durations = [trace["duration"] for trace in recent_traces]
        error_counts = [trace["error_count"] for trace in recent_traces]
        span_counts = [trace["span_count"] for trace in recent_traces]
        
        metrics = {
            "timestamp": time.time(),
            "active_spans": len(active_spans),
            "recent_traces_count": len(recent_traces),
            "avg_trace_duration": sum(durations) / len(durations) if durations else 0,
            "max_trace_duration": max(durations) if durations else 0,
            "min_trace_duration": min(durations) if durations else 0,
            "total_errors": sum(error_counts),
            "avg_span_count": sum(span_counts) / len(span_counts) if span_counts else 0,
            "error_rate": sum(1 for count in error_counts if count > 0) / len(error_counts) if error_counts else 0
        }
        
        return metrics
    
    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for specified time period"""
        cutoff_time = time.time() - (hours * 3600)
        
        # Filter recent traces
        recent_traces = [
            trace for trace in tracer.completed_traces
            if trace["start_time"] >= cutoff_time
        ]
        
        if not recent_traces:
            return {"message": "No traces found in specified time period"}
        
        # Calculate summary statistics
        durations = [trace["duration"] for trace in recent_traces]
        error_traces = [trace for trace in recent_traces if trace["error_count"] > 0]
        
        operations = {}
        for trace in recent_traces:
            for span_data in trace["spans"]:
                op_name = span_data["operation_name"]
                if op_name not in operations:
                    operations[op_name] = {"count": 0, "total_duration": 0, "errors": 0}
                
                operations[op_name]["count"] += 1
                operations[op_name]["total_duration"] += span_data.get("duration", 0) or 0
                if span_data["status"] == "error":
                    operations[op_name]["errors"] += 1
        
        # Calculate operation averages
        for op_data in operations.values():
            op_data["avg_duration"] = op_data["total_duration"] / op_data["count"] if op_data["count"] > 0 else 0
            op_data["error_rate"] = op_data["errors"] / op_data["count"] if op_data["count"] > 0 else 0
        
        summary = {
            "time_period_hours": hours,
            "total_traces": len(recent_traces),
            "total_errors": len(error_traces),
            "error_rate": len(error_traces) / len(recent_traces),
            "avg_trace_duration": sum(durations) / len(durations),
            "p95_trace_duration": sorted(durations)[int(len(durations) * 0.95)] if durations else 0,
            "p99_trace_duration": sorted(durations)[int(len(durations) * 0.99)] if durations else 0,
            "slowest_traces": sorted(recent_traces, key=lambda x: x["duration"], reverse=True)[:5],
            "operations": dict(sorted(operations.items(), key=lambda x: x[1]["count"], reverse=True)[:10])
        }
        
        return summary

# Global APM collector
apm_collector = APMCollector()

# Export key functions and classes
__all__ = [
    'tracer',
    'trace_context', 
    'PerformanceProfiler',
    'trace_function',
    'trace_database_query',
    'apm_collector',
    'TraceSpan',
    'DistributedTracer'
]
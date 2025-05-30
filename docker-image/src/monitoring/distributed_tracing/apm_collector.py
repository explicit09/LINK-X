"""
Application Performance Monitoring (APM) data collection.

This module provides tools for collecting and analyzing performance metrics
from the distributed tracing system.
"""
import time
import logging
from typing import Dict, Any, List, Optional

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logging.warning("psutil not available, system metrics collection will be limited")

from .tracer import tracer

logger = logging.getLogger(__name__)


class APMCollector:
    """Application Performance Monitoring data collector.
    
    This class collects and analyzes performance metrics from traces,
    system resources, and application behavior.
    """
    
    def __init__(self):
        """Initialize the APM collector."""
        self.metrics_buffer: List[Dict[str, Any]] = []
        self.max_buffer_size = 1000
        
    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect current system metrics.
        
        Returns:
            Dictionary containing system metrics
        """
        if not PSUTIL_AVAILABLE:
            return {
                "timestamp": time.time(),
                "error": "psutil not available"
            }
            
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
                "threads": process.num_threads(),
            }
            
            # Add I/O counters if available
            if hasattr(process, 'io_counters'):
                try:
                    metrics["io"] = process.io_counters()._asdict()
                except:
                    metrics["io"] = {}
            
            # Add connection count if available
            if hasattr(process, 'connections'):
                try:
                    metrics["connections"] = len(process.connections())
                except:
                    metrics["connections"] = 0
            
            # System-wide metrics
            metrics["system"] = {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent,
            }
            
            # Add load average if available (Unix systems)
            if hasattr(psutil, 'getloadavg'):
                metrics["system"]["load_avg"] = psutil.getloadavg()
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return {
                "timestamp": time.time(),
                "error": str(e)
            }
    
    def collect_trace_metrics(self) -> Dict[str, Any]:
        """Collect trace-related metrics.
        
        Returns:
            Dictionary containing trace metrics
        """
        active_spans = tracer.get_active_spans()
        recent_traces = tracer.get_recent_traces(50)
        
        if not recent_traces:
            return {
                "timestamp": time.time(),
                "active_spans": len(active_spans),
                "recent_traces_count": 0
            }
        
        # Calculate trace statistics
        durations = [trace["duration"] for trace in recent_traces]
        error_counts = [trace["error_count"] for trace in recent_traces]
        span_counts = [trace["span_count"] for trace in recent_traces]
        
        # Calculate percentiles
        def calculate_percentile(values: List[float], percentile: float) -> float:
            """Calculate percentile of a list of values."""
            if not values:
                return 0.0
            sorted_values = sorted(values)
            index = int(len(sorted_values) * percentile)
            return sorted_values[min(index, len(sorted_values) - 1)]
        
        metrics = {
            "timestamp": time.time(),
            "active_spans": len(active_spans),
            "recent_traces_count": len(recent_traces),
            "avg_trace_duration": sum(durations) / len(durations) if durations else 0,
            "max_trace_duration": max(durations) if durations else 0,
            "min_trace_duration": min(durations) if durations else 0,
            "p50_trace_duration": calculate_percentile(durations, 0.5),
            "p95_trace_duration": calculate_percentile(durations, 0.95),
            "p99_trace_duration": calculate_percentile(durations, 0.99),
            "total_errors": sum(error_counts),
            "avg_span_count": sum(span_counts) / len(span_counts) if span_counts else 0,
            "error_rate": sum(1 for count in error_counts if count > 0) / len(error_counts) if error_counts else 0
        }
        
        return metrics
    
    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for specified time period.
        
        Args:
            hours: Number of hours to include in the summary
            
        Returns:
            Dictionary containing performance summary
        """
        cutoff_time = time.time() - (hours * 3600)
        
        # Filter recent traces
        recent_traces = [
            trace for trace in tracer.completed_traces
            if trace["start_time"] >= cutoff_time
        ]
        
        if not recent_traces:
            return {
                "time_period_hours": hours,
                "message": "No traces found in specified time period"
            }
        
        # Calculate summary statistics
        durations = [trace["duration"] for trace in recent_traces]
        error_traces = [trace for trace in recent_traces if trace["error_count"] > 0]
        
        # Aggregate by operation
        operations: Dict[str, Dict[str, Any]] = {}
        for trace in recent_traces:
            for span_data in trace["spans"]:
                op_name = span_data["operation_name"]
                if op_name not in operations:
                    operations[op_name] = {
                        "count": 0,
                        "total_duration": 0,
                        "errors": 0,
                        "durations": []
                    }
                
                operations[op_name]["count"] += 1
                duration = span_data.get("duration", 0) or 0
                operations[op_name]["total_duration"] += duration
                operations[op_name]["durations"].append(duration)
                
                if span_data["status"] == "error":
                    operations[op_name]["errors"] += 1
        
        # Calculate operation statistics
        for op_name, op_data in operations.items():
            count = op_data["count"]
            if count > 0:
                op_data["avg_duration"] = op_data["total_duration"] / count
                op_data["error_rate"] = op_data["errors"] / count
                
                # Calculate percentiles
                sorted_durations = sorted(op_data["durations"])
                op_data["p50_duration"] = sorted_durations[int(len(sorted_durations) * 0.5)]
                op_data["p95_duration"] = sorted_durations[int(len(sorted_durations) * 0.95)]
                op_data["p99_duration"] = sorted_durations[int(len(sorted_durations) * 0.99)]
                
                # Remove raw durations from output
                del op_data["durations"]
        
        # Sort traces by duration for slowest traces
        sorted_traces = sorted(recent_traces, key=lambda x: x["duration"], reverse=True)
        
        # Calculate percentiles for trace durations
        sorted_durations = sorted(durations)
        
        summary = {
            "time_period_hours": hours,
            "total_traces": len(recent_traces),
            "total_errors": len(error_traces),
            "error_rate": len(error_traces) / len(recent_traces) if recent_traces else 0,
            "avg_trace_duration": sum(durations) / len(durations) if durations else 0,
            "p50_trace_duration": sorted_durations[int(len(sorted_durations) * 0.5)] if durations else 0,
            "p95_trace_duration": sorted_durations[int(len(sorted_durations) * 0.95)] if durations else 0,
            "p99_trace_duration": sorted_durations[int(len(sorted_durations) * 0.99)] if durations else 0,
            "slowest_traces": [
                {
                    "trace_id": trace["trace_id"],
                    "duration": trace["duration"],
                    "span_count": trace["span_count"],
                    "error_count": trace["error_count"],
                    "start_time": trace["start_time"]
                }
                for trace in sorted_traces[:5]
            ],
            "operations": dict(sorted(
                operations.items(), 
                key=lambda x: x[1]["count"], 
                reverse=True
            )[:10])
        }
        
        return summary
    
    def add_metric(self, metric_type: str, metric_data: Dict[str, Any]) -> None:
        """Add a metric to the buffer.
        
        Args:
            metric_type: Type of metric being added
            metric_data: Metric data
        """
        metric = {
            "timestamp": time.time(),
            "type": metric_type,
            "data": metric_data
        }
        
        self.metrics_buffer.append(metric)
        
        # Limit buffer size
        if len(self.metrics_buffer) > self.max_buffer_size:
            self.metrics_buffer = self.metrics_buffer[-self.max_buffer_size:]
    
    def get_recent_metrics(self, metric_type: Optional[str] = None, 
                          limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent metrics from the buffer.
        
        Args:
            metric_type: Optional filter by metric type
            limit: Maximum number of metrics to return
            
        Returns:
            List of recent metrics
        """
        if metric_type:
            filtered = [m for m in self.metrics_buffer if m["type"] == metric_type]
            return filtered[-limit:]
        
        return self.metrics_buffer[-limit:]


# Global APM collector instance
apm_collector = APMCollector()
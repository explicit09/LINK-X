"""
Performance profiling tools for distributed tracing.

This module provides advanced performance profiling with memory and CPU tracking.
"""
import time
import logging
from typing import Dict, Any, List, Optional

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logging.warning("psutil not available, performance profiling will be limited")

from .context import trace_context

logger = logging.getLogger(__name__)


class PerformanceProfiler:
    """Advanced performance profiler with memory and CPU tracking.
    
    This class provides a context manager for profiling code blocks with
    detailed performance metrics including memory usage, CPU usage, and
    custom checkpoints.
    """
    
    def __init__(self, name: str):
        """Initialize the profiler.
        
        Args:
            name: Name of the profiling session
        """
        self.name = name
        self.start_time: Optional[float] = None
        self.start_memory: Optional[int] = None
        self.start_cpu: Optional[float] = None
        self.checkpoints: List[Dict[str, Any]] = []
        self.process = psutil.Process() if PSUTIL_AVAILABLE else None
    
    def __enter__(self) -> 'PerformanceProfiler':
        """Enter the profiling context.
        
        Returns:
            Self for use in with statement
        """
        self.start_time = time.time()
        
        if self.process:
            try:
                self.start_memory = self.process.memory_info().rss
                self.start_cpu = self.process.cpu_percent()
            except Exception as e:
                logger.warning(f"Failed to get process metrics: {e}")
                self.start_memory = 0
                self.start_cpu = 0.0
        else:
            self.start_memory = 0
            self.start_cpu = 0.0
            
        return self
    
    def checkpoint(self, name: str, **metadata: Any) -> None:
        """Add a performance checkpoint.
        
        Args:
            name: Name of the checkpoint
            **metadata: Additional metadata to include with the checkpoint
        """
        if self.start_time is None:
            logger.warning("Profiler not started, cannot add checkpoint")
            return
            
        current_time = time.time()
        elapsed_time = current_time - self.start_time
        
        checkpoint = {
            "name": name,
            "timestamp": current_time,
            "elapsed_time": elapsed_time,
            "metadata": metadata
        }
        
        if self.process:
            try:
                current_memory = self.process.memory_info().rss
                current_cpu = self.process.cpu_percent()
                
                checkpoint.update({
                    "memory_usage": current_memory,
                    "memory_delta": current_memory - (self.start_memory or 0),
                    "cpu_percent": current_cpu
                })
            except Exception as e:
                logger.warning(f"Failed to get process metrics for checkpoint: {e}")
        
        self.checkpoints.append(checkpoint)
        
        # Add to current span if available
        current_span = trace_context.get_current_span()
        if current_span:
            log_data = {
                "elapsed_time": elapsed_time,
                **metadata
            }
            
            if "memory_usage" in checkpoint:
                log_data["memory_mb"] = checkpoint["memory_usage"] / 1024 / 1024
                log_data["cpu_percent"] = checkpoint["cpu_percent"]
            
            current_span.add_log(f"Checkpoint: {name}", **log_data)
    
    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Exit the profiling context and record final metrics.
        
        Args:
            exc_type: Exception type if an exception occurred
            exc_val: Exception value if an exception occurred
            exc_tb: Exception traceback if an exception occurred
        """
        if self.start_time is None:
            return
            
        total_time = time.time() - self.start_time
        
        profile_summary = {
            "profile_name": self.name,
            "total_time": total_time,
            "checkpoint_count": len(self.checkpoints),
            "checkpoints": self.checkpoints
        }
        
        if self.process:
            try:
                final_memory = self.process.memory_info().rss
                final_cpu = self.process.cpu_percent()
                
                profile_summary.update({
                    "memory_start": self.start_memory,
                    "memory_end": final_memory,
                    "memory_delta": final_memory - (self.start_memory or 0),
                    "cpu_start": self.start_cpu,
                    "cpu_end": final_cpu
                })
                
                memory_delta_mb = profile_summary['memory_delta'] / 1024 / 1024
                
                # Log profile summary
                logger.info(
                    f"Performance profile '{self.name}' completed: "
                    f"time={total_time:.3f}s "
                    f"memory_delta={memory_delta_mb:.1f}MB "
                    f"checkpoints={len(self.checkpoints)}"
                )
            except Exception as e:
                logger.warning(f"Failed to get final process metrics: {e}")
        else:
            # Log without memory/CPU metrics
            logger.info(
                f"Performance profile '{self.name}' completed: "
                f"time={total_time:.3f}s "
                f"checkpoints={len(self.checkpoints)}"
            )
        
        # Add to current span if available
        current_span = trace_context.get_current_span()
        if current_span:
            current_span.add_tag("profile.total_time", total_time)
            current_span.add_tag("profile.checkpoint_count", len(self.checkpoints))
            
            if "memory_delta" in profile_summary:
                current_span.add_tag("profile.memory_delta_mb", 
                                   profile_summary['memory_delta'] / 1024 / 1024)
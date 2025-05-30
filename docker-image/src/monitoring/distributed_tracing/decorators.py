"""
Decorators for distributed tracing.

This module provides decorators for automatically tracing function calls and database queries.
"""
import functools
from typing import Callable, Any, Optional, TypeVar, cast

from .tracer import tracer
from .profiler import PerformanceProfiler

# Type variable for preserving function signatures
F = TypeVar('F', bound=Callable[..., Any])


def trace_function(operation_name: Optional[str] = None, **span_tags: Any) -> Callable[[F], F]:
    """Decorator to trace function calls.
    
    Args:
        operation_name: Optional operation name (defaults to function name)
        **span_tags: Additional tags to add to the span
        
    Returns:
        Decorated function
    """
    def decorator(func: F) -> F:
        op_name = operation_name or f"{func.__module__}.{func.__name__}"
        
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            with tracer.trace(op_name, **span_tags) as span:
                # Add function metadata
                span.add_tag("function.name", func.__name__)
                span.add_tag("function.module", func.__module__)
                span.add_tag("function.args_count", len(args))
                span.add_tag("function.kwargs_count", len(kwargs))
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Add result metadata if simple type
                if isinstance(result, (str, int, float, bool)):
                    span.add_tag("function.result_type", type(result).__name__)
                    span.add_tag("function.result_value", str(result)[:100])
                elif hasattr(result, '__len__'):
                    try:
                        span.add_tag("function.result_type", type(result).__name__)
                        span.add_tag("function.result_length", len(result))
                    except:
                        pass
                
                return result
        
        return cast(F, wrapper)
    return decorator


def trace_database_query(query_type: str, table: Optional[str] = None) -> Callable[[F], F]:
    """Decorator to trace database queries with performance profiling.
    
    Args:
        query_type: Type of query (e.g., "select", "insert", "update", "delete")
        table: Optional table name
        
    Returns:
        Decorated function
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            with tracer.trace(f"db.{query_type}", 
                             db_type="postgresql",
                             db_table=table,
                             query_type=query_type) as span:
                
                # Start performance profiling
                with PerformanceProfiler(f"db_query_{query_type}") as profiler:
                    # Execute query
                    result = func(*args, **kwargs)
                    
                    # Add query metadata
                    if hasattr(result, '__len__'):
                        try:
                            span.add_tag("db.result_count", len(result))
                        except:
                            pass
                    
                    # Add checkpoint after query
                    profiler.checkpoint("query_completed")
                
                return result
        
        return cast(F, wrapper)
    return decorator
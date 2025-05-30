"""
Serialization utilities for distributed tracing.

This module provides utilities for serializing and deserializing trace data
for export to various backends.
"""
import json
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

from .span import TraceSpan

logger = logging.getLogger(__name__)


class TraceSerializer:
    """Utilities for serializing trace data to various formats."""
    
    @staticmethod
    def span_to_jaeger(span: TraceSpan) -> Dict[str, Any]:
        """Convert a span to Jaeger format.
        
        Args:
            span: The TraceSpan to convert
            
        Returns:
            Dictionary in Jaeger format
        """
        # Convert timestamp to microseconds for Jaeger
        start_time_micros = int(span.start_time * 1_000_000)
        duration_micros = int((span.duration or 0) * 1_000_000)
        
        jaeger_span = {
            "traceID": span.trace_id,
            "spanID": span.span_id,
            "parentSpanID": span.parent_span_id or "",
            "operationName": span.operation_name,
            "startTime": start_time_micros,
            "duration": duration_micros,
            "tags": [
                {"key": k, "type": "string", "value": str(v)}
                for k, v in span.tags.items()
            ],
            "logs": [
                {
                    "timestamp": int(log["timestamp"] * 1_000_000),
                    "fields": [
                        {"key": k, "value": str(v)}
                        for k, v in log.items()
                        if k != "timestamp"
                    ]
                }
                for log in span.logs
            ],
            "process": {
                "serviceName": span.tags.get("service.name", "unknown"),
                "tags": []
            }
        }
        
        # Add error flag if span has error
        if span.status == "error":
            jaeger_span["tags"].append({
                "key": "error",
                "type": "bool",
                "value": True
            })
            if span.error:
                jaeger_span["tags"].append({
                    "key": "error.message",
                    "type": "string",
                    "value": span.error
                })
            if span.stack_trace:
                jaeger_span["logs"].append({
                    "timestamp": int((span.end_time or span.start_time) * 1_000_000),
                    "fields": [
                        {"key": "event", "value": "error"},
                        {"key": "stack", "value": span.stack_trace}
                    ]
                })
        
        return jaeger_span
    
    @staticmethod
    def span_to_zipkin(span: TraceSpan) -> Dict[str, Any]:
        """Convert a span to Zipkin format.
        
        Args:
            span: The TraceSpan to convert
            
        Returns:
            Dictionary in Zipkin format
        """
        # Convert timestamp to microseconds for Zipkin
        start_time_micros = int(span.start_time * 1_000_000)
        duration_micros = int((span.duration or 0) * 1_000_000)
        
        zipkin_span = {
            "traceId": span.trace_id,
            "id": span.span_id,
            "parentId": span.parent_span_id,
            "name": span.operation_name,
            "timestamp": start_time_micros,
            "duration": duration_micros,
            "localEndpoint": {
                "serviceName": span.tags.get("service.name", "unknown")
            },
            "tags": {str(k): str(v) for k, v in span.tags.items()},
            "annotations": []
        }
        
        # Add annotations from logs
        for log in span.logs:
            zipkin_span["annotations"].append({
                "timestamp": int(log["timestamp"] * 1_000_000),
                "value": log.get("message", "")
            })
        
        # Add error annotation if needed
        if span.status == "error" and span.error:
            zipkin_span["tags"]["error"] = span.error
            
        return zipkin_span
    
    @staticmethod
    def span_to_otlp(span: TraceSpan) -> Dict[str, Any]:
        """Convert a span to OpenTelemetry Protocol (OTLP) format.
        
        Args:
            span: The TraceSpan to convert
            
        Returns:
            Dictionary in OTLP format
        """
        # Convert to nanoseconds for OTLP
        start_time_nanos = int(span.start_time * 1_000_000_000)
        end_time_nanos = int((span.end_time or span.start_time) * 1_000_000_000)
        
        # Map status
        status_code = 0  # UNSET
        if span.status == "finished":
            status_code = 1  # OK
        elif span.status == "error":
            status_code = 2  # ERROR
        
        otlp_span = {
            "traceId": span.trace_id,
            "spanId": span.span_id,
            "parentSpanId": span.parent_span_id or "",
            "name": span.operation_name,
            "startTimeUnixNano": start_time_nanos,
            "endTimeUnixNano": end_time_nanos,
            "attributes": [
                {"key": k, "value": {"stringValue": str(v)}}
                for k, v in span.tags.items()
            ],
            "events": [
                {
                    "timeUnixNano": int(log["timestamp"] * 1_000_000_000),
                    "name": log.get("message", ""),
                    "attributes": [
                        {"key": k, "value": {"stringValue": str(v)}}
                        for k, v in log.items()
                        if k not in ["timestamp", "message"]
                    ]
                }
                for log in span.logs
            ],
            "status": {
                "code": status_code,
                "message": span.error or ""
            }
        }
        
        return otlp_span
    
    @staticmethod
    def trace_to_json(trace_data: Dict[str, Any], pretty: bool = False) -> str:
        """Convert trace data to JSON string.
        
        Args:
            trace_data: Trace data dictionary
            pretty: Whether to pretty-print the JSON
            
        Returns:
            JSON string representation
        """
        try:
            if pretty:
                return json.dumps(trace_data, indent=2, sort_keys=True, default=str)
            return json.dumps(trace_data, separators=(',', ':'), default=str)
        except Exception as e:
            logger.error(f"Failed to serialize trace to JSON: {e}")
            return "{}"
    
    @staticmethod
    def serialize_batch(spans: List[TraceSpan], format: str = "jaeger") -> List[Dict[str, Any]]:
        """Serialize a batch of spans to the specified format.
        
        Args:
            spans: List of TraceSpan objects
            format: Output format ("jaeger", "zipkin", "otlp")
            
        Returns:
            List of serialized spans
        """
        serializer_map = {
            "jaeger": TraceSerializer.span_to_jaeger,
            "zipkin": TraceSerializer.span_to_zipkin,
            "otlp": TraceSerializer.span_to_otlp
        }
        
        serializer = serializer_map.get(format)
        if not serializer:
            logger.error(f"Unknown serialization format: {format}")
            return []
        
        serialized = []
        for span in spans:
            try:
                serialized.append(serializer(span))
            except Exception as e:
                logger.error(f"Failed to serialize span {span.span_id}: {e}")
        
        return serialized
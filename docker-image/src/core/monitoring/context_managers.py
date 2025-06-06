"""
Context managers for monitoring various operations
"""
import time
import logging
from typing import Dict
from .metrics_definitions import (
    db_query_duration, file_processing_duration, search_latency,
    retrieval_accuracy
)
from .trackers import (
    track_chunk_creation, track_file_processing_error, track_file_upload,
    track_search_query
)

logger = logging.getLogger(__name__)

def monitor_db_query(operation: str, table: str):
    """Context manager to monitor database queries"""
    class DBQueryMonitor:
        def __enter__(self):
            self.start_time = time.time()
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.time() - self.start_time
            db_query_duration.labels(
                operation=operation,
                table=table
            ).observe(duration)
            
            # Log slow queries
            if duration > 0.5:
                logger.warning(
                    f"Slow DB query: {operation} on {table} "
                    f"took {duration:.2f}s"
                )
    
    return DBQueryMonitor()

def monitor_file_processing(file_type: str, operation: str, course_id: str = None):
    """Context manager to monitor file processing with enhanced tracking"""
    class FileProcessingMonitor:
        def __init__(self):
            self.start_time = None
            self.chunks_created = 0
            self.errors = []
        
        def __enter__(self):
            self.start_time = time.time()
            return self
        
        def add_chunks(self, count: int):
            """Track chunks created during processing"""
            self.chunks_created += count
        
        def add_error(self, error_type: str):
            """Track errors during processing"""
            self.errors.append(error_type)
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.time() - self.start_time
            
            # Record processing duration
            file_processing_duration.labels(
                file_type=file_type,
                operation=operation
            ).observe(duration)
            
            # Record chunks created
            if self.chunks_created > 0 and course_id:
                track_chunk_creation(file_type, course_id, self.chunks_created)
            
            # Record processing errors
            for error_type in self.errors:
                track_file_processing_error(error_type, file_type)
            
            # Record processing status
            status = 'error' if exc_type else 'success'
            track_file_upload(file_type, status, 'system')
            
            # Log slow file processing
            if duration > 30.0:
                logger.warning(
                    f"Slow file processing: {operation} on {file_type} "
                    f"took {duration:.2f}s, created {self.chunks_created} chunks"
                )
            
            # Log processing summary
            logger.info(
                f"File processing completed: {operation}/{file_type} "
                f"duration={duration:.2f}s chunks={self.chunks_created} "
                f"errors={len(self.errors)} status={status}"
            )
    
    return FileProcessingMonitor()

def monitor_search_operation(course_id: str, query_type: str, user_type: str):
    """Context manager to monitor search operations"""
    class SearchMonitor:
        def __init__(self):
            self.start_time = None
            self.result_count = 0
            self.accuracy_score = None
        
        def __enter__(self):
            self.start_time = time.time()
            # Track search query
            track_search_query(course_id, query_type, user_type)
            return self
        
        def set_results(self, count: int, accuracy: float = None):
            """Set search results for metrics"""
            self.result_count = count
            self.accuracy_score = accuracy
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.time() - self.start_time
            
            # Determine result count bucket for latency tracking
            if self.result_count == 0:
                bucket = 'no_results'
            elif self.result_count <= 10:
                bucket = 'few_results'
            elif self.result_count <= 50:
                bucket = 'medium_results'
            else:
                bucket = 'many_results'
            
            # Record search latency
            search_latency.labels(
                query_type=query_type,
                result_count_bucket=bucket
            ).observe(duration)
            
            # Record accuracy if available
            if self.accuracy_score is not None:
                retrieval_accuracy.labels(
                    course_id=course_id,
                    query_type=query_type
                ).observe(self.accuracy_score)
            
            # Log slow searches
            if duration > 2.0:
                logger.warning(
                    f"Slow search: {query_type} in course {course_id} "
                    f"took {duration:.2f}s, returned {self.result_count} results"
                )
    
    return SearchMonitor()

# Note: Embedding generation is now handled automatically by Supabase
# The monitor_embedding_generation function has been deprecated

class PerformanceProfiler:
    """Context manager for detailed performance profiling"""
    
    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        self.checkpoints: Dict[str, float] = {}
        self.checkpoint_order: list = []
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def checkpoint(self, name: str):
        """Mark a checkpoint in the profiling"""
        self.checkpoints[name] = time.time()
        self.checkpoint_order.append(name)
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        total_time = time.time() - self.start_time
        
        # Log profile results
        profile_data = {
            'profile_name': self.name,
            'total_time': f"{total_time:.3f}s",
            'checkpoints': {}
        }
        
        last_time = self.start_time
        for checkpoint in self.checkpoint_order:
            checkpoint_time = self.checkpoints[checkpoint]
            duration = checkpoint_time - last_time
            profile_data['checkpoints'][checkpoint] = f"{duration:.3f}s"
            last_time = checkpoint_time
        
        # Final segment
        if self.checkpoint_order:
            final_duration = time.time() - last_time
            profile_data['checkpoints']['completion'] = f"{final_duration:.3f}s"
        
        logger.info(f"Performance profile: {profile_data}")
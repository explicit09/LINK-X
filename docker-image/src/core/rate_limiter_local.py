"""
Local In-Memory Rate Limiter Fallback
Used when Redis is unavailable
"""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Tuple, Dict
import logging

logger = logging.getLogger(__name__)


class LocalRateLimiter:
    """
    In-memory rate limiter using sliding window
    Thread-safe implementation for fallback when Redis is down
    """
    
    def __init__(self):
        # Store request timestamps for each key
        self.requests: Dict[str, deque] = defaultdict(deque)
        self.lock = Lock()
        self.last_cleanup = time.time()
        self.cleanup_interval = 60  # Clean up old entries every minute
        
    def cleanup(self):
        """Remove expired entries to prevent memory leak"""
        current_time = time.time()
        
        # Only cleanup periodically
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
            
        with self.lock:
            # Remove keys with no recent requests
            keys_to_remove = []
            for key, timestamps in self.requests.items():
                # Remove timestamps older than 1 hour
                cutoff = current_time - 3600
                while timestamps and timestamps[0] < cutoff:
                    timestamps.popleft()
                
                # Mark empty keys for removal
                if not timestamps:
                    keys_to_remove.append(key)
            
            # Remove empty keys
            for key in keys_to_remove:
                del self.requests[key]
            
            self.last_cleanup = current_time
            
            if keys_to_remove:
                logger.debug(f"Cleaned up {len(keys_to_remove)} expired rate limit keys")
    
    def is_allowed(
        self,
        key: str,
        limit: int,
        window: int,
        cost: int = 1
    ) -> Tuple[bool, dict]:
        """
        Check if request is allowed under rate limit
        
        Args:
            key: Unique identifier
            limit: Maximum requests allowed
            window: Time window in seconds
            cost: Cost of this request
            
        Returns:
            (allowed, metadata) tuple
        """
        current_time = time.time()
        
        # Periodic cleanup
        self.cleanup()
        
        with self.lock:
            # Get timestamps for this key
            timestamps = self.requests[key]
            
            # Remove old timestamps outside the window
            cutoff = current_time - window
            while timestamps and timestamps[0] < cutoff:
                timestamps.popleft()
            
            # Count current requests
            current_count = len(timestamps)
            
            # Calculate metadata
            remaining = max(0, limit - current_count - cost)
            reset_time = int(current_time + window)
            
            metadata = {
                'limit': limit,
                'remaining': remaining,
                'reset': reset_time,
                'retry_after': None,
                'fallback': True  # Indicate this is fallback mode
            }
            
            # Check if allowed
            if current_count + cost > limit:
                metadata['retry_after'] = window
                logger.warning(f"Local rate limit exceeded for {key}: {current_count}/{limit}")
                return False, metadata
            
            # Add current request timestamp(s) based on cost
            for _ in range(cost):
                timestamps.append(current_time)
            
            return True, metadata
    
    def reset(self, key: str):
        """Reset rate limit for a specific key"""
        with self.lock:
            if key in self.requests:
                del self.requests[key]
                logger.info(f"Reset local rate limit for key: {key}")
    
    def get_stats(self) -> dict:
        """Get statistics about current rate limiting state"""
        with self.lock:
            total_keys = len(self.requests)
            total_requests = sum(len(timestamps) for timestamps in self.requests.values())
            
            return {
                'type': 'local_memory',
                'total_keys': total_keys,
                'total_requests': total_requests,
                'memory_usage': 'minimal',  # Rough estimate
                'last_cleanup': self.last_cleanup
            }


# Global instance for fallback
local_rate_limiter = LocalRateLimiter()
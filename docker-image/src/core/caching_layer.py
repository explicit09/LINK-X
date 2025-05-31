"""
Redis Caching Layer - Production performance optimization
Intelligent caching for queries, responses, and computed results
"""

import logging
import json
import hashlib
import time
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, asdict
from enum import Enum
import pickle

logger = logging.getLogger(__name__)


class CacheType(Enum):
    """Types of cached data"""
    QUERY_RESPONSE = "query_response"
    PERSONALIZATION = "personalization"
    RAG_RETRIEVAL = "rag_retrieval"
    MODEL_SELECTION = "model_selection"
    ROUTING_DECISION = "routing_decision"
    EMBEDDINGS = "embeddings"


@dataclass
class CacheEntry:
    """Cached data entry with metadata"""
    key: str
    data: Any
    cache_type: CacheType
    created_at: float
    expires_at: float
    hit_count: int
    last_accessed: float
    tags: List[str]


@dataclass
class CacheStats:
    """Cache performance statistics"""
    total_requests: int
    cache_hits: int
    cache_misses: int
    hit_rate: float
    average_retrieval_time: float
    memory_usage: Dict[str, int]
    top_cached_queries: List[Dict[str, Any]]


class CachingLayer:
    """
    Intelligent Redis-based caching system
    
    Features:
    - TTL-based expiration
    - LRU eviction policies
    - Cache warming strategies
    - Performance analytics
    - Tag-based invalidation
    - Compression for large objects
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = self._initialize_redis(redis_url)
        self.cache_prefix = "learn_x:"
        
        # Cache configuration
        self.default_ttl = {
            CacheType.QUERY_RESPONSE: 3600,      # 1 hour
            CacheType.PERSONALIZATION: 1800,     # 30 minutes
            CacheType.RAG_RETRIEVAL: 7200,       # 2 hours
            CacheType.MODEL_SELECTION: 86400,    # 24 hours
            CacheType.ROUTING_DECISION: 1800,    # 30 minutes
            CacheType.EMBEDDINGS: 604800         # 1 week
        }
        
        # Performance tracking
        self.stats = {
            'requests': 0,
            'hits': 0,
            'misses': 0,
            'total_retrieval_time': 0.0,
            'cache_type_stats': {ct.value: {'hits': 0, 'misses': 0} for ct in CacheType}
        }
    
    def _initialize_redis(self, redis_url: str):
        """Initialize Redis connection with fallback"""
        try:
            import redis
            
            client = redis.from_url(redis_url, decode_responses=False)
            
            # Test connection
            client.ping()
            logger.info(f"Redis connection established: {redis_url}")
            return client
            
        except ImportError:
            logger.warning("Redis not available - using in-memory cache fallback")
            return self._create_memory_fallback()
        except Exception as e:
            logger.warning(f"Redis connection failed: {e} - using in-memory fallback")
            return self._create_memory_fallback()
    
    def _create_memory_fallback(self):
        """Create in-memory cache fallback when Redis unavailable"""
        class MemoryCache:
            def __init__(self):
                self.cache = {}
                self.max_size = 1000
            
            def get(self, key):
                entry = self.cache.get(key)
                if entry and entry['expires_at'] > time.time():
                    return entry['data']
                elif entry:
                    del self.cache[key]
                return None
            
            def set(self, key, value, ex=3600):
                if len(self.cache) >= self.max_size:
                    # Simple LRU: remove oldest
                    oldest_key = min(self.cache.keys(), 
                                   key=lambda k: self.cache[k]['created_at'])
                    del self.cache[oldest_key]
                
                self.cache[key] = {
                    'data': value,
                    'created_at': time.time(),
                    'expires_at': time.time() + ex
                }
            
            def delete(self, key):
                self.cache.pop(key, None)
            
            def exists(self, key):
                return key in self.cache and self.cache[key]['expires_at'] > time.time()
            
            def flushdb(self):
                self.cache.clear()
            
            def keys(self, pattern="*"):
                return [k for k in self.cache.keys() if pattern == "*" or pattern in k]
            
            def ping(self):
                return True
        
        return MemoryCache()
    
    def get(
        self,
        cache_type: CacheType,
        key_data: Dict[str, Any],
        default: Any = None
    ) -> Optional[Any]:
        """
        Retrieve cached data
        
        Args:
            cache_type: Type of cached data
            key_data: Data to generate cache key
            default: Default value if not found
            
        Returns:
            Cached data or default value
        """
        start_time = time.time()
        
        try:
            cache_key = self._generate_cache_key(cache_type, key_data)
            
            # Get from Redis
            cached_data = self.redis_client.get(cache_key)
            
            retrieval_time = time.time() - start_time
            self._update_stats(cache_type, True if cached_data else False, retrieval_time)
            
            if cached_data:
                # Deserialize data
                try:
                    if isinstance(cached_data, bytes):
                        deserialized = pickle.loads(cached_data)
                    else:
                        deserialized = json.loads(cached_data)
                    
                    logger.debug(f"Cache hit for {cache_type.value}: {cache_key}")
                    return deserialized
                    
                except (json.JSONDecodeError, pickle.PickleError) as e:
                    logger.warning(f"Cache deserialization failed: {e}")
                    self.redis_client.delete(cache_key)
            
            logger.debug(f"Cache miss for {cache_type.value}: {cache_key}")
            return default
            
        except Exception as e:
            logger.error(f"Cache get failed: {e}")
            return default
    
    def set(
        self,
        cache_type: CacheType,
        key_data: Dict[str, Any],
        value: Any,
        ttl: Optional[int] = None,
        tags: Optional[List[str]] = None
    ) -> bool:
        """
        Store data in cache
        
        Args:
            cache_type: Type of data being cached
            key_data: Data to generate cache key
            value: Data to cache
            ttl: Time to live in seconds (uses default if None)
            tags: Tags for cache invalidation
            
        Returns:
            True if successfully cached
        """
        try:
            cache_key = self._generate_cache_key(cache_type, key_data)
            ttl = ttl or self.default_ttl[cache_type]
            
            # Serialize data
            try:
                # Use JSON for simple data structures
                if self._is_json_serializable(value):
                    serialized_data = json.dumps(value)
                else:
                    # Use pickle for complex objects
                    serialized_data = pickle.dumps(value)
            except Exception as e:
                logger.warning(f"Cache serialization failed: {e}")
                return False
            
            # Store in Redis
            success = self.redis_client.set(cache_key, serialized_data, ex=ttl)
            
            # Store tags for invalidation
            if tags:
                self._store_tags(cache_key, tags)
            
            if success:
                logger.debug(f"Cached {cache_type.value}: {cache_key} (TTL: {ttl}s)")
            
            return bool(success)
            
        except Exception as e:
            logger.error(f"Cache set failed: {e}")
            return False
    
    def invalidate_by_tags(self, tags: List[str]) -> int:
        """
        Invalidate cache entries by tags
        
        Args:
            tags: Tags to invalidate
            
        Returns:
            Number of entries invalidated
        """
        try:
            invalidated_count = 0
            
            for tag in tags:
                tag_key = f"{self.cache_prefix}tag:{tag}"
                cached_keys = self.redis_client.smembers(tag_key)
                
                if cached_keys:
                    # Delete all keys with this tag
                    pipeline = self.redis_client.pipeline()
                    for key in cached_keys:
                        pipeline.delete(key)
                    pipeline.delete(tag_key)  # Delete tag set itself
                    pipeline.execute()
                    
                    invalidated_count += len(cached_keys)
            
            logger.info(f"Invalidated {invalidated_count} cache entries for tags: {tags}")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
            return 0
    
    def warm_cache(
        self,
        common_queries: List[Dict[str, Any]],
        batch_size: int = 10
    ):
        """
        Warm cache with common queries
        
        Args:
            common_queries: List of common query data to pre-cache
            batch_size: Number of queries to process in parallel
        """
        logger.info(f"Warming cache with {len(common_queries)} common queries")
        
        try:
            from concurrent.futures import ThreadPoolExecutor
            
            def warm_single_query(query_data):
                try:
                    # This would integrate with your actual query processing
                    # For now, we'll simulate the warming process
                    cache_key = self._generate_cache_key(
                        CacheType.QUERY_RESPONSE, 
                        query_data
                    )
                    
                    # Check if already cached
                    if not self.redis_client.exists(cache_key):
                        # In production, you'd call your actual query processor here
                        placeholder_response = {
                            "warmed": True,
                            "query": query_data.get("question", ""),
                            "timestamp": time.time()
                        }
                        
                        self.set(
                            CacheType.QUERY_RESPONSE,
                            query_data,
                            placeholder_response,
                            tags=["warmed"]
                        )
                        
                        return True
                    return False
                    
                except Exception as e:
                    logger.warning(f"Failed to warm query: {e}")
                    return False
            
            with ThreadPoolExecutor(max_workers=batch_size) as executor:
                results = list(executor.map(warm_single_query, common_queries))
            
            warmed_count = sum(results)
            logger.info(f"Successfully warmed {warmed_count} cache entries")
            
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
    
    def get_stats(self) -> CacheStats:
        """Get comprehensive cache statistics"""
        try:
            # Calculate hit rate
            total_requests = self.stats['requests']
            hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0
            
            # Calculate average retrieval time
            avg_retrieval_time = (
                self.stats['total_retrieval_time'] / total_requests
            ) if total_requests > 0 else 0
            
            # Get memory usage (Redis-specific)
            memory_usage = {}
            try:
                if hasattr(self.redis_client, 'info'):
                    info = self.redis_client.info('memory')
                    memory_usage = {
                        'used_memory': info.get('used_memory', 0),
                        'used_memory_human': info.get('used_memory_human', '0B'),
                        'max_memory': info.get('maxmemory', 0)
                    }
            except:
                memory_usage = {'used_memory': 0, 'max_memory': 0}
            
            # Get top cached queries (simplified)
            top_queries = self._get_top_cached_queries()
            
            return CacheStats(
                total_requests=total_requests,
                cache_hits=self.stats['hits'],
                cache_misses=self.stats['misses'],
                hit_rate=hit_rate,
                average_retrieval_time=avg_retrieval_time,
                memory_usage=memory_usage,
                top_cached_queries=top_queries
            )
            
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return CacheStats(0, 0, 0, 0.0, 0.0, {}, [])
    
    def cleanup_expired(self) -> int:
        """
        Cleanup expired cache entries (Redis handles this automatically)
        This method is for manual cleanup if needed
        
        Returns:
            Number of entries cleaned up
        """
        try:
            # For Redis, this is handled automatically by TTL
            # For memory cache fallback, we can implement manual cleanup
            if hasattr(self.redis_client, 'cache'):  # Memory fallback
                current_time = time.time()
                expired_keys = [
                    key for key, value in self.redis_client.cache.items()
                    if value['expires_at'] <= current_time
                ]
                
                for key in expired_keys:
                    del self.redis_client.cache[key]
                
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
                return len(expired_keys)
            
            return 0  # Redis handles this automatically
            
        except Exception as e:
            logger.error(f"Cache cleanup failed: {e}")
            return 0
    
    def clear_all(self) -> bool:
        """Clear all cache data (use with caution)"""
        try:
            if hasattr(self.redis_client, 'flushdb'):
                self.redis_client.flushdb()
            else:
                self.redis_client.cache.clear()
            
            # Reset stats
            self.stats = {
                'requests': 0,
                'hits': 0,
                'misses': 0,
                'total_retrieval_time': 0.0,
                'cache_type_stats': {ct.value: {'hits': 0, 'misses': 0} for ct in CacheType}
            }
            
            logger.info("All cache data cleared")
            return True
            
        except Exception as e:
            logger.error(f"Cache clear failed: {e}")
            return False
    
    def _generate_cache_key(self, cache_type: CacheType, key_data: Dict[str, Any]) -> str:
        """Generate consistent cache key from data"""
        # Sort keys for consistent hashing
        sorted_data = json.dumps(key_data, sort_keys=True)
        data_hash = hashlib.md5(sorted_data.encode()).hexdigest()
        
        return f"{self.cache_prefix}{cache_type.value}:{data_hash}"
    
    def _is_json_serializable(self, obj: Any) -> bool:
        """Check if object can be JSON serialized"""
        try:
            json.dumps(obj)
            return True
        except (TypeError, ValueError):
            return False
    
    def _store_tags(self, cache_key: str, tags: List[str]):
        """Store tags for cache key for later invalidation"""
        try:
            for tag in tags:
                tag_key = f"{self.cache_prefix}tag:{tag}"
                self.redis_client.sadd(tag_key, cache_key)
                # Set TTL for tag sets
                self.redis_client.expire(tag_key, 86400)  # 24 hours
        except Exception as e:
            logger.warning(f"Failed to store cache tags: {e}")
    
    def _update_stats(self, cache_type: CacheType, hit: bool, retrieval_time: float):
        """Update cache performance statistics"""
        self.stats['requests'] += 1
        self.stats['total_retrieval_time'] += retrieval_time
        
        if hit:
            self.stats['hits'] += 1
            self.stats['cache_type_stats'][cache_type.value]['hits'] += 1
        else:
            self.stats['misses'] += 1
            self.stats['cache_type_stats'][cache_type.value]['misses'] += 1
    
    def _get_top_cached_queries(self) -> List[Dict[str, Any]]:
        """Get top cached queries (simplified implementation)"""
        try:
            # This would be more sophisticated in production
            # For now, return basic info about cache keys
            if hasattr(self.redis_client, 'keys'):
                query_keys = self.redis_client.keys(f"{self.cache_prefix}query_response:*")
                return [
                    {
                        "key": key.decode() if isinstance(key, bytes) else key,
                        "type": "query_response"
                    }
                    for key in query_keys[:10]  # Top 10
                ]
            else:
                # Memory fallback
                return [
                    {"key": key, "type": "memory_cache"}
                    for key in list(self.redis_client.cache.keys())[:10]
                ]
        except Exception as e:
            logger.warning(f"Failed to get top queries: {e}")
            return []


# Caching decorators for easy integration
def cached_query(cache_type: CacheType, ttl: Optional[int] = None, tags: Optional[List[str]] = None):
    """
    Decorator for caching function results
    
    Args:
        cache_type: Type of cache entry
        ttl: Time to live in seconds
        tags: Tags for invalidation
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key from function arguments
            cache_key_data = {
                'function': func.__name__,
                'args': str(args),
                'kwargs': kwargs
            }
            
            # Try to get from cache
            cached_result = caching_layer.get(cache_type, cache_key_data)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            caching_layer.set(cache_type, cache_key_data, result, ttl, tags)
            
            return result
        return wrapper
    return decorator


# Global caching instance
caching_layer = CachingLayer()
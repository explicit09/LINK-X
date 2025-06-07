"""
Query Embedding Cache Service
Reduces latency and costs by caching frequently used query embeddings
"""
import hashlib
import json
import logging
from typing import List, Optional
from datetime import datetime, timedelta
import redis
from openai import OpenAI

logger = logging.getLogger(__name__)

class QueryEmbeddingCache:
    """
    Caches query embeddings to avoid repeated API calls
    
    Benefits:
    - Reduces latency from 200-500ms to <10ms for cached queries
    - Saves API costs for repeated queries
    - Improves user experience
    """
    
    def __init__(self, redis_client: redis.Redis, ttl_hours: int = 24):
        self.redis = redis_client
        self.ttl = timedelta(hours=ttl_hours)
        self.openai = OpenAI()
        
    def _get_cache_key(self, query: str, model: str = "text-embedding-3-small") -> str:
        """Generate deterministic cache key for query"""
        # Normalize query: lowercase, strip whitespace
        normalized = query.lower().strip()
        # Create hash for consistent key
        query_hash = hashlib.md5(f"{model}:{normalized}".encode()).hexdigest()
        return f"embedding:query:{query_hash}"
    
    def get_embedding(self, query: str, model: str = "text-embedding-3-small") -> List[float]:
        """
        Get embedding from cache or generate new one
        
        Performance:
        - Cache hit: <10ms
        - Cache miss: 200-500ms (OpenAI API call)
        """
        cache_key = self._get_cache_key(query, model)
        
        # Try cache first
        cached = self.redis.get(cache_key)
        if cached:
            logger.debug(f"Cache hit for query: {query[:50]}...")
            return json.loads(cached)
        
        # Generate new embedding
        logger.debug(f"Cache miss, generating embedding for: {query[:50]}...")
        response = self.openai.embeddings.create(
            model=model,
            input=query
        )
        embedding = response.data[0].embedding
        
        # Cache for future use
        self.redis.setex(
            cache_key,
            self.ttl,
            json.dumps(embedding)
        )
        
        # Track cache metrics
        self._increment_metric("cache_miss")
        
        return embedding
    
    def get_batch_embeddings(self, queries: List[str], model: str = "text-embedding-3-small") -> List[List[float]]:
        """
        Get embeddings for multiple queries efficiently
        
        Optimizations:
        - Checks cache for all queries first
        - Batches uncached queries in single API call
        - Caches all results
        """
        embeddings = {}
        uncached_queries = []
        
        # Check cache for all queries
        for query in queries:
            cache_key = self._get_cache_key(query, model)
            cached = self.redis.get(cache_key)
            if cached:
                embeddings[query] = json.loads(cached)
            else:
                uncached_queries.append(query)
        
        # Batch generate uncached embeddings
        if uncached_queries:
            logger.info(f"Generating {len(uncached_queries)} embeddings in batch")
            response = self.openai.embeddings.create(
                model=model,
                input=uncached_queries
            )
            
            # Cache all new embeddings
            for query, embedding_data in zip(uncached_queries, response.data):
                embedding = embedding_data.embedding
                embeddings[query] = embedding
                
                cache_key = self._get_cache_key(query, model)
                self.redis.setex(cache_key, self.ttl, json.dumps(embedding))
        
        # Return in original order
        return [embeddings[query] for query in queries]
    
    def warm_cache(self, common_queries: List[str], model: str = "text-embedding-3-small"):
        """
        Pre-populate cache with common queries
        
        Use cases:
        - "What is machine learning?"
        - "Explain neural networks"
        - "How does deep learning work?"
        - Common course-specific queries
        """
        logger.info(f"Warming cache with {len(common_queries)} common queries")
        self.get_batch_embeddings(common_queries, model)
    
    def get_cache_stats(self) -> dict:
        """Get cache performance statistics"""
        hits = int(self.redis.get("embedding:metrics:cache_hit") or 0)
        misses = int(self.redis.get("embedding:metrics:cache_miss") or 0)
        total = hits + misses
        
        return {
            "hits": hits,
            "misses": misses,
            "total": total,
            "hit_rate": (hits / total * 100) if total > 0 else 0,
            "estimated_savings_ms": hits * 300,  # Assume 300ms saved per hit
            "estimated_cost_savings": hits * 0.000002  # ~$0.02 per 1M tokens
        }
    
    def _increment_metric(self, metric: str):
        """Track cache metrics"""
        key = f"embedding:metrics:{metric}"
        self.redis.incr(key)
        
    def clear_cache(self):
        """Clear all cached embeddings"""
        pattern = "embedding:query:*"
        for key in self.redis.scan_iter(match=pattern):
            self.redis.delete(key)
        logger.info("Embedding cache cleared")

# Example usage:
"""
# In your search service:
from services.query_embedding_cache import QueryEmbeddingCache

cache = QueryEmbeddingCache(redis_client, ttl_hours=24)

# Instead of:
# embedding = openai.embeddings.create(input=query)

# Use:
embedding = cache.get_embedding(query)

# Warm cache on startup:
common_queries = [
    "what is machine learning",
    "explain neural networks",
    "how does AI work",
    "what are embeddings"
]
cache.warm_cache(common_queries)
"""
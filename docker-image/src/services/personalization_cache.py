"""
Personalization Cache Service
Implements caching for personalized content to improve performance
"""

import json
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from ..core.cache import redis_client

logger = logging.getLogger(__name__)


class PersonalizationCache:
    """
    Caching layer for personalized content
    """
    
    def __init__(self, ttl_hours: int = 24):
        self.redis = redis_client
        self.ttl = ttl_hours * 3600  # Convert to seconds
        self.namespace = "personalization"
        
    def _generate_cache_key(
        self,
        file_id: str,
        student_profile: Dict[str, Any],
        section_id: Optional[str] = None
    ) -> str:
        """
        Generate a deterministic cache key based on file and profile
        """
        # Create a stable hash of the profile
        profile_items = []
        for key in sorted(student_profile.keys()):
            value = student_profile[key]
            if isinstance(value, list):
                value = sorted(value)
            profile_items.append(f"{key}:{value}")
        
        profile_string = "|".join(str(item) for item in profile_items)
        profile_hash = hashlib.md5(profile_string.encode()).hexdigest()[:16]
        
        # Build cache key
        if section_id:
            return f"{self.namespace}:{file_id}:{profile_hash}:{section_id}"
        else:
            return f"{self.namespace}:{file_id}:{profile_hash}"
    
    async def get_cached_content(
        self,
        file_id: str,
        student_profile: Dict[str, Any],
        section_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached personalized content
        """
        try:
            cache_key = self._generate_cache_key(file_id, student_profile, section_id)
            
            # Get from Redis
            cached_data = self.redis.get(cache_key)
            
            if cached_data:
                logger.info(f"Cache hit for key: {cache_key}")
                return json.loads(cached_data)
            else:
                logger.info(f"Cache miss for key: {cache_key}")
                return None
                
        except Exception as e:
            logger.error(f"Cache retrieval error: {e}")
            return None
    
    async def cache_content(
        self,
        file_id: str,
        student_profile: Dict[str, Any],
        content: Dict[str, Any],
        section_id: Optional[str] = None
    ) -> bool:
        """
        Cache personalized content
        """
        try:
            cache_key = self._generate_cache_key(file_id, student_profile, section_id)
            
            # Add metadata
            content_with_metadata = {
                **content,
                '_cached_at': datetime.utcnow().isoformat(),
                '_cache_version': '1.0'
            }
            
            # Store in Redis with TTL
            self.redis.setex(
                cache_key,
                self.ttl,
                json.dumps(content_with_metadata)
            )
            
            logger.info(f"Cached content for key: {cache_key}")
            return True
            
        except Exception as e:
            logger.error(f"Cache storage error: {e}")
            return False
    
    async def invalidate_cache(
        self,
        file_id: str,
        student_profile: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Invalidate cached content for a file
        """
        try:
            if student_profile:
                # Invalidate specific profile cache
                pattern = self._generate_cache_key(file_id, student_profile, "*")
            else:
                # Invalidate all caches for the file
                pattern = f"{self.namespace}:{file_id}:*"
            
            # Find and delete matching keys
            keys = []
            cursor = 0
            while True:
                cursor, batch_keys = self.redis.scan(cursor, match=pattern, count=100)
                keys.extend(batch_keys)
                if cursor == 0:
                    break
            
            if keys:
                deleted = self.redis.delete(*keys)
                logger.info(f"Invalidated {deleted} cache entries for pattern: {pattern}")
                return deleted
            else:
                return 0
                
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
            return 0
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics
        """
        try:
            # Count total cached items
            pattern = f"{self.namespace}:*"
            total_keys = 0
            cursor = 0
            
            while True:
                cursor, keys = self.redis.scan(cursor, match=pattern, count=100)
                total_keys += len(keys)
                if cursor == 0:
                    break
            
            # Get memory usage (approximate)
            info = self.redis.info()
            
            return {
                'total_cached_items': total_keys,
                'memory_used_mb': info.get('used_memory', 0) / (1024 * 1024),
                'hit_rate': self._calculate_hit_rate(),
                'ttl_hours': self.ttl / 3600
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}
    
    def _calculate_hit_rate(self) -> float:
        """
        Calculate cache hit rate from Redis stats
        """
        try:
            info = self.redis.info()
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            
            total = hits + misses
            if total > 0:
                return (hits / total) * 100
            else:
                return 0.0
                
        except:
            return 0.0


class PersonalizationCacheWarmer:
    """
    Preemptively cache popular content combinations
    """
    
    def __init__(self, cache: PersonalizationCache):
        self.cache = cache
        
    async def warm_cache_for_popular_content(
        self,
        popular_files: List[str],
        common_profiles: List[Dict[str, Any]]
    ):
        """
        Pre-generate and cache content for popular file/profile combinations
        """
        # This would be called by a background task
        # Implementation depends on your specific needs
        pass
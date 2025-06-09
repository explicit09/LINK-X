"""
OpenAI Rate Limiting Service with adaptive batching and multi-key support.
Prevents 429 errors and ensures sustainable throughput under real-world constraints.
"""
import asyncio
import time
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json
import random
from enum import Enum

import aiohttp
from openai import AsyncOpenAI, RateLimitError
import backoff

logger = logging.getLogger(__name__)


class RateLimitTier(Enum):
    """OpenAI rate limit tiers"""
    TIER_1 = "tier_1"    # 3,000 RPM, 200,000 TPM
    TIER_2 = "tier_2"    # 5,000 RPM, 450,000 TPM  
    TIER_3 = "tier_3"    # 7,000 RPM, 600,000 TPM
    TIER_4 = "tier_4"    # 10,000 RPM, 800,000 TPM
    TIER_5 = "tier_5"    # 30,000 RPM, 2,000,000 TPM


@dataclass
class RateLimitConfig:
    """Rate limit configuration for a specific tier"""
    requests_per_minute: int
    tokens_per_minute: int
    max_batch_size: int = 100
    safety_margin: float = 0.8  # Use 80% of limits for safety
    
    @property
    def safe_rpm(self) -> int:
        return int(self.requests_per_minute * self.safety_margin)
    
    @property
    def safe_tpm(self) -> int:
        return int(self.tokens_per_minute * self.safety_margin)


# Rate limit configurations by tier
RATE_LIMITS = {
    RateLimitTier.TIER_1: RateLimitConfig(3000, 200000),
    RateLimitTier.TIER_2: RateLimitConfig(5000, 450000),
    RateLimitTier.TIER_3: RateLimitConfig(7000, 600000),
    RateLimitTier.TIER_4: RateLimitConfig(10000, 800000),
    RateLimitTier.TIER_5: RateLimitConfig(30000, 2000000),
}


@dataclass
class APIKey:
    """API key with usage tracking"""
    key: str
    tier: RateLimitTier
    requests_made: int = 0
    tokens_used: int = 0
    last_reset: datetime = field(default_factory=datetime.utcnow)
    circuit_breaker_until: Optional[datetime] = None
    consecutive_errors: int = 0
    
    @property
    def is_available(self) -> bool:
        """Check if key is available for use"""
        now = datetime.utcnow()
        
        # Check circuit breaker
        if self.circuit_breaker_until and now < self.circuit_breaker_until:
            return False
            
        # Reset counters every minute
        if now - self.last_reset >= timedelta(minutes=1):
            self.requests_made = 0
            self.tokens_used = 0
            self.last_reset = now
            
        config = RATE_LIMITS[self.tier]
        
        # Check if we're under limits
        return (
            self.requests_made < config.safe_rpm and
            self.tokens_used < config.safe_tpm
        )
    
    def record_usage(self, tokens: int):
        """Record API usage"""
        self.requests_made += 1
        self.tokens_used += tokens
        self.consecutive_errors = 0  # Reset error count on success
    
    def record_error(self):
        """Record API error for circuit breaker"""
        self.consecutive_errors += 1
        
        # Circuit breaker: 5 consecutive errors = 5 min timeout
        if self.consecutive_errors >= 5:
            self.circuit_breaker_until = datetime.utcnow() + timedelta(minutes=5)
            logger.warning(f"Circuit breaker activated for key ending in {self.key[-4:]}")


class AdaptiveRateLimiter:
    """
    Adaptive rate limiter with multiple API keys and dynamic batch sizing.
    
    Features:
    - Multiple API key rotation
    - Dynamic batch size adjustment based on rate limits
    - Circuit breaker for failed keys
    - Adaptive backoff on 429 errors
    - Token usage estimation and tracking
    """
    
    def __init__(self, api_keys: List[Tuple[str, RateLimitTier]]):
        self.keys = [APIKey(key, tier) for key, tier in api_keys]
        self.clients = {key.key: AsyncOpenAI(api_key=key.key) for key in self.keys}
        self.request_history = []
        self.adaptive_batch_size = 50  # Start conservative
        
    def get_available_key(self) -> Optional[APIKey]:
        """Get an available API key, preferring least used"""
        available_keys = [k for k in self.keys if k.is_available]
        
        if not available_keys:
            return None
            
        # Sort by usage (requests + tokens/1000) to balance load
        return min(available_keys, key=lambda k: k.requests_made + k.tokens_used/1000)
    
    def estimate_tokens(self, texts: List[str]) -> int:
        """Estimate token count for texts (rough approximation)"""
        # Rough estimate: 1 token ≈ 4 characters for English
        return sum(len(text) for text in texts) // 4
    
    def calculate_optimal_batch_size(self, available_key: APIKey, estimated_tokens: int, num_texts: int = 1) -> int:
        """Calculate optimal batch size based on current limits"""
        if not available_key:
            return 1
            
        config = RATE_LIMITS[available_key.tier]
        
        # Calculate how many tokens we can afford
        remaining_tokens = config.safe_tpm - available_key.tokens_used
        remaining_requests = config.safe_rpm - available_key.requests_made
        
        # Ensure we don't exceed either limit
        max_by_requests = min(remaining_requests, config.max_batch_size)
        
        # Calculate tokens per text for batch sizing
        tokens_per_text = estimated_tokens // num_texts if num_texts > 0 else estimated_tokens
        max_by_tokens = min(remaining_tokens // tokens_per_text if tokens_per_text > 0 else 1, 
                           config.max_batch_size)
        
        optimal_size = min(max_by_requests, max_by_tokens, self.adaptive_batch_size)
        
        return max(1, optimal_size)  # Always process at least 1
    
    def adjust_batch_size(self, success: bool, response_time: float):
        """Adjust batch size based on recent performance"""
        if success and response_time < 5.0:  # Fast response
            self.adaptive_batch_size = min(100, self.adaptive_batch_size + 5)
        elif not success or response_time > 10.0:  # Slow/failed response
            self.adaptive_batch_size = max(10, self.adaptive_batch_size - 10)
    
    @backoff.on_exception(
        backoff.expo,
        RateLimitError,
        max_tries=3,
        base=2,
        max_value=30
    )
    async def generate_embeddings_adaptive(
        self, 
        texts: List[str], 
        model: str = "text-embedding-3-small"
    ) -> Optional[List[List[float]]]:
        """
        Generate embeddings with adaptive rate limiting.
        
        Returns:
            List of embeddings or None if all keys exhausted
        """
        if not texts:
            return []
            
        start_time = time.time()
        estimated_tokens = self.estimate_tokens(texts)
        
        # Get available key
        key = self.get_available_key()
        if not key:
            logger.warning("All API keys exhausted or in circuit breaker")
            # Wait for next minute reset
            await asyncio.sleep(60)
            key = self.get_available_key()
            if not key:
                return None
        
        # Calculate optimal batch size
        batch_size = self.calculate_optimal_batch_size(key, estimated_tokens, len(texts))
        
        # Process in batches if needed
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            try:
                client = self.clients[key.key]
                response = await client.embeddings.create(
                    model=model,
                    input=batch
                )
                
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
                
                # Record successful usage
                batch_tokens = self.estimate_tokens(batch)
                key.record_usage(batch_tokens)
                
                logger.debug(
                    f"Processed {len(batch)} embeddings using key {key.key[-4:]} "
                    f"(batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size})"
                )
                
                # Small delay between batches to avoid overwhelming
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.1)
                
            except RateLimitError as e:
                logger.warning(f"Rate limit hit for key {key.key[-4:]}: {e}")
                key.record_error()
                
                # Try with different key
                key = self.get_available_key()
                if not key:
                    logger.error("All keys rate limited")
                    return None
                    
                # Retry with new key and smaller batch
                batch_size = max(1, batch_size // 2)
                continue
                
            except Exception as e:
                logger.error(f"Embedding generation error: {e}")
                key.record_error()
                raise
        
        # Adjust batch size based on performance
        response_time = time.time() - start_time
        self.adjust_batch_size(True, response_time)
        
        # Calculate number of batches
        num_batches = (len(texts) + batch_size - 1) // batch_size
        
        logger.info(
            f"Generated {len(all_embeddings)} embeddings in {response_time:.2f}s "
            f"using {num_batches} batches"
        )
        
        return all_embeddings
    
    def get_rate_limit_status(self) -> Dict:
        """Get current rate limit status for monitoring"""
        status = {}
        
        for i, key in enumerate(self.keys):
            config = RATE_LIMITS[key.tier]
            status[f"key_{i+1}"] = {
                "tier": key.tier.value,
                "available": key.is_available,
                "requests_used": key.requests_made,
                "requests_limit": config.safe_rpm,
                "tokens_used": key.tokens_used,
                "tokens_limit": config.safe_tpm,
                "usage_percent": max(
                    key.requests_made / config.safe_rpm * 100,
                    key.tokens_used / config.safe_tpm * 100
                ),
                "circuit_breaker_active": key.circuit_breaker_until is not None,
                "consecutive_errors": key.consecutive_errors
            }
        
        return {
            "keys": status,
            "adaptive_batch_size": self.adaptive_batch_size,
            "total_available_keys": len([k for k in self.keys if k.is_available])
        }


# Singleton instance for global use
_rate_limiter: Optional[AdaptiveRateLimiter] = None


def get_rate_limiter() -> AdaptiveRateLimiter:
    """Get or create the global rate limiter instance"""
    global _rate_limiter
    
    if _rate_limiter is None:
        # Load API keys from environment
        import os
        
        api_keys = []
        
        # Primary key
        primary_key = os.getenv('OPENAI_API_KEY')
        if primary_key:
            # Detect tier from key or default to TIER_1
            tier = RateLimitTier(os.getenv('OPENAI_TIER', 'tier_1'))
            api_keys.append((primary_key, tier))
        
        # Additional keys for scaling
        for i in range(2, 6):  # Support up to 5 keys
            key = os.getenv(f'OPENAI_API_KEY_{i}')
            if key:
                tier = RateLimitTier(os.getenv(f'OPENAI_TIER_{i}', 'tier_1'))
                api_keys.append((key, tier))
        
        if not api_keys:
            raise ValueError("No OpenAI API keys configured")
        
        _rate_limiter = AdaptiveRateLimiter(api_keys)
        logger.info(f"Initialized rate limiter with {len(api_keys)} API keys")
    
    return _rate_limiter
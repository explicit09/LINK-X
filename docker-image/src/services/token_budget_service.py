"""
Token Budget Service - Manages token usage limits per user session
"""
import logging
from typing import Tuple
from datetime import datetime, timedelta
from core.cache import cache

logger = logging.getLogger(__name__)

class TokenBudgetService:
    """
    Service to manage token usage budgets for users.
    
    Limits:
    - 1000 tokens per session (approx $0.02)
    - Resets daily
    """
    
    TOKEN_LIMIT_PER_SESSION = 1000
    CACHE_TTL = 86400  # 24 hours
    
    def __init__(self):
        self.cache = cache
    
    def _get_cache_key(self, user_id: str) -> str:
        """Get cache key for user's token usage"""
        today = datetime.now().strftime('%Y-%m-%d')
        return f"token_usage:{user_id}:{today}"
    
    def get_usage(self, user_id: str) -> int:
        """Get current token usage for user"""
        try:
            key = self._get_cache_key(user_id)
            usage = self.cache.get(key)
            return int(usage) if usage else 0
        except Exception as e:
            logger.error(f"Error getting token usage: {str(e)}")
            return 0
    
    def check_budget(self, user_id: str) -> Tuple[bool, int]:
        """
        Check if user has budget remaining.
        
        Returns:
            Tuple of (can_continue, remaining_tokens)
        """
        current_usage = self.get_usage(user_id)
        remaining = self.TOKEN_LIMIT_PER_SESSION - current_usage
        can_continue = remaining > 0
        
        return can_continue, max(0, remaining)
    
    def track_usage(self, user_id: str, tokens_used: int) -> bool:
        """
        Track token usage for user.
        
        Args:
            user_id: User ID
            tokens_used: Number of tokens to add to usage
            
        Returns:
            bool: True if within budget, False if exceeded
        """
        try:
            key = self._get_cache_key(user_id)
            current_usage = self.get_usage(user_id)
            new_usage = current_usage + tokens_used
            
            # Check if exceeding limit
            if new_usage > self.TOKEN_LIMIT_PER_SESSION:
                logger.warning(f"User {user_id} exceeded token limit: {new_usage}/{self.TOKEN_LIMIT_PER_SESSION}")
                return False
            
            # Update cache
            self.cache.set(key, new_usage, ttl=self.CACHE_TTL)
            
            logger.info(f"User {user_id} token usage: {new_usage}/{self.TOKEN_LIMIT_PER_SESSION}")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking token usage: {str(e)}")
            return True  # Allow continuation on error
    
    def reset_usage(self, user_id: str) -> None:
        """Reset token usage for user (admin function)"""
        try:
            key = self._get_cache_key(user_id)
            self.cache.delete(key)
            logger.info(f"Reset token usage for user {user_id}")
        except Exception as e:
            logger.error(f"Error resetting token usage: {str(e)}")
    
    def get_usage_stats(self, user_id: str) -> dict:
        """Get detailed usage statistics for user"""
        current_usage = self.get_usage(user_id)
        can_continue, remaining = self.check_budget(user_id)
        
        return {
            'user_id': user_id,
            'current_usage': current_usage,
            'limit': self.TOKEN_LIMIT_PER_SESSION,
            'remaining': remaining,
            'percentage_used': (current_usage / self.TOKEN_LIMIT_PER_SESSION) * 100,
            'can_continue': can_continue,
            'estimated_cost': (current_usage / 1000) * 0.02,  # $0.02 per 1k tokens
            'reset_time': datetime.now().replace(hour=0, minute=0, second=0) + timedelta(days=1)
        }
"""JWT Blacklist Service for token revocation"""
import redis
from datetime import datetime, timedelta
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)


class JWTBlacklistService:
    """Service for managing revoked JWT tokens"""
    
    def __init__(self):
        self._redis_client = None
        self.prefix = "jwt_blacklist:"
        self.user_tokens_prefix = "user_tokens:"
    
    @property
    def redis_client(self):
        """Lazy initialization of Redis client to avoid app context issues"""
        if self._redis_client is None:
            try:
                from core.settings import get_settings
                settings = get_settings()
                self._redis_client = redis.from_url(
                    str(settings.redis_url),
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                # Test the connection
                self._redis_client.ping()
                logger.info("Redis connection established for JWT blacklist service")
            except Exception as e:
                logger.error(f"Failed to initialize Redis for JWT blacklist: {e}")
                self._redis_client = None
        return self._redis_client
    
    def blacklist_token(self, jti: str, exp: datetime, user_id: Optional[str] = None) -> bool:
        """
        Add a token to the blacklist
        
        Args:
            jti: JWT ID (unique identifier for the token)
            exp: Token expiration time
            user_id: Optional user ID for tracking
            
        Returns:
            bool: True if successfully blacklisted
        """
        try:
            redis_client = self.redis_client
            if not redis_client:
                logger.warning(f"Redis unavailable - cannot blacklist token {jti[:8]}...")
                return False
            
            # Calculate TTL (time until token expires)
            ttl = int((exp - datetime.utcnow()).total_seconds())
            
            if ttl <= 0:
                # Token already expired, no need to blacklist
                return True
            
            # Store in Redis with expiration
            key = f"{self.prefix}{jti}"
            value = json.dumps({
                'user_id': user_id,
                'blacklisted_at': datetime.utcnow().isoformat(),
                'expires_at': exp.isoformat()
            })
            
            redis_client.setex(key, ttl, value)
            
            # Track token for user (for bulk revocation)
            if user_id:
                user_key = f"{self.user_tokens_prefix}{user_id}"
                redis_client.sadd(user_key, jti)
                redis_client.expire(user_key, 86400 * 30)  # 30 days
            
            logger.debug(f"Successfully blacklisted token {jti[:8]}... for user {user_id}")
            return True
            
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error when blacklisting token: {e}")
            return False
        except Exception as e:
            logger.error(f"Error blacklisting token: {e}")
            return False
    
    def is_token_blacklisted(self, jti: str) -> bool:
        """
        Check if a token is blacklisted
        
        Args:
            jti: JWT ID to check
            
        Returns:
            bool: True if token is blacklisted
        """
        try:
            redis_client = self.redis_client
            if not redis_client:
                # Redis is unavailable - fail OPEN to prevent total lockout
                logger.warning(f"SECURITY: Redis unavailable, allowing token {jti[:8]}... (fail-open)")
                return False
            
            key = f"{self.prefix}{jti}"
            return redis_client.exists(key) > 0
        except redis.ConnectionError as e:
            # Redis is down - fail OPEN to prevent total lockout
            logger.error(f"Redis connection error when checking blacklist: {e}")
            logger.warning(f"SECURITY: Allowing token {jti[:8]}... due to Redis failure (fail-open)")
            return False
        except Exception as e:
            # Other errors - log but fail open
            logger.error(f"Unexpected error checking blacklist: {e}")
            logger.warning(f"SECURITY: Allowing token {jti[:8]}... due to unexpected error (fail-open)")
            return False
    
    def blacklist_all_user_tokens(self, user_id: str) -> int:
        """
        Blacklist all tokens for a specific user
        Useful for security events like password change
        
        Args:
            user_id: User ID whose tokens to revoke
            
        Returns:
            int: Number of tokens blacklisted
        """
        try:
            redis_client = self.redis_client
            if not redis_client:
                logger.warning(f"Redis unavailable - cannot blacklist tokens for user {user_id}")
                return 0
            
            user_key = f"{self.user_tokens_prefix}{user_id}"
            token_ids = redis_client.smembers(user_key)
            
            count = 0
            for jti in token_ids:
                # Set a long expiration for user-revoked tokens
                key = f"{self.prefix}{jti}"
                if not redis_client.exists(key):
                    value = json.dumps({
                        'user_id': user_id,
                        'blacklisted_at': datetime.utcnow().isoformat(),
                        'reason': 'user_tokens_revoked'
                    })
                    redis_client.setex(key, 86400 * 7, value)  # 7 days
                    count += 1
            
            # Clear the user's token set
            redis_client.delete(user_key)
            
            logger.info(f"Blacklisted {count} tokens for user {user_id}")
            return count
            
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error when blacklisting user tokens: {e}")
            return 0
        except Exception as e:
            logger.error(f"Error blacklisting user tokens: {e}")
            return 0
    
    def get_blacklist_stats(self) -> dict:
        """Get statistics about blacklisted tokens"""
        try:
            redis_client = self.redis_client
            if not redis_client:
                return {
                    'blacklisted_tokens': 0,
                    'affected_users': 0,
                    'redis_status': 'unavailable',
                    'error': 'Redis connection unavailable'
                }
            
            # Count blacklisted tokens
            keys = redis_client.keys(f"{self.prefix}*")
            blacklisted_count = len(keys)
            
            # Count users with blacklisted tokens
            user_keys = redis_client.keys(f"{self.user_tokens_prefix}*")
            users_with_blacklisted = len(user_keys)
            
            return {
                'blacklisted_tokens': blacklisted_count,
                'affected_users': users_with_blacklisted,
                'redis_status': 'connected',
                'redis_memory_usage': redis_client.info('memory').get('used_memory_human', 'N/A')
            }
            
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error getting blacklist stats: {e}")
            return {
                'blacklisted_tokens': 0,
                'affected_users': 0,
                'redis_status': 'connection_error',
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error getting blacklist stats: {e}")
            return {
                'blacklisted_tokens': 0,
                'affected_users': 0,
                'redis_status': 'error',
                'error': str(e)
            }
    
    def cleanup_expired(self) -> int:
        """
        Clean up expired entries (Redis does this automatically with TTL,
        but this method is for manual cleanup if needed)
        
        Returns:
            int: Number of entries cleaned
        """
        # Redis automatically removes expired keys
        # This is just for stats
        return 0


# Singleton instance
jwt_blacklist = JWTBlacklistService()
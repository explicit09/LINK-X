"""
Personalization Memory Service - Tracks user learning patterns and preferences
"""

import json
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from redis import Redis

logger = logging.getLogger(__name__)

class PersonalizationMemoryService:
    """Service to track and learn from user personalization interactions"""
    
    def __init__(self, cache: Redis):
        self.cache = cache
        self.memory_expiry = 30 * 24 * 3600  # 30 days
    
    def track_section_interaction(self, user_id: str, section_id: str, content_domain: str, 
                                primary_interest: str, feedback: Optional[str] = None):
        """Track how user interacts with personalized content"""
        try:
            # Track successful interest matches
            interest_key = f"user_interests:{user_id}:{primary_interest}"
            self.cache.incr(interest_key)
            self.cache.expire(interest_key, self.memory_expiry)
            
            # Track domain familiarity
            domain_key = f"user_domains:{user_id}:{content_domain}"
            self.cache.incr(domain_key)
            self.cache.expire(domain_key, self.memory_expiry)
            
            # Track feedback if provided
            if feedback:
                feedback_key = f"user_feedback:{user_id}"
                feedback_data = {
                    'section_id': section_id,
                    'domain': content_domain,
                    'interest': primary_interest,
                    'feedback': feedback,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Store last 50 feedback items
                self.cache.lpush(feedback_key, json.dumps(feedback_data))
                self.cache.ltrim(feedback_key, 0, 49)
                self.cache.expire(feedback_key, self.memory_expiry)
                
        except Exception as e:
            logger.error(f"Error tracking interaction: {e}")
    
    def get_preferred_interests(self, user_id: str) -> List[str]:
        """Get user's most successful interest matches"""
        try:
            keys = self.cache.keys(f"user_interests:{user_id}:*")
            scores = []
            
            for key in keys:
                interest = key.decode().split(':')[-1]
                score = int(self.cache.get(key) or 0)
                scores.append((interest, score))
            
            # Return top 3 interests by usage
            scores.sort(key=lambda x: x[1], reverse=True)
            return [interest for interest, _ in scores[:3]]
            
        except Exception as e:
            logger.error(f"Error getting preferred interests: {e}")
            return []
    
    def get_domain_familiarity(self, user_id: str) -> Dict[str, int]:
        """Get user's familiarity with different content domains"""
        try:
            keys = self.cache.keys(f"user_domains:{user_id}:*")
            familiarity = {}
            
            for key in keys:
                domain = key.decode().split(':')[-1]
                score = int(self.cache.get(key) or 0)
                familiarity[domain] = score
            
            return familiarity
            
        except Exception as e:
            logger.error(f"Error getting domain familiarity: {e}")
            return {}
    
    def get_learning_insights(self, user_id: str) -> Dict:
        """Get insights about user's learning patterns"""
        try:
            insights = {
                'preferred_interests': self.get_preferred_interests(user_id),
                'domain_familiarity': self.get_domain_familiarity(user_id),
                'total_sections': self._get_total_sections_viewed(user_id),
                'learning_streak': self._calculate_learning_streak(user_id)
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting learning insights: {e}")
            return {}
    
    def _get_total_sections_viewed(self, user_id: str) -> int:
        """Get total number of sections user has viewed"""
        try:
            keys = self.cache.keys(f"user_interests:{user_id}:*")
            total = 0
            for key in keys:
                total += int(self.cache.get(key) or 0)
            return total
        except:
            return 0
    
    def _calculate_learning_streak(self, user_id: str) -> int:
        """Calculate how many consecutive days user has been learning"""
        try:
            # This would typically check daily activity patterns
            # For now, return a simple calculation based on recent activity
            recent_key = f"recent_activity:{user_id}"
            recent_activity = self.cache.get(recent_key)
            
            if recent_activity:
                last_activity = datetime.fromisoformat(recent_activity.decode())
                days_since = (datetime.now() - last_activity).days
                return max(0, 7 - days_since)  # Simple streak calculation
            
            return 0
        except:
            return 0
    
    def update_recent_activity(self, user_id: str):
        """Update user's recent activity timestamp"""
        try:
            recent_key = f"recent_activity:{user_id}"
            self.cache.set(recent_key, datetime.now().isoformat(), ex=self.memory_expiry)
        except Exception as e:
            logger.error(f"Error updating recent activity: {e}")
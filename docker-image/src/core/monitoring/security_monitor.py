"""
Security monitoring with pattern detection and threat analysis
"""
import time
from datetime import datetime
from .trackers import (
    track_failed_auth, track_suspicious_activity, track_security_event
)
from .metrics_definitions import api_rate_limit_hits

class SecurityMonitor:
    """Enhanced security monitoring with pattern detection"""
    
    def __init__(self):
        self._failed_attempts = {}
        self._suspicious_patterns = {}
    
    def track_failed_login(self, user_id: str, source_ip: str, method: str):
        """Track failed login attempts with pattern detection"""
        track_failed_auth(method, 'invalid_credentials')
        
        # Track per IP
        key = f"ip:{source_ip}"
        self._failed_attempts[key] = self._failed_attempts.get(key, 0) + 1
        
        # Track per user
        if user_id:
            key = f"user:{user_id}"
            self._failed_attempts[key] = self._failed_attempts.get(key, 0) + 1
        
        # Check for suspicious patterns
        if self._failed_attempts.get(f"ip:{source_ip}", 0) > 5:
            track_suspicious_activity('repeated_failed_login', 'high')
            track_security_event('brute_force_attempt', 'critical', source_ip)
        
        if user_id and self._failed_attempts.get(f"user:{user_id}", 0) > 3:
            track_suspicious_activity('account_targeted', 'medium')
    
    def track_unusual_access_pattern(self, user_id: str, source_ip: str, endpoint: str):
        """Track unusual access patterns"""
        # Simple pattern detection - could be enhanced with ML
        hour = datetime.now().hour
        
        # Flag access during unusual hours (midnight to 6 AM)
        if 0 <= hour <= 6:
            track_suspicious_activity('unusual_hours_access', 'low')
        
        # Track rapid API calls (simplified)
        key = f"{user_id}:{source_ip}"
        current_time = time.time()
        
        if key in self._suspicious_patterns:
            last_time, count = self._suspicious_patterns[key]
            if current_time - last_time < 1.0:  # Within 1 second
                count += 1
                if count > 10:  # More than 10 calls per second
                    track_suspicious_activity('rapid_api_calls', 'medium')
                    api_rate_limit_hits.labels(
                        endpoint=endpoint,
                        user_id=user_id
                    ).inc()
        
        self._suspicious_patterns[key] = (current_time, 
                                        self._suspicious_patterns.get(key, (0, 0))[1] + 1)
    
    def reset_failed_attempts(self, identifier: str):
        """Reset failed attempts for successful login"""
        self._failed_attempts.pop(identifier, None)
    
    def get_failed_attempts_count(self, identifier: str) -> int:
        """Get current failed attempts count for identifier"""
        return self._failed_attempts.get(identifier, 0)
    
    def is_ip_suspicious(self, source_ip: str) -> bool:
        """Check if IP has suspicious activity"""
        return self._failed_attempts.get(f"ip:{source_ip}", 0) > 3
    
    def is_user_under_attack(self, user_id: str) -> bool:
        """Check if user account is under attack"""
        return self._failed_attempts.get(f"user:{user_id}", 0) > 2

# Global security monitor instance
security_monitor = SecurityMonitor()
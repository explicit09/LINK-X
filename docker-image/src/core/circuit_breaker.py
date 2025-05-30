"""
Circuit Breaker implementation for external service resilience
"""
import time
import logging
from typing import Callable, Any, Optional
from enum import Enum
from functools import wraps
from threading import Lock

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker pattern implementation for external services
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exceptions: tuple = (Exception,),
        success_threshold: int = 2
    ):
        """
        Initialize circuit breaker
        
        Args:
            name: Identifier for this circuit breaker
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before trying half-open
            expected_exceptions: Exceptions that count as failures
            success_threshold: Successes needed in half-open to close
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exceptions = expected_exceptions
        self.success_threshold = success_threshold
        
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = None
        self._lock = Lock()
        
    @property
    def state(self) -> CircuitState:
        """Get current circuit state"""
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if we should try half-open
                if self._last_failure_time and \
                   time.time() - self._last_failure_time >= self.recovery_timeout:
                    logger.info(f"Circuit breaker {self.name}: transitioning to HALF_OPEN")
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
            return self._state
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function through circuit breaker
        
        Args:
            func: Function to call
            *args, **kwargs: Arguments for the function
            
        Returns:
            Function result
            
        Raises:
            CircuitOpenError: If circuit is open
            Original exception: If function fails
        """
        if self.state == CircuitState.OPEN:
            raise CircuitOpenError(f"Circuit breaker {self.name} is OPEN")
            
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exceptions as e:
            self._on_failure()
            raise
            
    def _on_success(self):
        """Handle successful call"""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                logger.debug(f"Circuit breaker {self.name}: success {self._success_count}/{self.success_threshold}")
                
                if self._success_count >= self.success_threshold:
                    logger.info(f"Circuit breaker {self.name}: closing circuit")
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success
                self._failure_count = 0
                
    def _on_failure(self):
        """Handle failed call"""
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            logger.warning(f"Circuit breaker {self.name}: failure {self._failure_count}/{self.failure_threshold}")
            
            if self._state == CircuitState.HALF_OPEN:
                # Single failure in half-open reopens circuit
                logger.warning(f"Circuit breaker {self.name}: reopening circuit")
                self._state = CircuitState.OPEN
                self._failure_count = 0
            elif self._failure_count >= self.failure_threshold:
                logger.error(f"Circuit breaker {self.name}: opening circuit")
                self._state = CircuitState.OPEN
                self._failure_count = 0
                
    def reset(self):
        """Manually reset circuit breaker"""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._last_failure_time = None
            logger.info(f"Circuit breaker {self.name}: manually reset")


class CircuitOpenError(Exception):
    """Raised when circuit is open"""
    pass


def circuit_breaker(
    name: Optional[str] = None,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exceptions: tuple = (Exception,),
    success_threshold: int = 2
):
    """
    Decorator for applying circuit breaker pattern
    
    Args:
        name: Circuit breaker name (defaults to function name)
        failure_threshold: Failures before opening
        recovery_timeout: Recovery timeout in seconds
        expected_exceptions: Exceptions to catch
        success_threshold: Successes to close from half-open
    """
    def decorator(func):
        cb_name = name or f"{func.__module__}.{func.__name__}"
        breaker = CircuitBreaker(
            name=cb_name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exceptions=expected_exceptions,
            success_threshold=success_threshold
        )
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            return breaker.call(func, *args, **kwargs)
            
        # Attach breaker for testing/monitoring
        wrapper.circuit_breaker = breaker
        return wrapper
        
    return decorator


# Global registry for monitoring
_circuit_breakers = {}


def get_circuit_breaker(name: str) -> Optional[CircuitBreaker]:
    """Get circuit breaker by name"""
    return _circuit_breakers.get(name)


def register_circuit_breaker(breaker: CircuitBreaker):
    """Register circuit breaker for monitoring"""
    _circuit_breakers[breaker.name] = breaker


def get_all_circuit_breakers() -> dict:
    """Get all registered circuit breakers"""
    return _circuit_breakers.copy()


def circuit_breaker_status() -> dict:
    """Get status of all circuit breakers"""
    return {
        name: {
            "state": breaker.state.value,
            "failure_count": breaker._failure_count,
            "success_count": breaker._success_count,
            "last_failure": breaker._last_failure_time
        }
        for name, breaker in _circuit_breakers.items()
    }
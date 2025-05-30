"""
Test circuit breaker implementation
"""
import pytest
import time
from core.circuit_breaker import CircuitBreaker, CircuitOpenError, circuit_breaker


def test_circuit_breaker_basic():
    """Test basic circuit breaker functionality"""
    call_count = 0
    
    def failing_function():
        nonlocal call_count
        call_count += 1
        raise Exception("Test failure")
    
    # Create circuit breaker with low threshold
    cb = CircuitBreaker(
        name="test",
        failure_threshold=2,
        recovery_timeout=1
    )
    
    # First failure
    with pytest.raises(Exception):
        cb.call(failing_function)
    assert call_count == 1
    
    # Second failure - should open circuit
    with pytest.raises(Exception):
        cb.call(failing_function)
    assert call_count == 2
    
    # Circuit should be open now
    with pytest.raises(CircuitOpenError):
        cb.call(failing_function)
    assert call_count == 2  # Function not called
    
    # Wait for recovery
    time.sleep(1.1)
    
    # Circuit should be half-open, test recovery
    def success_function():
        return "success"
    
    # First success in half-open
    result = cb.call(success_function)
    assert result == "success"
    
    # Second success - circuit should close
    result = cb.call(success_function)
    assert result == "success"
    
    # Circuit should be closed now
    assert cb.state.value == "closed"


def test_circuit_breaker_decorator():
    """Test circuit breaker as decorator"""
    call_count = 0
    
    @circuit_breaker(failure_threshold=2, recovery_timeout=1)
    def decorated_function(should_fail=True):
        nonlocal call_count
        call_count += 1
        if should_fail:
            raise Exception("Test failure")
        return "success"
    
    # Test failures
    with pytest.raises(Exception):
        decorated_function()
    
    with pytest.raises(Exception):
        decorated_function()
    
    # Circuit should be open
    with pytest.raises(CircuitOpenError):
        decorated_function()
    
    # Call count should be 2 (circuit opened after 2 failures)
    assert call_count == 2
    
    # Wait for recovery
    time.sleep(1.1)
    
    # Test recovery
    result = decorated_function(should_fail=False)
    assert result == "success"
    
    result = decorated_function(should_fail=False)
    assert result == "success"
    
    # Circuit should be closed
    assert decorated_function.circuit_breaker.state.value == "closed"


if __name__ == "__main__":
    test_circuit_breaker_basic()
    test_circuit_breaker_decorator()
    print("All circuit breaker tests passed!")
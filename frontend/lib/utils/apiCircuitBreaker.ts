interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

class APICircuitBreaker {
  private state: Map<string, CircuitBreakerState> = new Map();
  private readonly maxFailures = 3;
  private readonly resetTimeout = 60000; // 1 minute
  private readonly retryDelay = 30000; // 30 seconds

  shouldAllowRequest(endpoint: string): boolean {
    const state = this.getState(endpoint);
    
    if (!state.isOpen) {
      return true;
    }

    // Check if enough time has passed to attempt reset
    if (Date.now() >= state.nextRetryTime) {
      this.reset(endpoint);
      return true;
    }

    return false;
  }

  recordSuccess(endpoint: string): void {
    this.reset(endpoint);
  }

  recordFailure(endpoint: string): void {
    const state = this.getState(endpoint);
    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.failureCount >= this.maxFailures) {
      state.isOpen = true;
      state.nextRetryTime = Date.now() + this.retryDelay;
    }

    this.state.set(endpoint, state);
  }

  private getState(endpoint: string): CircuitBreakerState {
    if (!this.state.has(endpoint)) {
      this.state.set(endpoint, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
      });
    }
    return this.state.get(endpoint)!;
  }

  private reset(endpoint: string): void {
    this.state.set(endpoint, {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
    });
  }

  getStatus(endpoint: string): { isOpen: boolean; retryIn?: number } {
    const state = this.getState(endpoint);
    if (state.isOpen && state.nextRetryTime > Date.now()) {
      return {
        isOpen: true,
        retryIn: Math.ceil((state.nextRetryTime - Date.now()) / 1000),
      };
    }
    return { isOpen: false };
  }
}

export const apiCircuitBreaker = new APICircuitBreaker(); 
#!/usr/bin/env node

/**
 * Test script to verify authentication retry logic with network failures
 */

// Mock fetch with configurable failures
let failureCount = 0;
const maxFailures = 2;

global.fetch = async (url, options) => {
  console.log(`\n[FETCH] ${options?.method || 'GET'} ${url}`);
  
  // Health check endpoint
  if (url.includes('/api/health')) {
    if (failureCount < maxFailures) {
      failureCount++;
      console.log(`[HEALTH CHECK] Simulating failure ${failureCount}/${maxFailures}`);
      throw new TypeError('Load failed');
    }
    console.log('[HEALTH CHECK] Success');
    return {
      ok: true,
      json: async () => ({ status: 'healthy' })
    };
  }
  
  // Login endpoint
  if (url.includes('/api/v2/auth/login')) {
    if (failureCount < maxFailures) {
      failureCount++;
      console.log(`[LOGIN] Simulating network failure ${failureCount}/${maxFailures}`);
      throw new TypeError('Load failed');
    }
    console.log('[LOGIN] Success');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          tokens: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600
          },
          user: {
            id: 1,
            email: 'test@example.com',
            role: 'student'
          }
        }
      })
    };
  }
  
  throw new Error(`Unexpected URL: ${url}`);
};

// Mock other globals
global.AbortController = class {
  constructor() {
    this.signal = { aborted: false };
  }
  abort() {
    this.signal.aborted = true;
  }
};

global.setTimeout = (fn, ms) => {
  console.log(`[TIMEOUT] Set for ${ms}ms`);
  return { ref: () => {}, unref: () => {} };
};

global.clearTimeout = () => {};

global.window = {
  sessionStorage: {
    setItem: (key, value) => console.log(`[SESSION STORAGE] Set ${key}: ${value}`),
    getItem: () => null,
    removeItem: () => {}
  }
};

// Test the registration manager
async function testRetryLogic() {
  console.log('=== Testing Authentication Retry Logic ===\n');
  
  // Import and test
  try {
    const { RegistrationManager } = await import('./lib/auth/registration-manager.ts');
    
    const mockFirebaseManager = {
      getFirebaseToken: async () => 'mock-firebase-token'
    };
    
    const authStateUpdates = [];
    const onAuthStateUpdated = (state) => {
      console.log('\n[AUTH STATE UPDATE]', JSON.stringify(state, null, 2));
      authStateUpdates.push(state);
    };
    
    const manager = new RegistrationManager(mockFirebaseManager, onAuthStateUpdated);
    
    // Mock Firebase user
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com'
    };
    
    console.log('\n--- Starting login with retry logic ---');
    failureCount = 0; // Reset failure count
    
    const success = await manager.login(mockUser);
    
    console.log(`\n--- Login result: ${success ? 'SUCCESS' : 'FAILURE'} ---`);
    console.log(`Total attempts made: ${failureCount}`);
    console.log(`Auth state updates: ${authStateUpdates.length}`);
    
  } catch (error) {
    console.error('\nTest failed:', error);
  }
}

// Run the test
testRetryLogic().catch(console.error);
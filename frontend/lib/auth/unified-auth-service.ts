/**
 * Unified Authentication Service
 * Uses the new streamlined backend authentication endpoints
 */
import { authService } from './supabase-auth-service';

export interface UnifiedSession {
  authenticated: boolean;
  registered: boolean;
  requires_onboarding: boolean;
  user: {
    id: string;
    email: string;
    display_name: string;
    role: string;
    has_completed_onboarding: boolean;
    firebase_uid?: string;
    created_at?: string;
  };
  session?: {
    access_token: string;
    expires_in: number;
  };
}

export interface RegistrationData {
  access_token: string;
  role: 'student' | 'instructor';
  name?: string;
  onboard_answers?: Record<string, any>;
  want_quizzes?: boolean;
  university?: string;
  department?: string;
}

export interface OnboardingData {
  access_token: string;
  onboard_answers: Record<string, any>;
  want_quizzes?: boolean;
}

class UnifiedAuthService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  private sessionCache: string | null = null; // Now stores encrypted session
  private cacheExpiry: number = 0;
  private tokenHash: string | null = null; // Track current token for invalidation
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_KEY = 'unified_session_cache';
  private readonly CACHE_EXPIRY_KEY = 'unified_session_cache_expiry';
  private readonly TOKEN_HASH_KEY = 'unified_session_token_hash';
  private readonly CACHE_VERSION_KEY = 'unified_session_cache_version';
  private readonly CACHE_VERSION = '1.1'; // Increment this to invalidate old caches

  constructor() {
    // Load cache from localStorage on initialization
    this.loadCacheFromStorage();
    
    // Listen for auth state changes to clear cache when user logs out
    if (typeof window !== 'undefined') {
      authService.onAuthStateChange((user) => {
        if (!user) {
          // User logged out, clear cache
          console.log('[UnifiedAuthService] User logged out, clearing cache');
          this.clearCache();
        }
      });
    }
  }

  /**
   * Load cached session from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const cachedVersion = localStorage.getItem(this.CACHE_VERSION_KEY);
      const cachedSession = localStorage.getItem(this.CACHE_KEY);
      const cachedExpiry = localStorage.getItem(this.CACHE_EXPIRY_KEY);
      const cachedTokenHash = localStorage.getItem(this.TOKEN_HASH_KEY);
      
      // Check cache version first
      if (cachedVersion !== this.CACHE_VERSION) {
        console.log('[UnifiedAuthService] Cache version mismatch, clearing old cache');
        this.clearStorageCache();
        return;
      }
      
      if (cachedSession && cachedExpiry && cachedTokenHash) {
        const expiry = parseInt(cachedExpiry, 10);
        if (Date.now() < expiry) {
          this.sessionCache = cachedSession;
          this.cacheExpiry = expiry;
          this.tokenHash = cachedTokenHash;
          console.log('[UnifiedAuthService] Loaded session from localStorage, expires:', new Date(expiry));
        } else {
          // Cache expired, clear it
          this.clearStorageCache();
        }
      }
    } catch (error) {
      console.error('[UnifiedAuthService] Error loading cache from storage:', error);
      this.clearStorageCache();
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      if (this.sessionCache && this.tokenHash) {
        localStorage.setItem(this.CACHE_VERSION_KEY, this.CACHE_VERSION);
        localStorage.setItem(this.CACHE_KEY, this.sessionCache);
        localStorage.setItem(this.CACHE_EXPIRY_KEY, this.cacheExpiry.toString());
        localStorage.setItem(this.TOKEN_HASH_KEY, this.tokenHash);
        console.log('[UnifiedAuthService] Saved session to localStorage');
      }
    } catch (error) {
      console.error('[UnifiedAuthService] Error saving cache to storage:', error);
    }
  }

  /**
   * Clear localStorage cache
   */
  private clearStorageCache(): void {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_EXPIRY_KEY);
      localStorage.removeItem(this.TOKEN_HASH_KEY);
      localStorage.removeItem(this.CACHE_VERSION_KEY);
    } catch (error) {
      console.error('[UnifiedAuthService] Error clearing storage cache:', error);
    }
  }

  /**
   * Simple encryption for session cache (client-side only)
   * Uses browser's crypto API for basic encryption
   */
  private async encryptSession(session: UnifiedSession): Promise<string> {
    try {
      const sessionString = JSON.stringify(session);
      // Simple base64 encoding (not truly secure, but better than plain text)
      // In production, you'd want proper encryption with a key derived from user session
      return btoa(sessionString);
    } catch (error) {
      console.error('Session encryption error:', error);
      return JSON.stringify(session);
    }
  }

  /**
   * Decrypt cached session data
   */
  private async decryptSession(encryptedSession: string): Promise<UnifiedSession | null> {
    try {
      const sessionString = atob(encryptedSession);
      return JSON.parse(sessionString);
    } catch (error) {
      console.error('Session decryption error:', error);
      return null;
    }
  }

  /**
   * Generate hash from token for cache invalidation
   */
  private async hashToken(token: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(token.substring(0, 50)); // Use first 50 chars
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Token hashing error:', error);
      return token.substring(0, 20); // Fallback to simple substring
    }
  }

  /**
   * Get cached session without making API call
   * Used for immediate session restoration on page load
   */
  async getCachedSession(): Promise<UnifiedSession | null> {
    try {
      if (!this.sessionCache || Date.now() >= this.cacheExpiry) {
        return null;
      }
      
      // Verify we still have a valid Supabase session
      const supabaseSession = await authService.getSession();
      if (!supabaseSession) {
        console.log('[UnifiedAuthService] No Supabase session, clearing cache');
        this.clearCache();
        return null;
      }
      
      const decryptedSession = await this.decryptSession(this.sessionCache);
      if (decryptedSession) {
        console.log('[UnifiedAuthService] Found valid cached session');
        return decryptedSession;
      }
    } catch (error) {
      console.error('[UnifiedAuthService] Error getting cached session:', error);
    }
    return null;
  }

  /**
   * Create a session using unified endpoint
   * This replaces login + registration check + onboarding status check
   */
  async createSession(): Promise<UnifiedSession | null> {
    try {
      console.log('[UnifiedAuthService] Creating session, baseUrl:', this.baseUrl);
      const token = await authService.getAccessToken();
      if (!token) {
        console.log('[UnifiedAuthService] No access token available');
        throw new Error('No access token available');
      }
      console.log('[UnifiedAuthService] Got access token:', token.substring(0, 50) + '...');

      // Check if token has changed (invalidate cache if so)
      const currentTokenHash = await this.hashToken(token);
      const cacheValid = this.sessionCache && 
                        Date.now() < this.cacheExpiry && 
                        this.tokenHash === currentTokenHash;

      // Return cached session if still valid and token hasn't changed
      if (cacheValid && this.sessionCache) {
        const decryptedSession = await this.decryptSession(this.sessionCache);
        if (decryptedSession) {
          console.log('[UnifiedAuthService] Returning cached session');
          return decryptedSession;
        }
      }

      // Cache miss or invalid - fetch new session
      const url = `${this.baseUrl}/api/v2/auth/unified/session`;
      console.log('[UnifiedAuthService] Fetching session from:', url);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: token,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

      console.log('[UnifiedAuthService] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UnifiedAuthService] Error response body:', errorText);
        console.error('[UnifiedAuthService] Error response headers:', Object.fromEntries(response.headers.entries()));
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `Session creation failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('[UnifiedAuthService] Session created successfully:', data.data);
      
      // Encrypt and cache the session
      this.sessionCache = await this.encryptSession(data.data);
      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      this.tokenHash = currentTokenHash;
      
      // Save to localStorage for persistence across page refreshes
      this.saveCacheToStorage();
      
        return data.data;
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Session creation timed out. Please try again.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('[UnifiedAuthService] Session creation error:', error);
      // Clear cache on error
      this.clearCache();
      
      // Don't return null for timeout errors - throw them
      if (error.message?.includes('timed out')) {
        throw error;
      }
      
      return null;
    }
  }

  /**
   * Clear session cache (call this on logout or token change)
   */
  clearCache(): void {
    this.sessionCache = null;
    this.cacheExpiry = 0;
    this.tokenHash = null;
    this.clearStorageCache();
  }

  /**
   * Register a new user
   */
  async registerUser(registrationData: RegistrationData): Promise<UnifiedSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/auth/unified/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Complete onboarding for a student
   */
  async completeOnboarding(onboardingData: OnboardingData): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/auth/unified/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Onboarding completion failed');
      }

      return true;
    } catch (error) {
      console.error('Onboarding completion error:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<any | null> {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${this.baseUrl}/api/v2/auth/unified/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Profile fetch failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  }

  /**
   * Check if user needs to complete onboarding
   */
  isOnboardingRequired(session: UnifiedSession): boolean {
    return session.requires_onboarding || !session.user.has_completed_onboarding;
  }

  /**
   * Determine the redirect path after authentication
   */
  getRedirectPath(session: UnifiedSession): string {
    if (!session.authenticated) {
      return '/login';
    }

    if (!session.registered) {
      return '/onboarding';
    }

    if (this.isOnboardingRequired(session)) {
      return '/onboarding';
    }

    // User is fully authenticated and onboarded
    return '/dashboard';
  }
}

export const unifiedAuthService = new UnifiedAuthService();
export default unifiedAuthService;
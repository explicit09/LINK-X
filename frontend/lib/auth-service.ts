// Legacy auth service - compatibility layer for unified auth system
// This provides backward compatibility while transitioning to unified auth

import { unifiedAuthService } from './auth/unified-auth-service';
import { authService as supabaseAuth } from './auth/supabase-auth-service';

export interface RegistrationData {
  role: 'student' | 'instructor';
  name?: string;
  onboard_answers?: Record<string, any>;
  want_quizzes?: boolean;
  university?: string;
  department?: string;
}

/**
 * Legacy AuthService for backward compatibility
 * Now uses the unified authentication system under the hood
 */
class LegacyAuthService {
  private cachedSession: any = null;
  private lastSessionCheck: number = 0;
  private readonly SESSION_CACHE_TTL = 30000; // 30 seconds

  async getCurrentSession() {
    const now = Date.now();
    if (this.cachedSession && (now - this.lastSessionCheck) < this.SESSION_CACHE_TTL) {
      return this.cachedSession;
    }

    try {
      this.cachedSession = await unifiedAuthService.createSession();
      this.lastSessionCheck = now;
      return this.cachedSession;
    } catch (error) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await supabaseAuth.getCurrentUser();
    return !!user;
  }

  async isRegistered(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session?.registered || false;
  }

  async hasCompletedOnboarding(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return !session?.requires_onboarding;
  }

  async getUser() {
    const session = await this.getCurrentSession();
    return session?.user || null;
  }

  async loginWithSupabase(token: string): Promise<boolean> {
    try {
      const session = await unifiedAuthService.createSession();
      return !!session;
    } catch (error) {
      console.error('Login with Supabase failed:', error);
      return false;
    }
  }

  async register(data: RegistrationData): Promise<any> {
    try {
      const token = await supabaseAuth.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      return await unifiedAuthService.registerUser({
        ...data,
        access_token: token,
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await supabaseAuth.signOut();
      unifiedAuthService.clearCache();
      this.cachedSession = null;
      this.lastSessionCheck = 0;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  // Keep singleton pattern for backward compatibility
  static getInstance(): LegacyAuthService {
    if (!this.instance) {
      this.instance = new LegacyAuthService();
    }
    return this.instance;
  }

  private static instance: LegacyAuthService;
}

// Export singleton instance for backward compatibility
export const authService = LegacyAuthService.getInstance();
export default authService;
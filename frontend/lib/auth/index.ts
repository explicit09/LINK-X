/**
 * Auth module exports - Updated for unified authentication
 */

// Export main authentication services
export { authService as supabaseAuthService } from './supabase-auth-service';
export { unifiedAuthService } from './unified-auth-service';

// Export main service for backward compatibility
export { authService } from '../auth-service';
export type { RegistrationData } from '../auth-service';

// Export types
export type { AuthUser, AuthResponse } from './supabase-auth-service';
export type { UnifiedSession, RegistrationData as UnifiedRegistrationData, OnboardingData } from './unified-auth-service';
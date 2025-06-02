/**
 * Auth module exports
 * Provides access to individual auth components for advanced use cases
 */

export { FirebaseManager } from './firebase-manager';
export { TokenManager, type AuthTokens } from './token-manager';
export { UserManager, type UserProfile } from './user-manager';
export { RegistrationManager, type RegistrationData } from './registration-manager';

// Re-export the main service for convenience
export { AuthService, authService } from '../auth-service';
export type { AuthState } from '../auth-service';
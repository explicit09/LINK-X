import { auth } from '../../firebaseconfig';
import { User as FirebaseUser } from 'firebase/auth';

/**
 * FirebaseManager - Handles Firebase authentication integration
 * COPIED from working auth-service.ts to preserve exact functionality
 */
export class FirebaseManager {
  /**
   * Clear old session cookies from different Firebase projects
   * PRESERVE exact implementation from auth-service
   */
  clearOldSessionCookies() {
    if (typeof window === 'undefined') return;
    
    // Clear any old session cookies from different Firebase projects
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name =
        eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (name === 'session') {
        // Clear the cookie by setting it with an expired date
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      }
    });
  }

  /**
   * Get ID token from Firebase user
   * PRESERVE exact token retrieval logic
   */
  async getFirebaseToken(user: FirebaseUser): Promise<string | null> {
    try {
      const idToken = await user.getIdToken();
      return idToken;
    } catch (error) {
      console.error('Failed to get Firebase token:', error);
      return null;
    }
  }

  /**
   * Get current Firebase user
   * PRESERVE exact user access pattern
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Sign out from Firebase
   * PRESERVE exact logout implementation
   */
  async signOut(): Promise<void> {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Firebase signout failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is currently signed in to Firebase
   */
  isFirebaseAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  /**
   * Wait for Firebase auth state to be ready
   */
  async waitForAuthState(): Promise<FirebaseUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }
}
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser, onAuthStateChange } from '@/lib/auth/supabase-auth-service';
import { unifiedAuthService, UnifiedSession } from '@/lib/auth/unified-auth-service';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  isRegistered: boolean;
  backendUser: any | null;
  session: UnifiedSession | null;
  requiresOnboarding: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isRegistered: false,
  backendUser: null,
  session: null,
  requiresOnboarding: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [backendUser, setBackendUser] = useState<any | null>(null);
  const [session, setSession] = useState<UnifiedSession | null>(null);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChange(async (authUser) => {
        setUser(authUser);

        if (authUser) {
          // Only skip on landing page, not auth pages
          const currentPath = window.location.pathname;
          if (currentPath === '/' || currentPath === '') {
            // Skip backend session on landing page
            setLoading(false);
            return;
          }

          try {
            // Use unified authentication service
            const unifiedSession = await unifiedAuthService.createSession();
            
            if (unifiedSession) {
              setSession(unifiedSession);
              setIsRegistered(unifiedSession.registered);
              setRequiresOnboarding(unifiedSession.requires_onboarding);
              
              if (unifiedSession.registered) {
                setBackendUser(unifiedSession.user);
              }
            } else {
              // Session creation failed - user authenticated but not registered
              setSession(null);
              setIsRegistered(false);
              setBackendUser(null);
              setRequiresOnboarding(true);
            }
          } catch (error) {
            console.error('Error during unified authentication:', error);
            // Don't set error state for expected cases like unregistered users
            setSession(null);
            setIsRegistered(false);
            setBackendUser(null);
            setRequiresOnboarding(true);
          }
        } else {
          // No user, clear everything
          setSession(null);
          setIsRegistered(false);
          setBackendUser(null);
          setRequiresOnboarding(false);
        }

        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError(
        error instanceof Error ? error : new Error('Authentication failed'),
      );
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, isRegistered, backendUser, session, requiresOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

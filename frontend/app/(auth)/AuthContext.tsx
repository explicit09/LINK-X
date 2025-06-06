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
    console.log('[AuthProvider] Initializing auth provider');
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    
    // Set a timeout to ensure loading doesn't hang forever
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.error('[AuthProvider] Auth initialization timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout
    
    try {
      const unsubscribe = onAuthStateChange(async (authUser) => {
        if (!isMounted) return;
        
        console.log('[AuthProvider] Auth state changed:', authUser?.email || 'no user');
        clearTimeout(timeoutId); // Clear timeout on successful auth state change
        setUser(authUser);

        if (authUser) {
          try {
            // First, try to get cached session immediately
            console.log('[AuthContext] Checking for cached session first');
            const cachedSession = await unifiedAuthService.getCachedSession();
            
            if (cachedSession) {
              console.log('[AuthContext] Using cached session for immediate state update');
              setSession(cachedSession);
              setIsRegistered(cachedSession.registered);
              setRequiresOnboarding(cachedSession.requires_onboarding);
              
              if (cachedSession.registered) {
                setBackendUser(cachedSession.user);
              }
              
              // Still call createSession in background to refresh if needed
              unifiedAuthService.createSession().then(freshSession => {
                if (freshSession && JSON.stringify(freshSession) !== JSON.stringify(cachedSession)) {
                  console.log('[AuthContext] Updating with fresh session data');
                  setSession(freshSession);
                  setIsRegistered(freshSession.registered);
                  setRequiresOnboarding(freshSession.requires_onboarding);
                  if (freshSession.registered) {
                    setBackendUser(freshSession.user);
                  }
                }
              });
            } else {
              // No cache, create session normally
              console.log('[AuthContext] No cached session, creating new session');
              const unifiedSession = await unifiedAuthService.createSession();
              console.log('[AuthContext] Unified session result:', unifiedSession);
              
              if (unifiedSession) {
                setSession(unifiedSession);
                setIsRegistered(unifiedSession.registered);
                setRequiresOnboarding(unifiedSession.requires_onboarding);
                
                if (unifiedSession.registered) {
                  setBackendUser(unifiedSession.user);
                }
              } else {
                // Session creation failed - user authenticated but not registered
                console.log('[AuthContext] Session creation returned null - user may not be registered');
                setSession(null);
                setIsRegistered(false);
                setBackendUser(null);
                setRequiresOnboarding(true);
              }
            }
          } catch (error) {
            console.error('Error during unified authentication:', error);
            // For session errors, try to keep Supabase auth but clear backend state
            // This allows the user to stay "logged in" to Supabase while backend registration happens
            setSession(null);
            setIsRegistered(false);
            setBackendUser(null);
            setRequiresOnboarding(true);
            setLoading(false); // IMPORTANT: Set loading to false on error
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

      return () => {
        console.log('[AuthProvider] Cleaning up auth listener');
        isMounted = false;
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (error) {
      console.error('[AuthProvider] Auth initialization error:', error);
      clearTimeout(timeoutId);
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

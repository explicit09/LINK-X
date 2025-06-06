'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser, onAuthStateChange } from '@/lib/auth/supabase-auth-service';
import { authService as backendAuthService } from '@/lib/auth-service';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  isRegistered: boolean;
  backendUser: any | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isRegistered: false,
  backendUser: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [backendUser, setBackendUser] = useState<any | null>(null);

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
            // Get access token for backend
            const token = await authService.getAccessToken();
            
            if (token) {
              // Try to establish backend session with Supabase token
              const loginSuccess = await backendAuthService.loginWithSupabase(token);

              if (loginSuccess) {
                // Check if user is fully registered
                const registered = await backendAuthService.checkRegistrationStatus();
                setIsRegistered(registered);

                if (registered) {
                  setBackendUser(backendAuthService.getUser());
                  // User fully authenticated and registered
                } else {
                  // User authenticated but needs to complete registration
                }
              } else {
                // Backend login failed
              }
            }
          } catch (error) {
            console.error('Error during authentication:', error);
            // Don't set error state for expected cases like unregistered users
          }
        } else {
          // No user, clear everything
          setIsRegistered(false);
          setBackendUser(null);
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
      value={{ user, loading, error, isRegistered, backendUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

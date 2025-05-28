'use client';

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebaseconfig";
import { authService } from "@/lib/auth-service";

type AuthContextType = {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [backendUser, setBackendUser] = useState<any | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          setUser(firebaseUser);
          
          if (firebaseUser) {
            // Only skip on landing page, not auth pages
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath === '') {
              console.log('Skipping backend session on landing page');
              setLoading(false);
              return;
            }
            
            try {
              // Try to establish backend session
              const loginSuccess = await authService.login(firebaseUser);
              
              if (loginSuccess) {
                // Check if user is fully registered
                const registered = await authService.checkRegistrationStatus();
                setIsRegistered(registered);
                
                if (registered) {
                  setBackendUser(authService.getUser());
                  console.log('User fully authenticated and registered');
                } else {
                  console.log('User authenticated but needs to complete registration');
                }
              } else {
                console.log('Backend login failed');
              }
            } catch (error) {
              console.error('Error during authentication:', error);
              // Don't set error state for expected cases like unregistered users
            }
          } else {
            // No Firebase user, clear everything
            setIsRegistered(false);
            setBackendUser(null);
          }
          
          setLoading(false);
        },
        (error) => {
          console.error('Auth state change error:', error);
          setError(error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError(error instanceof Error ? error : new Error('Authentication failed'));
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, isRegistered, backendUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export { auth };
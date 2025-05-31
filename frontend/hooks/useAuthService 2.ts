import { useEffect, useState } from 'react';
import { authService } from '@/lib/auth-service';
import { useAuth } from '@/app/(auth)/AuthContext';

export function useAuthService() {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (user) {
        setIsAuthenticated(authService.isAuthenticated());
        setIsRegistered(authService.isRegistered());
      } else {
        setIsAuthenticated(false);
        setIsRegistered(false);
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, [user]);

  const makeAuthenticatedRequest = async (endpoint: string, options?: RequestInit) => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    try {
      const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${endpoint}`;
      
      return await authService.makeAuthenticatedRequest(url, options);
    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
  };

  return {
    isAuthenticated,
    isRegistered,
    isLoading,
    makeAuthenticatedRequest,
    logout,
    authService
  };
}
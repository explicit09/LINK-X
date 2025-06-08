import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * SIMPLE AUTH GUARD
 * Just redirects if not authenticated. No complex logic.
 */
export function useAuthGuard(redirectTo: string = '/login') {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [loading, isAuthenticated, redirectTo, router]);

  return { loading, isAuthenticated };
}
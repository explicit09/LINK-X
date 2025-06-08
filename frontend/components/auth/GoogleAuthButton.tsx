'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogoGoogle } from '@/components/icons';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface GoogleAuthButtonProps {
  mode: 'login' | 'register';
  onLoading?: (loading: boolean) => void;
  disabled?: boolean;
}

export function GoogleAuthButton({
  mode,
  onLoading,
  disabled,
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  // Check for stored error messages on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedError = window.sessionStorage.getItem('auth_error');
      if (storedError) {
        toast.error(storedError);
        window.sessionStorage.removeItem('auth_error');
      }
    }
  }, []);

  const handleGoogleAuth = async () => {
    console.log('[GoogleAuthButton] Button clicked!');
    
    if (disabled || loading) {
      console.log('[GoogleAuthButton] Button is disabled or loading');
      return;
    }

    setLoading(true);
    onLoading?.(true);

    try {
      // Sign in with Google using Supabase
      console.log('[GoogleAuthButton] Starting Google OAuth...');
      console.log('[GoogleAuthButton] Current URL:', window.location.origin);
      console.log('[GoogleAuthButton] Redirect URL:', `${window.location.origin}/auth/callback`);
      
      const { error } = await signInWithGoogle();
      
      console.log('[GoogleAuthButton] OAuth response:', { error });
      
      if (error) {
        console.error('[GoogleAuthButton] OAuth error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }
      
      // Store the mode in sessionStorage for the callback to use
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('google_auth_mode', mode);
      }
      
      // Supabase will redirect to Google OAuth
      // The user will be redirected back to /auth/callback after authentication
    } catch (error) {
      console.error('Google Auth Error:', error);

      // Handle Supabase errors
      const authError = error as { message?: string; status?: number };
      if (authError.message?.includes('OAuth')) {
        toast.error('OAuth configuration error. Please try again later.');
      } else if (authError.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(authError.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleAuth}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-3 h-12 bg-brand-indigo hover:bg-brand-navy text-white border-brand-indigo hover:border-brand-navy font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <LogoGoogle size={20} aria-label="Google logo" />
      )}
      <span className="text-base">
        {loading
          ? 'Signing in...'
          : `Sign ${mode === 'login' ? 'in' : 'up'} with Google`}
      </span>
    </Button>
  );
}
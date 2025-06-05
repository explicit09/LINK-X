'use client';

import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/firebaseconfig';
import { Button } from '@/components/ui/button';
import { LogoGoogle } from '@/components/icons';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api';
import { authService } from '@/lib/auth-service';

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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    if (disabled || loading) return;

    setLoading(true);
    onLoading?.(true);

    try {
      // Sign in with Google
      console.log('Starting Google sign-in popup...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google sign-in successful:', result.user.email);
      const user = result.user;
      const token = await user.getIdToken();

      if (mode === 'login') {
        // Try to establish session - if it works, user exists and is logged in
        const sessionSuccess = await authService.login(user);

        if (!sessionSuccess) {
          toast.error(
            'Account not found or login failed. Please sign up first.',
          );
          return;
        }

        // Login succeeded - user is registered
        toast.success('Successfully signed in with Google!');
        router.push('/dashboard');
      } else {
        // register mode
        // For Google auth, establish session first
        const sessionSuccess = await authService.login(user);
        if (!sessionSuccess) {
          throw new Error('Failed to establish session');
        }

        // Check if this is a new user by checking for student profile
        try {
          const profileResponse = await fetch(`${API_URL}/student/profile`, {
            method: 'GET',
            credentials: 'include',
          });

          if (profileResponse.ok) {
            // Student profile exists, user already registered
            toast.error('Account already exists. Please sign in instead.');
            router.push('/login');
            return;
          }
        } catch (error) {
          // Profile doesn&apos;t exist, this is a new user
        }

        // New user - redirect to onboarding to create profile
        toast.success('Account created successfully!');
        router.push('/onboarding');
      }
    } catch (error) {
      console.error('Google Auth Error:', error);

      // Handle specific Firebase errors
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        toast.info('Sign-in cancelled');
      } else if (firebaseError.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please allow popups and try again.');
      } else if (firebaseError.code === 'auth/network-request-failed') {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(firebaseError.message || 'Failed to sign in with Google');
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

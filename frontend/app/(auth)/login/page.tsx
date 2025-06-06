'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { SiteFooter } from '@/components/SiteFooter';

import { signInWithEmail } from '@/lib/auth/supabase-auth-service';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

// Import GoogleAuthButton with no SSR to prevent hydration mismatches
const GoogleAuthButton = dynamic(
  () =>
    import('@/components/auth/GoogleAuthButton').then((mod) => ({
      default: mod.GoogleAuthButton,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-12 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    ),
  },
);

export default function Page() {
  const router = useRouter();
  const { getRedirectPath, isAuthenticated, session, loading: authLoading } = useUnifiedAuth();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [state, setState] = useState<
    'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data'
  >('idle');

  // Show loading screen while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-brand-indigo border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Check for stored error messages on mount
    if (typeof window !== 'undefined') {
      const storedError = window.sessionStorage.getItem('auth_error');
      if (storedError) {
        toast.error(storedError);
        window.sessionStorage.removeItem('auth_error');
      }
    }

    // Handle auth state changes
    if (state === 'failed') {
      toast.error('Invalid credentials. Please try again.');
    } else if (state === 'invalid_data') {
      toast.error('Error validating your submission.');
    } else if (state === 'success') {
      setIsSuccessful(true);
      toast.success('Login successful!');
      
      // Use unified auth to determine redirect path
      setTimeout(() => {
        const redirectPath = getRedirectPath();
        router.push(redirectPath);
      }, 500);
    }
  }, [state, router, getRedirectPath]);

  // Redirect already authenticated users
  useEffect(() => {
    if (!authLoading && isAuthenticated && session?.registered) {
      const redirectPath = getRedirectPath();
      if (redirectPath !== '/login') {
        router.push(redirectPath);
      }
    }
  }, [authLoading, isAuthenticated, session, getRedirectPath, router]);

  const handleSubmit = async (formData: FormData) => {
    setEmail(formData.get('email') as string);
    setState('in_progress');

    try {
      console.log('Attempting Supabase sign in...');
      const { data: authUser, error } = await signInWithEmail(
        formData.get('email') as string,
        formData.get('password') as string,
      );

      if (error) {
        throw error;
      }

      console.log('Supabase sign in successful:', authUser?.email);
      
      // The AuthContext will automatically handle session creation
      // through the unified authentication system
      setState('success');
      
    } catch (error: any) {
      console.error('Auth Error:', error.message);
      
      // Handle Supabase specific errors
      if (error.message?.includes('Invalid login credentials') || 
          error.message?.includes('Email not confirmed')) {
        setState('failed');
        toast.error('Invalid email or password!');
      } else if (error.status === 400) {
        setState('failed');
        toast.error('Invalid credentials. Please try again.');
      } else {
        setState('invalid_data');
        toast.error(error.message || 'Unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="mb-8 text-center">
            <img
              src="/images/LearnXLogo.png"
              alt="LEARN-X"
              className="h-12 w-auto mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>
            <p className="text-gray-600">Sign in to continue learning</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="space-y-5">
              {/* Primary CTA - Google Sign In */}
              <GoogleAuthButton
                mode="login"
                disabled={state === 'in_progress'}
              />

              {/* Visual Divider */}
              <div className="my-4 border-t border-gray-200"></div>

              {/* Email/Password Form */}
              <AuthForm action={handleSubmit} defaultEmail={email}>
                <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
              </AuthForm>

              {/* Secondary Actions */}
              <div className="space-y-3 pt-2">
                <div className="text-center">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-brand-indigo hover:text-brand-navy font-medium transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <div className="text-center text-sm text-gray-600">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/register"
                    className="font-semibold text-brand-indigo hover:text-brand-navy transition-colors"
                  >
                    Sign up for free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site Footer */}
      <SiteFooter />
    </div>
  );
}

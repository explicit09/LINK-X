'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseconfig';
import { unifiedAuthService } from '@/lib/auth/unified-auth-service';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if we're in a redirect loop
    const redirectCount = parseInt(sessionStorage.getItem('auth_callback_count') || '0');
    if (redirectCount > 2) {
      console.error('Detected potential redirect loop');
      sessionStorage.removeItem('auth_callback_count');
      toast.error('Authentication failed. Please try again.');
      router.replace('/login');
      return;
    }
    sessionStorage.setItem('auth_callback_count', (redirectCount + 1).toString());
    
    const handleCallback = async () => {
      try {
        // Check for OAuth errors first
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || `OAuth error: ${error}`);
        }

        // For Supabase OAuth with PKCE, we should just wait for the session to be available
        // The Supabase client handles the PKCE flow automatically
        console.log('Waiting for OAuth session...');
        
        // Use exponential backoff to wait for session with max attempts
        let currentSession = null;
        let attempts = 0;
        const maxAttempts = 5;
        const baseDelay = 500;
        
        while (!currentSession && attempts < maxAttempts) {
          attempts++;
          const delay = baseDelay * Math.pow(2, attempts - 1); // 500, 1000, 2000, 4000, 8000
          
          console.log(`Attempt ${attempts}: Waiting ${delay}ms for OAuth session...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error(`Session error on attempt ${attempts}:`, sessionError);
            if (attempts === maxAttempts) {
              throw sessionError;
            }
            continue;
          }
          
          if (session) {
            currentSession = session;
            console.log('Session acquired successfully');
            break;
          }
        }
        
        if (!currentSession) {
          throw new Error('Unable to establish session after OAuth callback. Please try signing in again.');
        }

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No user data received from OAuth provider');

        // Get the stored auth mode
        const mode = window.sessionStorage.getItem('google_auth_mode') || 'login';
        window.sessionStorage.removeItem('google_auth_mode');

        // Use unified authentication system with retry logic
        let unifiedSession = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!unifiedSession && retryCount < maxRetries) {
          retryCount++;
          try {
            console.log(`Creating unified session (attempt ${retryCount})...`);
            unifiedSession = await unifiedAuthService.createSession();
            
            if (unifiedSession) {
              console.log('Unified session created successfully:', unifiedSession);
              break;
            } else {
              console.warn(`Session creation attempt ${retryCount} returned null/undefined`);
            }
          } catch (sessionError: any) {
            console.error(`Session creation error on attempt ${retryCount}:`, sessionError);
            console.error('Error details:', {
              message: sessionError?.message || 'Unknown error',
              stack: sessionError?.stack,
              name: sessionError?.name
            });
            if (retryCount === maxRetries) {
              throw new Error(`Failed to create session after multiple attempts: ${sessionError?.message || 'Unknown error'}`);
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
        
        if (unifiedSession) {
          // Don't clear cache immediately after successful session creation
          // The cache contains the session we just created
          console.log('Unified session available:', {
            authenticated: unifiedSession.authenticated,
            registered: unifiedSession.registered,
            requires_onboarding: unifiedSession.requires_onboarding,
            user_email: unifiedSession.user?.email,
            user_role: unifiedSession.user?.role
          });
          
          if (mode === 'login') {
            if (!unifiedSession.registered) {
              toast.error('Account not found. Please sign up first.');
              router.push('/register');
              return;
            }

            // Check redirect path based on unified auth state
            const redirectPath = unifiedAuthService.getRedirectPath(unifiedSession);
            
            if (redirectPath === '/onboarding') {
              toast.info('Please complete your profile setup');
            } else {
              toast.success('Successfully signed in with Google!');
            }
            
            // Clear redirect counter on success
            sessionStorage.removeItem('auth_callback_count');
            
            // Use replace instead of push to prevent back button loops
            router.replace(redirectPath);
          } else {
            // Register mode
            if (unifiedSession.registered && !unifiedSession.requires_onboarding) {
              // User already exists and is fully set up
              toast.error('Account already exists. Please sign in instead.');
              sessionStorage.removeItem('auth_callback_count');
              router.replace('/login');
            } else {
              // New user or needs to complete onboarding
              toast.success('Account created successfully! Complete your profile.');
              sessionStorage.removeItem('auth_callback_count');
              router.replace('/onboarding');
            }
          }
        }
        
        // If we reach here without a unified session, it means we exhausted retries
        if (!unifiedSession) {
          console.warn('Could not create unified session after all retries');
          
          // Fallback: If we have a valid Supabase session, proceed with basic redirect
          if (currentSession && user) {
            console.log('Using fallback mode - redirecting to dashboard with Supabase auth only');
            sessionStorage.removeItem('auth_callback_count');
            toast.info('Authentication successful. Setting up your profile...');
            router.replace('/dashboard');
            return;
          } else {
            console.error('No valid session available, redirecting to login');
            sessionStorage.removeItem('auth_callback_count');
            toast.error('Authentication failed. Please try again.');
            router.replace('/login');
            return;
          }
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        sessionStorage.removeItem('auth_callback_count');
        toast.error(error.message || 'Authentication failed. Please try again.');
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-indigo border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait while we set up your session</p>
      </div>
    </div>
  );
}
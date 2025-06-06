'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseconfig';
import { authService } from '@/lib/auth-service';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
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
        
        // Give Supabase a moment to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the session - Supabase should have processed the OAuth callback by now
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        let currentSession = session;

        if (!currentSession) {
          // If still no session, wait a bit more and try again
          console.log('No session yet, waiting longer...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
          
          if (retryError) {
            throw retryError;
          }
          
          if (!retrySession) {
            throw new Error('No session found after OAuth callback');
          }
          
          currentSession = retrySession;
        }

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No user data received from OAuth provider');

        // Get the stored auth mode
        const mode = window.sessionStorage.getItem('google_auth_mode') || 'login';
        window.sessionStorage.removeItem('google_auth_mode');

        const token = currentSession.access_token;

        if (token) {
          // Establish backend session
          const sessionSuccess = await authService.loginWithSupabase(token);

          if (mode === 'login') {
            if (!sessionSuccess) {
              toast.error('Account not found. Please sign up first.');
              router.push('/register');
              return;
            }

            // Check if user needs onboarding
            const hasCompletedOnboarding = authService.hasCompletedOnboarding();
            const user = authService.getUser();
            
            if (!hasCompletedOnboarding && user?.role === 'student') {
              toast.info('Please complete your profile setup');
              router.push('/onboarding');
            } else {
              toast.success('Successfully signed in with Google!');
              router.push('/dashboard');
            }
          } else {
            // Register mode
            if (sessionSuccess && authService.isRegistered()) {
              // User already exists and is registered
              toast.error('Account already exists. Please sign in instead.');
              router.push('/login');
            } else {
              // New user or needs to complete registration
              toast.success('Account created successfully! Complete your profile.');
              router.push('/onboarding');
            }
          }
        } else {
          throw new Error('Failed to get authentication token');
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error);
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
      </div>
    </div>
  );
}
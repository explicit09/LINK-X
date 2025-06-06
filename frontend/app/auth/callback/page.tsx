'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseconfig';
import { unifiedAuthService } from '@/lib/auth/unified-auth-service';
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

        // Use unified authentication system
        const unifiedSession = await unifiedAuthService.createSession();
        
        if (unifiedSession) {
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
            
            router.push(redirectPath);
          } else {
            // Register mode
            if (unifiedSession.registered && !unifiedSession.requires_onboarding) {
              // User already exists and is fully set up
              toast.error('Account already exists. Please sign in instead.');
              router.push('/login');
            } else {
              // New user or needs to complete onboarding
              toast.success('Account created successfully! Complete your profile.');
              router.push('/onboarding');
            }
          }
        } else {
          throw new Error('Failed to establish session');
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
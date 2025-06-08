'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseconfig';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[AuthCallback] Processing OAuth callback...');
        console.log('[AuthCallback] Full URL:', window.location.href);
        
        // Check for OAuth errors in URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        console.log('[AuthCallback] URL Params:', Object.fromEntries(urlParams));
        console.log('[AuthCallback] Hash Params:', Object.fromEntries(hashParams));
        
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

        if (error) {
          console.error('[AuthCallback] OAuth error:', error, errorDescription);
          toast.error(errorDescription || `Authentication failed: ${error}`);
          router.replace('/login');
          return;
        }

        // Exchange code for session
        const code = urlParams.get('code');
        if (code) {
          console.log('[AuthCallback] Found auth code:', code.substring(0, 10) + '...');
          console.log('[AuthCallback] Exchanging code for session...');
          
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          console.log('[AuthCallback] Exchange result:', { 
            session: data?.session ? 'EXISTS' : 'NONE',
            user: data?.user ? data.user.email : 'NONE',
            error: exchangeError?.message 
          });
          
          if (exchangeError) {
            console.error('[AuthCallback] Code exchange error:', exchangeError);
            toast.error(`Authentication failed: ${exchangeError.message}`);
            router.replace('/login');
            return;
          }
          
          if (!data?.session) {
            console.error('[AuthCallback] No session returned from code exchange');
            toast.error('Failed to establish session. Please try again.');
            router.replace('/login');
            return;
          }
          
          console.log('[AuthCallback] Session established successfully');
          console.log('[AuthCallback] User:', data.user?.email);
        } else {
          console.log('[AuthCallback] No auth code found in URL');
          toast.error('No authentication code received. Please try again.');
          router.replace('/login');
          return;
        }

        // Wait a moment for the session to propagate
        console.log('[AuthCallback] Waiting for session to propagate...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check final session state
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        console.log('[AuthCallback] Final session check:', finalSession ? 'EXISTS' : 'NONE');
        
        // Simple redirect to dashboard - let the dashboard handle onboarding checks
        console.log('[AuthCallback] Redirecting to dashboard');
        toast.success('Successfully signed in!');
        router.replace('/dashboard');
        
      } catch (error: any) {
        console.error('[AuthCallback] Unexpected error:', error);
        console.error('[AuthCallback] Error stack:', error.stack);
        toast.error(`Unexpected error: ${error.message}`);
        router.replace('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            Completing sign in...
          </h2>
          <p className="text-gray-600">
            Please wait while we set up your session.
          </p>
        </div>
      </div>
    </div>
  );
}
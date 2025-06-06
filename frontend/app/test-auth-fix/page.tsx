'use client';

import { useEffect, useState } from 'react';
import { supabase, clearAuthStorage, resetAuthState } from '@/supabaseconfig';
import { Button } from '@/components/ui/button';

export default function TestAuthFixPage() {
  const [authState, setAuthState] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthState = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      setAuthState({
        session: session ? {
          access_token: session.access_token.substring(0, 20) + '...',
          expires_at: session.expires_at,
          user_id: session.user?.id,
          user_email: session.user?.email,
        } : null,
        sessionError,
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        } : null,
        userError,
        localStorage: {
          supabaseToken: localStorage.getItem('supabase.auth.token') ? 'exists' : 'null',
          backendToken: localStorage.getItem('accessToken') ? 'exists' : 'null',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      setAuthState({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testGoogleAuth = async () => {
    try {
      // Store mode for callback
      sessionStorage.setItem('google_auth_mode', 'login');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('OAuth error:', error);
        alert(`OAuth error: ${error.message}`);
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert(`Auth error: ${String(error)}`);
    }
  };

  const handleClearStorage = () => {
    clearAuthStorage();
    checkAuthState();
  };

  const handleResetAuth = async () => {
    await resetAuthState();
    checkAuthState();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    checkAuthState();
  };

  useEffect(() => {
    checkAuthState();
    
    // Set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      checkAuthState();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading auth state...</div>
      </div>
    );
  }

  const hasSession = authState.session && authState.user;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Fix Test Page</h1>
        
        {/* Status Banner */}
        <div className={`mb-6 p-4 rounded-lg ${hasSession ? 'bg-green-100' : 'bg-red-100'}`}>
          <h2 className="text-lg font-semibold mb-2">
            {hasSession ? '✅ User is authenticated' : '❌ User is NOT authenticated'}
          </h2>
          {hasSession && (
            <p>Signed in as: {authState.user.email}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <Button onClick={testGoogleAuth} disabled={hasSession}>
              Test Google OAuth
            </Button>
            <Button onClick={handleSignOut} disabled={!hasSession} variant="destructive">
              Sign Out
            </Button>
            <Button onClick={handleClearStorage} variant="outline">
              Clear Storage
            </Button>
            <Button onClick={handleResetAuth} variant="outline">
              Reset Auth State
            </Button>
            <Button onClick={checkAuthState} variant="outline">
              Refresh State
            </Button>
          </div>
        </div>

        {/* Auth State Debug */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
} 
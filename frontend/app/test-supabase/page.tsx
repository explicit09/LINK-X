'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseconfig';
import { Button } from '@/components/ui/button';

export default function TestSupabasePage() {
  const [status, setStatus] = useState<any>({});
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkSupabase();
  }, []);

  const checkSupabase = async () => {
    try {
      // Test 1: Check if Supabase client is initialized
      setStatus(prev => ({ ...prev, client: '✅ Client initialized' }));

      // Test 2: Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setStatus(prev => ({ ...prev, session: `❌ Session error: ${sessionError.message}` }));
      } else {
        setStatus(prev => ({ ...prev, session: session ? '✅ Session found' : '⚠️ No session' }));
      }

      // Test 3: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        setStatus(prev => ({ ...prev, user: `❌ User error: ${userError.message}` }));
      } else {
        setStatus(prev => ({ ...prev, user: user ? '✅ User found' : '⚠️ No user' }));
        setUser(user);
      }

      // Test 4: Check auth state
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setStatus(prev => ({ ...prev, authState: `✅ Auth state listener working - Event: ${event}` }));
      });

      // Test 5: Test anon key by making a simple request
      const { error: anonError } = await supabase.from('_test_').select('*').limit(1);
      if (anonError?.message.includes('relation "_test_" does not exist')) {
        setStatus(prev => ({ ...prev, anon: '✅ Anon key working (table not found is expected)' }));
      } else if (anonError) {
        setStatus(prev => ({ ...prev, anon: `❌ Anon key error: ${anonError.message}` }));
      } else {
        setStatus(prev => ({ ...prev, anon: '✅ Anon key working' }));
      }

    } catch (error: any) {
      setStatus(prev => ({ ...prev, error: `❌ General error: ${error.message}` }));
    }
  };

  const testGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/test-supabase`,
        }
      });

      if (error) {
        setStatus(prev => ({ ...prev, google: `❌ Google OAuth error: ${error.message}` }));
      } else {
        setStatus(prev => ({ ...prev, google: '✅ Redirecting to Google...' }));
      }
    } catch (error: any) {
      setStatus(prev => ({ ...prev, google: `❌ Google error: ${error.message}` }));
    }
  };

  const testSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus(prev => ({ ...prev, signout: `❌ Sign out error: ${error.message}` }));
    } else {
      setStatus(prev => ({ ...prev, signout: '✅ Signed out successfully' }));
      setUser(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">Connection Status:</h2>
        {Object.entries(status).map(([key, value]) => (
          <div key={key} className="font-mono text-sm">
            {key}: {value}
          </div>
        ))}
      </div>

      {user && (
        <div className="mb-8 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Current User:</h3>
          <pre className="text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
        </div>
      )}

      <div className="space-x-4">
        <Button onClick={checkSupabase}>Refresh Status</Button>
        <Button onClick={testGoogleLogin} variant="outline">Test Google Login</Button>
        {user && <Button onClick={testSignOut} variant="destructive">Sign Out</Button>}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">Environment:</h3>
        <div className="text-sm font-mono">
          <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
          <div>Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</div>
        </div>
      </div>
    </div>
  );
}
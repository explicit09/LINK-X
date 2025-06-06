'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseconfig';
import { apiClient } from '@/lib/api/client';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [apiTestResults, setApiTestResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Check user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // Check localStorage tokens
        const backendToken = localStorage.getItem('accessToken');
        
        setDebugInfo({
          session: session ? {
            access_token: session.access_token.substring(0, 20) + '...',
            refresh_token: session.refresh_token?.substring(0, 12) + '...',
            expires_at: session.expires_at,
            user_id: session.user?.id,
            provider_token: session.provider_token || null,
            token_type: session.token_type || null,
          } : null,
          sessionError,
          user: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            confirmed_at: user.confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
          } : null,
          userError,
          localStorage: {
            backendToken: backendToken ? `${backendToken.substring(0, 20)}...` : 'null',
            supabaseSession: localStorage.getItem('supabase.auth.token') ? 'exists' : 'undefined',
          },
          authStatus: {
            hasSupabaseSession: !!session,
            hasBackendToken: !!backendToken,
            isSignedIn: !!user,
          }
        });
      } catch (error: any) {
        setDebugInfo({
          error: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const testAPIAuthentication = async () => {
    console.log('🧪 Starting API Authentication Tests...');
    
    try {
      // Test 1: Check what token the auth client will use
      console.log('🔍 Test 1: Checking AuthClient token info...');
      let authTokenInfo;
      try {
        // Access the authClient directly to get full token info
        const authInfo = await (apiClient as any).authClient.getAuthToken();
        authTokenInfo = authInfo ? {
          isSupabase: authInfo.isSupabase,
          tokenStart: authInfo.token.substring(0, 20) + '...',
          tokenLength: authInfo.token.length,
        } : { error: 'No token available' };
      } catch (error: any) {
        authTokenInfo = { error: error.message };
      }

      // Test 2: Make authenticated request to /api/v2/auth/me with detailed logging
      console.log('🔍 Test 2: Testing /api/v2/auth/me...');
      let meResult;
      try {
        meResult = await apiClient.get('/api/v2/auth/me');
        meResult = { 
          success: true, 
          data: meResult,
        };
      } catch (error: any) {
        meResult = { 
          error: error.message, 
          status: error.status,
          details: error.details || 'No additional details'
        };
      }

      // Test 3: Make authenticated request to /api/v2/courses
      console.log('🔍 Test 3: Testing /api/v2/courses...');
      let coursesResult;
      try {
        coursesResult = await apiClient.get('/api/v2/courses');
        coursesResult = { success: true, data: coursesResult };
      } catch (error: any) {
        coursesResult = { error: error.message, status: error.status };
      }
      
      // Test 4: Direct fetch test with manual auth header
      console.log('🔍 Test 4: Testing direct fetch with manual headers...');
      let directFetchResult;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await fetch('http://localhost:8080/api/v2/auth/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            directFetchResult = { success: true, data };
          } else {
            const errorText = await response.text();
            directFetchResult = { 
              error: `HTTP ${response.status}: ${response.statusText}`,
              status: response.status,
              body: errorText
            };
          }
        } else {
          directFetchResult = { error: 'No session token available' };
        }
      } catch (error: any) {
        directFetchResult = { error: error.message };
      }

      setApiTestResults({
        authTokenInfo,
        meEndpoint: meResult,
        coursesEndpoint: coursesResult,
        directFetch: directFetchResult,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      setApiTestResults({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const testLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/debug-auth`
        }
      });
      
      if (error) {
        alert('OAuth error: ' + error.message);
      }
    } catch (error) {
      alert('Error: ' + String(error));
    }
  };

  const testLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('accessToken'); // Clear backend token too
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading auth state...</div>
      </div>
    );
  }

  const isSignedIn = debugInfo.authStatus?.isSignedIn;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication Debug Page</h1>
        
        {/* Auth Status Banner */}
        <div className={`mb-6 p-4 rounded-lg ${isSignedIn ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
          <h2 className="text-lg font-semibold mb-2">
            {isSignedIn ? '✅ User is signed in' : '❌ User is NOT signed in'}
          </h2>
          {!isSignedIn && (
            <div>
              <p className="text-gray-700 mb-3">You need to sign in to test API authentication.</p>
              <button 
                onClick={testLogin}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
              >
                Sign In with Google
              </button>
            </div>
          )}
          {isSignedIn && (
            <div>
              <p className="text-gray-700 mb-3">Signed in as: {debugInfo.user?.email}</p>
              <button 
                onClick={testLogout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
        
        {/* Current Auth State */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Auth State</h2>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* API Test Button */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Authentication Test</h2>
          <button 
            onClick={testAPIAuthentication}
            disabled={!isSignedIn}
            className={`font-bold py-2 px-4 rounded ${
              isSignedIn 
                ? 'bg-blue-500 hover:bg-blue-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSignedIn ? 'Test API Authentication' : 'Sign in first to test API'}
          </button>
        </div>

        {/* API Test Results */}
        {Object.keys(apiTestResults).length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">API Test Results</h2>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(apiTestResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 
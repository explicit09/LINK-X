'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { supabase } from '@/lib/supabase';

export default function SupabaseTestPage() {
  const { user, session, loading } = useSupabase();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading) {
      if (user) {
        setMessage(`Logged in as: ${user.email}`);
      } else {
        setMessage('Not logged in');
      }
    }
  }, [user, loading]);

  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMessage('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">Supabase Test</h1>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
          <p className="text-center">{message}</p>
        </div>
        
        <div className="flex flex-col space-y-2">
          {!user ? (
            <button
              onClick={handleSignIn}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Sign in with GitHub
            </button>
          ) : (
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

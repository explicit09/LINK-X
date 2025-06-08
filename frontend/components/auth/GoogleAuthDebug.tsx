'use client';

import React, { useState } from 'react';
import { supabase } from '@/supabaseconfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GoogleAuthDebug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => setLogs([]);

  const testGoogleAuth = async () => {
    setLoading(true);
    clearLogs();
    
    try {
      addLog('Starting Google OAuth test...');
      addLog(`Current URL: ${window.location.href}`);
      addLog(`Redirect URL: ${window.location.origin}/auth/callback`);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      addLog(`Current session: ${session ? 'EXISTS' : 'NONE'}`);
      if (sessionError) addLog(`Session error: ${sessionError.message}`);
      
      // Test OAuth flow
      addLog('Initiating Google OAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      
      if (error) {
        addLog(`OAuth Error: ${error.message}`);
        addLog(`Error Details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addLog('OAuth initiated successfully');
        addLog(`OAuth Data: ${JSON.stringify(data, null, 2)}`);
      }
      
    } catch (error: any) {
      addLog(`Unexpected error: ${error.message}`);
      addLog(`Error stack: ${error.stack}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Google OAuth Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testGoogleAuth} disabled={loading}>
            {loading ? 'Testing...' : 'Test Google OAuth'}
          </Button>
          <Button onClick={clearLogs} variant="outline">
            Clear Logs
          </Button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg max-h-64 overflow-y-auto">
          <pre className="text-sm font-mono">
            {logs.length === 0 ? 'No logs yet...' : logs.join('\n')}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
} 
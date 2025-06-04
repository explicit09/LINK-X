'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { auth } from '@/firebaseconfig';

export default function TestPersonalizationPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [token, setToken] = useState<string>('');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testAuthToken = async () => {
    addLog('Testing auth token retrieval...');
    
    try {
      // Test Firebase auth
      const currentUser = auth.currentUser;
      addLog(`Firebase user: ${currentUser ? currentUser.email : 'Not logged in'}`);
      
      if (currentUser) {
        const firebaseToken = await currentUser.getIdToken();
        addLog(`Firebase token: ${firebaseToken.substring(0, 50)}...`);
      }
      
      // Test API client token
      const apiToken = await apiClient.getAuthToken();
      addLog(`API client token: ${apiToken ? apiToken.substring(0, 50) + '...' : 'null'}`);
      
      // Use Firebase token for SSE since backend expects it
      if (currentUser) {
        const firebaseToken = await currentUser.getIdToken();
        setToken(firebaseToken);
        addLog('Using Firebase token for SSE connection');
        
        // Decode token header to see type
        try {
          const parts = firebaseToken.split('.');
          if (parts.length === 3) {
            const header = JSON.parse(atob(parts[0]));
            addLog(`Token algorithm: ${header.alg}`);
          }
        } catch (e) {
          addLog('Could not decode token header');
        }
      }
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const testSSEConnection = () => {
    if (!token) {
      addLog('No token available. Get token first.');
      return;
    }
    
    addLog('Testing SSE connection...');
    
    const fileId = 'd6eb792b-f191-4bef-a6dc-a1185199cd34'; // Test file ID
    const url = `http://localhost:8080/api/personalization/v2/stream/${fileId}?token=${token}`;
    
    addLog(`Connecting to: ${url.substring(0, 100)}...`);
    
    const es = new EventSource(url);
    setEventSource(es);
    
    es.onopen = () => {
      addLog('✅ SSE connection opened');
    };
    
    es.onmessage = (event) => {
      addLog(`📨 Message: ${event.data}`);
    };
    
    es.onerror = (error) => {
      addLog(`❌ SSE error: ${JSON.stringify(error)}`);
      addLog(`ReadyState: ${es.readyState}`);
    };
  };

  const closeConnection = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      addLog('Connection closed');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Personalization SSE</h1>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testAuthToken}>Get Auth Token</Button>
          <Button onClick={testSSEConnection} disabled={!token}>Test SSE Connection</Button>
          <Button onClick={closeConnection} variant="destructive">Close Connection</Button>
          <Button onClick={() => setLogs([])}>Clear Logs</Button>
        </div>
        
        {token && (
          <Card className="p-4">
            <p className="text-sm font-mono break-all">
              Token: {token.substring(0, 50)}...
            </p>
          </Card>
        )}
        
        <Card className="p-4 h-96 overflow-y-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {logs.join('\n') || 'No logs yet. Click "Get Auth Token" to start.'}
          </pre>
        </Card>
      </div>
    </div>
  );
}
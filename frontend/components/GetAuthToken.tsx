'use client';

import { useState } from 'react';
import { auth } from '@/firebaseconfig';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';

export function GetAuthToken() {
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const getToken = async () => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No user logged in. Please log in first.');
        return;
      }
      
      const idToken = await user.getIdToken();
      setToken(idToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get token');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Get Auth Token for Testing</h2>
      
      <div className="space-y-4">
        <Button 
          onClick={getToken} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Getting Token...' : 'Get Current User Token'}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {token && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Firebase Token:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="p-3 bg-gray-100 rounded-md break-all text-xs font-mono">
              {token}
            </div>
            <div className="text-sm text-gray-600">
              Token length: {token.length} characters
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <h3 className="font-medium mb-2">How to use this token:</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Copy the token above</li>
            <li>Go to the test page: <code className="bg-gray-100 px-1">http://localhost:3000/test-personalization-sse.html</code></li>
            <li>Paste the token in the "Auth Token" field</li>
            <li>Enter a File ID (get from any document URL)</li>
            <li>Click Connect to test the SSE connection</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}
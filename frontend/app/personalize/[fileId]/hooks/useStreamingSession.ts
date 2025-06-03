import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface SessionData {
  sessionId: string;
  fileId: string;
  content: string;
  progress: number;
  lastSaved: string;
  tokenUsage: number;
}

export function useStreamingSession(fileId: string, content: string, progress: number) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Generate or retrieve session ID
  useEffect(() => {
    const existingSessionId = sessionStorage.getItem(`session-${fileId}`);
    if (existingSessionId) {
      setSessionId(existingSessionId);
    } else {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      sessionStorage.setItem(`session-${fileId}`, newSessionId);
    }
  }, [fileId]);

  // Save session
  const saveSession = useCallback(async () => {
    if (!sessionId || !content || isAutoSaving) return;
    
    setIsAutoSaving(true);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/personalization/session/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sessionId,
            fileId,
            content,
            progress,
            timestamp: new Date().toISOString()
          })
        }
      );
      
      if (response.ok) {
        setLastSaved(new Date());
        // Don't show toast for auto-saves to avoid spam
      } else {
        throw new Error('Failed to save session');
      }
    } catch (error) {
      console.error('Session save error:', error);
      // Only show error toast occasionally
      if (Math.random() < 0.1) {
        toast.error('Failed to save progress. Will retry automatically.');
      }
    } finally {
      setIsAutoSaving(false);
    }
  }, [sessionId, fileId, content, progress, isAutoSaving]);

  // Load existing session
  const loadSession = useCallback(async (): Promise<SessionData | null> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/personalization/session/${fileId}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          setSessionId(data.session.sessionId);
          setLastSaved(new Date(data.session.lastSaved));
          return data.session;
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
    
    return null;
  }, [fileId]);

  // Complete session
  const completeSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/personalization/session/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sessionId,
            fileId,
            finalProgress: progress
          })
        }
      );
      
      if (response.ok) {
        sessionStorage.removeItem(`session-${fileId}`);
        toast.success('Session completed successfully!');
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  }, [sessionId, fileId, progress]);

  // Export session data
  const exportSession = useCallback(async () => {
    const sessionData = {
      sessionId,
      fileId,
      content,
      progress,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${fileId}-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Session exported successfully');
  }, [sessionId, fileId, content, progress]);

  return {
    sessionId,
    saveSession,
    loadSession,
    completeSession,
    exportSession,
    lastSaved,
    isAutoSaving
  };
}
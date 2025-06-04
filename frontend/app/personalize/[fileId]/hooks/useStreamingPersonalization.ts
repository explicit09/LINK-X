import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface OutlineSection {
  anchor: string;
  title: string;
  isComplete: boolean;
}

interface StreamingOptions {
  autoStart?: boolean;
  cacheEnabled?: boolean;
  streamingChunkSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseStreamingPersonalizationReturn {
  sections: Map<string, string>;
  outline: OutlineSection[];
  currentSection: string | null;
  progress: number;
  isStreaming: boolean;
  error: string | null;
  isInitializing: boolean;
  startPersonalization: () => Promise<void>;
  pauseStreaming: () => void;
  resumeStreaming: () => void;
  downloadContent: () => void;
  resetPersonalization: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useStreamingPersonalization(
  fileId: string,
  options: StreamingOptions = {}
): UseStreamingPersonalizationReturn {
  const {
    autoStart = false,
    cacheEnabled = true,
    streamingChunkSize = 1000,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const { user } = useAuthUser();
  const [sections, setSections] = useState<Map<string, string>>(new Map());
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const isPausedRef = useRef(false);
  const cachedContentRef = useRef<Map<string, string>>(new Map());

  // Check cache for existing content
  const loadFromCache = useCallback(() => {
    if (!cacheEnabled) return false;
    
    try {
      const cacheKey = `personalization_${fileId}_${user?.uid}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { outline: cachedOutline, sections: cachedSections, timestamp } = JSON.parse(cached);
        
        // Check if cache is still valid (24 hours)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setOutline(cachedOutline);
          setSections(new Map(cachedSections));
          cachedContentRef.current = new Map(cachedSections);
          setProgress(100);
          return true;
        }
      }
    } catch (e) {
      console.error('Cache load error:', e);
    }
    
    return false;
  }, [fileId, user?.uid, cacheEnabled]);

  // Save to cache
  const saveToCache = useCallback(() => {
    if (!cacheEnabled || sections.size === 0) return;
    
    try {
      const cacheKey = `personalization_${fileId}_${user?.uid}`;
      const cacheData = {
        outline,
        sections: Array.from(sections.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (e) {
      console.error('Cache save error:', e);
    }
  }, [fileId, user?.uid, sections, outline, cacheEnabled]);

  // Generate outline
  const generateOutline = async (): Promise<OutlineSection[]> => {
    try {
      const response = await apiClient.post('/api/v2/personalization/outline', {
        file_id: fileId
      });

      const generatedOutline = response.outline.map((section: any) => ({
        anchor: section.anchor,
        title: section.title,
        isComplete: false
      }));

      setOutline(generatedOutline);
      return generatedOutline;
    } catch (err: any) {
      console.error('Outline generation error:', err);
      throw err;
    }
  };

  // Start streaming
  const startStreaming = useCallback(async () => {
    if (!user || !fileId || isStreaming || !outline.length) return;

    setIsStreaming(true);
    setError(null);
    isPausedRef.current = false;

    try {
      // Get the current user's Firebase token for SSE
      const firebaseAuth = await import('@/firebaseconfig').then(m => m.auth);
      const currentUser = firebaseAuth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : '';

      // Create EventSource with auth token
      const url = new URL(`${API_BASE_URL}/api/v2/personalization/stream`);
      url.searchParams.append('file_id', fileId);
      url.searchParams.append('token', token || '');

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      let currentContent = '';
      let currentSectionIndex = 0;

      eventSource.onopen = () => {
        console.log('Streaming connection opened');
        retryCountRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        if (isPausedRef.current) return;

        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'section_start':
              currentContent = '';
              setCurrentSection(data.section_id);
              currentSectionIndex = outline.findIndex(s => s.anchor === data.section_id);
              break;

            case 'content':
              currentContent += data.content;
              setSections(prev => new Map(prev).set(data.section_id, currentContent));
              break;

            case 'section_complete':
              setOutline(prev => prev.map(section => 
                section.anchor === data.section_id 
                  ? { ...section, isComplete: true }
                  : section
              ));
              
              // Update progress
              const completedCount = outline.filter((s, i) => i <= currentSectionIndex).length;
              setProgress((completedCount / outline.length) * 100);
              
              // Save to cache periodically
              if (completedCount % 2 === 0) {
                saveToCache();
              }
              break;

            case 'complete':
              setProgress(100);
              setIsStreaming(false);
              setCurrentSection(null);
              saveToCache();
              toast.success('Personalization complete!');
              eventSource.close();
              break;

            case 'error':
              throw new Error(data.message || 'Streaming error');
          }
        } catch (err) {
          console.error('Message parsing error:', err);
        }
      };

      eventSource.onerror = (event) => {
        console.error('EventSource error:', event);
        
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setTimeout(() => {
            if (!isPausedRef.current) {
              startStreaming();
            }
          }, retryDelay * retryCountRef.current);
        } else {
          setError('Connection lost. Please try again.');
          setIsStreaming(false);
          eventSource.close();
        }
      };

    } catch (err: any) {
      setError(err.message || 'Failed to start streaming');
      setIsStreaming(false);
    }
  }, [user, fileId, outline, saveToCache]);

  // Start personalization (outline + streaming)
  const startPersonalization = useCallback(async () => {
    if (isInitializing || isStreaming) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Check cache first
      if (loadFromCache()) {
        setIsInitializing(false);
        toast.success('Loaded personalized content from cache');
        return;
      }

      // Generate outline
      const generatedOutline = await generateOutline();
      
      if (generatedOutline.length > 0) {
        // Start streaming immediately
        await startStreaming();
      } else {
        throw new Error('No content sections found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start personalization');
      toast.error('Failed to personalize content');
    } finally {
      setIsInitializing(false);
    }
  }, [loadFromCache, startStreaming]);

  // Pause streaming
  const pauseStreaming = useCallback(() => {
    isPausedRef.current = true;
    setIsStreaming(false);
    toast.info('Streaming paused');
  }, []);

  // Resume streaming
  const resumeStreaming = useCallback(() => {
    if (progress < 100 && outline.length > 0) {
      startStreaming();
      toast.info('Streaming resumed');
    }
  }, [progress, outline, startStreaming]);

  // Download content
  const downloadContent = useCallback(() => {
    const content = Array.from(sections.entries())
      .map(([id, text]) => {
        const section = outline.find(s => s.anchor === id);
        return `# ${section?.title || id}\n\n${text}`;
      })
      .join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personalized-content-${fileId}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Content downloaded');
  }, [sections, outline, fileId]);

  // Reset personalization
  const resetPersonalization = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setSections(new Map());
    setOutline([]);
    setCurrentSection(null);
    setProgress(0);
    setIsStreaming(false);
    setError(null);
    setIsInitializing(false);
    isPausedRef.current = false;
    retryCountRef.current = 0;
    
    // Clear cache
    if (cacheEnabled) {
      try {
        const cacheKey = `personalization_${fileId}_${user?.uid}`;
        localStorage.removeItem(cacheKey);
      } catch (e) {
        console.error('Cache clear error:', e);
      }
    }
  }, [fileId, user?.uid, cacheEnabled]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && user && fileId && !isInitializing && sections.size === 0) {
      startPersonalization();
    }
  }, [autoStart, user, fileId, startPersonalization]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    sections,
    outline,
    currentSection,
    progress,
    isStreaming,
    error,
    isInitializing,
    startPersonalization,
    pauseStreaming,
    resumeStreaming,
    downloadContent,
    resetPersonalization
  };
}
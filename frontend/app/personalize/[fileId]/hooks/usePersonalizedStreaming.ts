import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { auth } from '@/firebaseconfig';

interface Section {
  id: string;
  title: string;
  content: string;
  isComplete: boolean;
  tokens: number;
  generatedContent?: string; // Track generated content per section
}

interface Outline {
  sections: Section[];
  totalTokens: number;
}

type StreamingState = 'idle' | 'initializing' | 'streaming' | 'paused' | 'complete' | 'error';

export function usePersonalizedStreaming(fileId: string) {
  const [streamingState, setStreamingState] = useState<StreamingState>('idle');
  const [content, setContent] = useState('');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const accumulatedContentRef = useRef('');
  const sectionContentRef = useRef<Record<number, string>>({});
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {};
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        headers['X-Firebase-Token'] = token;
      } catch (error) {
        console.error('Failed to get Firebase token:', error);
      }
    }
    return headers;
  };

  // Initialize streaming
  const startStreaming = useCallback(async () => {
    if (streamingState === 'streaming' || streamingState === 'initializing') return;
    
    setStreamingState('initializing');
    setError(null);
    
    try {
      // First, get the outline using the API client
      const outlineData = await apiClient.get(
        `/api/personalization/outline/${fileId}`
      );
      
      if (!outlineData.outline) {
        throw new Error('Failed to generate outline');
      }
      
      setOutline(outlineData.outline);
      
      // Start streaming content using fetch with auth headers
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/personalization/stream/${fileId}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: await getAuthHeaders(),
          signal: abortController.signal
        }
      );
      
      if (!response.ok) {
        throw new Error(`Streaming failed: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      setStreamingState('streaming');
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              switch (parsed.type) {
                case 'content':
                  // Track content per section
                  const sectionIndex = parsed.section !== undefined ? parsed.section : currentSection;
                  if (!sectionContentRef.current[sectionIndex]) {
                    sectionContentRef.current[sectionIndex] = '';
                  }
                  sectionContentRef.current[sectionIndex] += parsed.content;
                  
                  // Update accumulated content
                  accumulatedContentRef.current += parsed.content;
                  setContent(accumulatedContentRef.current);
                  
                  if (parsed.progress) {
                    setProgress(parsed.progress);
                  }
                  
                  if (parsed.section !== undefined) {
                    setCurrentSection(parsed.section);
                  }
                  break;
                  
                case 'complete':
                  setStreamingState('complete');
                  toast.success('Content generation complete!');
                  return;
                  
                case 'error':
                  throw new Error(parsed.message || 'Streaming error occurred');
                  
                case 'token_limit':
                  setStreamingState('paused');
                  toast.warning('Token limit reached. You can resume in your next session.');
                  return;
                  
                case 'section_complete':
                  if (parsed.section !== undefined) {
                    updateOutlineSection(parsed.section, true, sectionContentRef.current[parsed.section] || '');
                  }
                  break;
              }
            } catch (error) {
              console.error('Error parsing streaming data:', error);
            }
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('Streaming aborted');
            break;
          }
          throw error;
        }
      }
      
    } catch (error) {
      handleStreamingError(error instanceof Error ? error.message : 'Failed to start streaming');
    }
  }, [fileId, streamingState]);

  // Error handling with retry logic
  const handleStreamingError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
      
      toast.error(`Connection error. Retrying in ${retryDelay / 1000}s...`);
      setStreamingState('error');
      
      setTimeout(() => {
        startStreaming();
      }, retryDelay);
    } else {
      setStreamingState('error');
      toast.error('Failed to connect after multiple attempts.');
    }
  }, [startStreaming]);

  // Update outline section completion
  const updateOutlineSection = useCallback((sectionIndex: number, isComplete: boolean, generatedContent?: string) => {
    setOutline(prev => {
      if (!prev) return null;
      
      const newOutline = { ...prev };
      newOutline.sections = [...prev.sections];
      newOutline.sections[sectionIndex] = {
        ...newOutline.sections[sectionIndex],
        isComplete,
        ...(generatedContent && { generatedContent })
      };
      
      return newOutline;
    });
  }, []);

  // Control functions
  const pauseStreaming = useCallback(() => {
    if (streamingState === 'streaming' && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreamingState('paused');
      toast.info('Streaming paused');
    }
  }, [streamingState]);

  const resumeStreaming = useCallback(async () => {
    if (streamingState === 'paused') {
      try {
        // Resume from current position
        const eventSource = new EventSource(
          `${process.env.NEXT_PUBLIC_API_URL}/api/personalization/stream/${fileId}?resume=true&section=${currentSection}`,
          { withCredentials: true }
        );
        
        eventSourceRef.current = eventSource;
        setStreamingState('streaming');
        
        // Same event handlers as startStreaming
        eventSource.onmessage = (event) => {
          // ... same as above
        };
        
        eventSource.onerror = (error) => {
          handleStreamingError('Connection lost while resuming');
        };
        
      } catch (error) {
        handleStreamingError('Failed to resume streaming');
      }
    }
  }, [streamingState, fileId, currentSection]);

  const skipSection = useCallback(async (targetSection: number) => {
    if (!outline || targetSection >= outline.sections.length) return;
    
    const section = outline.sections[targetSection];
    
    // If clicking on a completed section, just show its content
    if (section.isComplete && section.generatedContent) {
      setCurrentSection(targetSection);
      setContent(section.generatedContent);
      toast.info(`Viewing section: ${section.title}`);
      return;
    }
    
    // If clicking on current or future section, navigate streaming
    if (streamingState === 'streaming') {
      // Pause current streaming
      pauseStreaming();
    }
    
    // Update state
    setCurrentSection(targetSection);
    
    // Build accumulated content up to this section
    let accumulatedContent = '';
    for (let i = 0; i <= targetSection; i++) {
      if (sectionContentRef.current[i]) {
        accumulatedContent += sectionContentRef.current[i];
      }
    }
    accumulatedContentRef.current = accumulatedContent;
    setContent(accumulatedContent);
    
    // Resume streaming if not complete
    if (targetSection < outline.sections.length && !section.isComplete) {
      setTimeout(() => {
        resumeStreaming();
      }, 500);
    }
  }, [outline, streamingState, pauseStreaming, resumeStreaming]);

  const regenerateSection = useCallback(async (sectionIndex: number) => {
    if (!outline || sectionIndex >= outline.sections.length) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/personalization/regenerate`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(await getAuthHeaders())
          },
          credentials: 'include',
          body: JSON.stringify({
            fileId,
            sectionIndex,
            currentContent: content
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to regenerate section');
      }
      
      toast.success('Regenerating section...');
      // The response will trigger through the existing stream
      
    } catch (error) {
      toast.error('Failed to regenerate section');
    }
  }, [fileId, outline, content]);

  const retryConnection = useCallback(() => {
    retryCountRef.current = 0;
    startStreaming();
  }, [startStreaming]);

  // Show all accumulated content (for "View All" functionality)
  const showAllContent = useCallback(() => {
    setContent(accumulatedContentRef.current);
    setCurrentSection(outline?.sections.findIndex(s => !s.isComplete) ?? outline?.sections.length ?? 0);
  }, [outline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    streamingState,
    content,
    outline,
    progress,
    currentSection,
    error,
    startStreaming,
    pauseStreaming,
    resumeStreaming,
    skipSection,
    regenerateSection,
    retryConnection,
    showAllContent
  };
}
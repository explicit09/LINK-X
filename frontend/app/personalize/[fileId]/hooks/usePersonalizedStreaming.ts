import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface Section {
  id: string;
  title: string;
  content: string;
  isComplete: boolean;
  tokens: number;
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
  const accumulatedContentRef = useRef('');
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Initialize streaming
  const startStreaming = useCallback(async () => {
    if (streamingState === 'streaming' || streamingState === 'initializing') return;
    
    setStreamingState('initializing');
    setError(null);
    
    try {
      // First, get the outline
      const outlineResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/personalization/outline/${fileId}`,
        { credentials: 'include' }
      );
      
      if (!outlineResponse.ok) {
        throw new Error('Failed to generate outline');
      }
      
      const outlineData = await outlineResponse.json();
      setOutline(outlineData.outline);
      
      // Start streaming content
      const eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/api/personalization/stream/${fileId}`,
        { withCredentials: true }
      );
      
      eventSourceRef.current = eventSource;
      setStreamingState('streaming');
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'content':
              accumulatedContentRef.current += data.content;
              setContent(accumulatedContentRef.current);
              
              // Update progress
              if (data.progress) {
                setProgress(data.progress);
              }
              
              // Update current section
              if (data.section !== undefined) {
                setCurrentSection(data.section);
                updateOutlineSection(data.section, true);
              }
              break;
              
            case 'complete':
              setStreamingState('complete');
              toast.success('Content generation complete!');
              eventSource.close();
              break;
              
            case 'error':
              throw new Error(data.message || 'Streaming error occurred');
              
            case 'token_limit':
              setStreamingState('paused');
              toast.warning('Token limit reached. You can resume in your next session.');
              eventSource.close();
              break;
          }
        } catch (error) {
          console.error('Error parsing streaming data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        handleStreamingError('Connection lost. Retrying...');
      };
      
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
  const updateOutlineSection = useCallback((sectionIndex: number, isComplete: boolean) => {
    setOutline(prev => {
      if (!prev) return null;
      
      const newOutline = { ...prev };
      newOutline.sections = [...prev.sections];
      newOutline.sections[sectionIndex] = {
        ...newOutline.sections[sectionIndex],
        isComplete
      };
      
      return newOutline;
    });
  }, []);

  // Control functions
  const pauseStreaming = useCallback(() => {
    if (streamingState === 'streaming' && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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
    
    // Pause current streaming
    pauseStreaming();
    
    // Update state
    setCurrentSection(targetSection);
    
    // Resume from new section
    setTimeout(() => {
      resumeStreaming();
    }, 500);
  }, [outline, pauseStreaming, resumeStreaming]);

  const regenerateSection = useCallback(async (sectionIndex: number) => {
    if (!outline || sectionIndex >= outline.sections.length) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/personalization/regenerate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
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
    retryConnection
  };
}
import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

export interface Section {
  title: string;
  level: number;
  chunk_start: number;
  chunk_end: number;
  content_preview: string;
  anchor: string;
  keywords: string[];
  type: string;
  content?: string;
  isComplete?: boolean;
}

export interface PersonalizationState {
  outline: Section[];
  sections: Map<string, string>;
  currentSection: string | null;
  progress: number;
  isStreaming: boolean;
  error: string | null;
}

export interface StreamEvent {
  type: 'outline' | 'content' | 'error' | 'section_start' | 'section_complete' | 'complete';
  data?: any;
  section_id?: string;
}

export const useEnhancedPersonalization = (fileId: string) => {
  const [state, setState] = useState<PersonalizationState>({
    outline: [],
    sections: new Map(),
    currentSection: null,
    progress: 0,
    isStreaming: false,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate outline
  const generateOutline = useCallback(async () => {
    try {
      const response = await apiClient.get(`/api/personalization/v2/outline/${fileId}`);
      const outline = response?.data?.outline || response?.outline || [];
      
      setState(prev => ({
        ...prev,
        outline,
        sections: new Map(),
        error: null,
      }));
      
      return outline;
    } catch (error: any) {
      console.error('Error generating outline:', error);
      const errorMessage = error?.message || 'Failed to generate outline';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  }, [fileId]);

  // Handle stream events
  const handleStreamEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case 'outline':
        setState(prev => ({
          ...prev,
          outline: event.data,
        }));
        break;

      case 'section_start':
        setState(prev => ({
          ...prev,
          currentSection: event.section_id || null,
        }));
        break;

      case 'content':
        if (event.section_id && event.data) {
          setState(prev => {
            const newSections = new Map(prev.sections);
            const existingContent = newSections.get(event.section_id!) || '';
            newSections.set(event.section_id!, existingContent + event.data.content);
            
            return {
              ...prev,
              sections: newSections,
            };
          });
        }
        break;

      case 'section_complete':
        if (event.section_id) {
          setState(prev => {
            const newOutline = prev.outline.map(section => 
              section.anchor === event.section_id
                ? { ...section, isComplete: true }
                : section
            );
            
            const completedCount = newOutline.filter(s => s.isComplete).length;
            const progress = (completedCount / newOutline.length) * 100;
            
            return {
              ...prev,
              outline: newOutline,
              progress,
              currentSection: null,
            };
          });
        }
        break;

      case 'complete':
        setState(prev => ({
          ...prev,
          isStreaming: false,
          progress: 100,
        }));
        eventSourceRef.current?.close();
        break;

      case 'progress':
        // Handle progress updates
        if (event.current !== undefined && event.total !== undefined) {
          setState(prev => ({
            ...prev,
            progress: Math.round((event.current / event.total) * 100),
            currentSection: event.message || `Processing section ${event.current + 1} of ${event.total}...`
          }));
        }
        break;

      case 'error':
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: event.data?.message || 'An error occurred',
        }));
        eventSourceRef.current?.close();
        break;
    }
  }, []);

  // Start streaming personalized content
  const startStreaming = useCallback(async () => {
    if (state.isStreaming) return;

    setState(prev => ({ ...prev, isStreaming: true, error: null }));

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // Start with 1 second

    const connectWithRetry = async () => {
      try {
        // Get Supabase token for SSE
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No Supabase session found');
          setState(prev => ({
            ...prev,
            error: 'Authentication required. Please sign in.',
            isStreaming: false
          }));
          return;
        }
        
        const token = session.access_token;
        console.log('🔐 Enhanced Personalization: Got Supabase token:', token ? `${token.substring(0, 20)}...` : 'null');
        
        // For EventSource, we need to pass token as URL parameter since headers aren't universally supported
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const url = new URL(`/api/v2/personalization/stream`, baseURL);
        url.searchParams.append('file_id', fileId);
        url.searchParams.append('token', token);
        
        console.log('🔗 Connecting to SSE:', url.toString());
        
        const eventSource = new EventSource(url.toString());
        eventSourceRef.current = eventSource;

        let heartbeatTimeout: NodeJS.Timeout;
        const resetHeartbeat = () => {
          clearTimeout(heartbeatTimeout);
          heartbeatTimeout = setTimeout(() => {
            console.warn('No heartbeat received, reconnecting...');
            eventSource.close();
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(connectWithRetry, retryDelay * retryCount);
            }
          }, 30000); // 30 second timeout
        };

        eventSource.onopen = () => {
          console.log('SSE connection opened');
          retryCount = 0; // Reset retry count on successful connection
          resetHeartbeat();
        };

        eventSource.onmessage = (event) => {
          resetHeartbeat();
          try {
            if (event.data === 'heartbeat') return; // Ignore heartbeat messages
            
            console.log('📨 Received SSE message:', event.data);
            const data: StreamEvent = JSON.parse(event.data);
            console.log('📦 Parsed event:', data);
            handleStreamEvent(data);
          } catch (error) {
            console.error('Error parsing stream event:', error);
            console.error('Raw event data:', event.data);
          }
        };

        eventSource.onerror = (error) => {
          console.error('EventSource error:', error);
          clearTimeout(heartbeatTimeout);
          eventSource.close();
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying connection (${retryCount}/${maxRetries})...`);
            setState(prev => ({
              ...prev,
              error: `Connection lost. Retrying (${retryCount}/${maxRetries})...`,
            }));
            setTimeout(connectWithRetry, retryDelay * retryCount);
          } else {
            setState(prev => ({
              ...prev,
              isStreaming: false,
              error: 'Connection failed. Please check your internet connection and try again.',
            }));
          }
        };

      } catch (error) {
        console.error('Error starting stream:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(connectWithRetry, retryDelay * retryCount);
        } else {
          setState(prev => ({
            ...prev,
            isStreaming: false,
            error: 'Failed to start streaming. Please try again.',
          }));
        }
      }
    };

    await connectWithRetry();
  }, [fileId, state.isStreaming, handleStreamEvent]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    eventSourceRef.current?.close();
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  // Navigate to section
  const navigateToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Get active section based on scroll position
  const getActiveSection = useCallback(() => {
    const sections = document.querySelectorAll('[data-section]');
    let activeSection = null;
    
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 100 && rect.bottom > 100) {
        activeSection = section.id;
      }
    });
    
    return activeSection;
  }, []);

  // Save personalized content
  const saveContent = useCallback(async () => {
    try {
      const content = {
        sections: Array.from(state.sections.entries()).map(([id, content]) => ({
          id,
          content,
        })),
        outline: state.outline,
        quality_score: 0.9, // This would come from actual quality assessment
      };
      
      await apiClient.post(`/api/personalization/v2/save/${fileId}`, content);
      return true;
    } catch (error) {
      console.error('Error saving content:', error);
      return false;
    }
  }, [fileId, state.sections, state.outline]);

  // Track feedback
  const trackFeedback = useCallback(async (sectionId: string, feedbackType: string) => {
    try {
      await apiClient.post(`/api/personalization/v2/feedback/${fileId}`, {
        section_id: sectionId,
        type: feedbackType,
        time_spent: Date.now(), // This would be actual time tracking
      });
    } catch (error) {
      console.error('Error tracking feedback:', error);
    }
  }, [fileId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    ...state,
    generateOutline,
    startStreaming,
    stopStreaming,
    navigateToSection,
    getActiveSection,
    saveContent,
    trackFeedback,
  };
};
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { DocumentOutline } from './useDocumentOutline';

export function useStreamingContent(fileId: string | string[], outline: DocumentOutline | null) {
  const [streamingContent, setStreamingContent] = useState<Map<string, string>>(new Map());
  const [streamingStates, setStreamingStates] = useState<Map<string, 'waiting' | 'streaming' | 'complete'>>(new Map());
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [focusedSectionKey, setFocusedSectionKey] = useState<string | null>(null);
  const [generatedSections, setGeneratedSections] = useState<string[]>([]);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const prefetchQueue = useRef<string[]>([]);
  const metricsRef = useRef<Map<string, { startTime: number; firstTokenTime?: number; completionTime?: number }>>(new Map());

  // Mock data flag - you can make this configurable
  const useMockData = true;

  // Calculate progress
  const totalSections = outline?.chapters.reduce((acc, ch) => acc + ch.subsections.length, 0) || 0;
  const completedCount = Array.from(streamingStates.values()).filter(state => state === 'complete').length;
  const streamingCount = Array.from(streamingStates.values()).filter(state => state === 'streaming').length;
  const progress = totalSections > 0 ? (completedCount / totalSections) * 100 : 0;

  // Load existing content when outline is available
  useEffect(() => {
    const loadExistingContent = async () => {
      if (!outline || !fileId) return;

      try {
        const response = await fetch(`http://localhost:8080/api/v2/files/${fileId}/existing-content`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.content && data.content.length > 0) {
            const contentMap = new Map<string, string>();
            const statesMap = new Map<string, 'waiting' | 'streaming' | 'complete'>();
            const generatedKeys: string[] = [];

            data.content.forEach((item: any) => {
              contentMap.set(item.section_key, item.generated_content);
              statesMap.set(item.section_key, 'complete');
              generatedKeys.push(item.section_key);
            });

            setStreamingContent(contentMap);
            setStreamingStates(statesMap);
            setGeneratedSections(generatedKeys);
          }
        }
      } catch (error) {
        console.error('Error loading existing content:', error);
      }
    };

    loadExistingContent();
  }, [outline, fileId]);

  const streamSection = useCallback(async (chapterId: string, subsectionId: string, regenerate: boolean = false) => {
    const sectionKey = `${chapterId}-${subsectionId}`;

    // Don't stream if already streaming (unless regenerating)
    const currentState = streamingStates.get(sectionKey);
    if (currentState === 'streaming' || (!regenerate && currentState === 'complete')) {
      return;
    }
    
    // Abort any existing controller for this section
    const existingController = abortControllers.current.get(sectionKey);
    if (existingController) {
      existingController.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllers.current.set(sectionKey, abortController);
    
    // Update state to streaming
    setStreamingStates(prev => new Map(prev).set(sectionKey, 'streaming'));
    setActiveSectionKey(sectionKey);
    
    const startTime = Date.now();
    metricsRef.current.set(sectionKey, { startTime });
    
    try {
      // Include previously generated content for context
      const previousSections = generatedSections
        .filter((key: string) => key !== sectionKey)
        .map((key: string) => ({
          section: key,
          content: streamingContent.get(key)?.slice(0, 200) || ''
        }));
      
      if (useMockData) {
        // Mock streaming for development
        const mockContent = `# Generated Content for ${chapterId} - ${subsectionId}

This is mock content generated for testing purposes. The real API server at http://localhost:8080 is not running.

## Key Points

- This is a simulated response
- In production, this would come from the actual API
- The content would be personalized based on user preferences
- You can add more sections and customize this content

## Next Steps

1. Start the actual backend server
2. Configure the API endpoint correctly
3. Test with real data

Happy learning!`;
        
        // Simulate streaming by sending content in chunks with delays
        let currentContent = '';
        const mockChunks = mockContent.split(' ');
        
        for (let i = 0; i < mockChunks.length; i++) {
          if (abortController.signal.aborted) break;
          
          currentContent += (i > 0 ? ' ' : '') + mockChunks[i];
          setStreamingContent(prev => new Map(prev).set(sectionKey, currentContent));
          
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Mark as complete
        setStreamingStates(prev => new Map(prev).set(sectionKey, 'complete'));
        setGeneratedSections(prev => [...prev.filter(k => k !== sectionKey), sectionKey]);
        
      } else {
        // Real API call
        const response = await fetch(`http://localhost:8080/api/v2/files/${fileId}/stream-section`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: abortController.signal,
          body: JSON.stringify({
            chapter_id: chapterId,
            subsection_id: subsectionId,
            previous_sections: previousSections,
            regenerate
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        let accumulatedContent = regenerate ? '' : (streamingContent.get(sectionKey) || '');
        let firstToken = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (!firstToken) {
            metricsRef.current.set(sectionKey, {
              ...metricsRef.current.get(sectionKey)!,
              firstTokenTime: Date.now() - startTime
            });
            firstToken = true;
          }

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulatedContent += data.content;
                  setStreamingContent(prev => new Map(prev).set(sectionKey, accumulatedContent));
                }
              } catch (error) {
                console.error('Error parsing SSE data:', error);
              }
            }
          }
        }

        // Mark completion
        setStreamingStates(prev => new Map(prev).set(sectionKey, 'complete'));
        setGeneratedSections(prev => [...prev.filter(k => k !== sectionKey), sectionKey]);
      }
      
      metricsRef.current.set(sectionKey, {
        ...metricsRef.current.get(sectionKey)!,
        completionTime: Date.now() - startTime
      });
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted for section:', sectionKey);
      } else {
        console.error('Error streaming section:', error);
        setStreamingStates(prev => new Map(prev).set(sectionKey, 'waiting'));
        toast.error('Failed to generate content. Please try again.');
      }
    } finally {
      abortControllers.current.delete(sectionKey);
      if (activeSectionKey === sectionKey) {
        setActiveSectionKey(null);
      }
    }
  }, [fileId, streamingContent, streamingStates, generatedSections, activeSectionKey, useMockData]);

  const prefetchNext = useCallback(() => {
    if (!outline || prefetchQueue.current.length === 0) return;

    const nextSection = prefetchQueue.current.shift();
    if (nextSection) {
      const [chapterId, subsectionId] = nextSection.split('-');
      streamSection(chapterId, subsectionId);
    }
  }, [outline, streamSection]);

  const regenerateSection = useCallback((chapterId: string, subsectionId: string) => {
    streamSection(chapterId, subsectionId, true);
  }, [streamSection]);

  return {
    streamingContent,
    streamingStates,
    activeSectionKey,
    focusedSectionKey,
    setFocusedSectionKey,
    generatedSections,
    visibleSections,
    setVisibleSections,
    contentRefs,
    totalSections,
    completedCount,
    streamingCount,
    progress,
    streamSection,
    regenerateSection,
    prefetchNext,
    metricsData: metricsRef.current
  };
}
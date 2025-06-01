import { useState, useEffect, useRef, useCallback } from 'react';
import { Chapter, StreamToken } from '../types/streaming.types';

export const useStreamingCourse = (pfId: string | null) => {
  const [courseName, setCourseName] = useState<string>('Loading...');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch initial outline
  useEffect(() => {
    if (!pfId) return;

    const fetchOutline = async () => {
      try {
        const { fetchWithAuth } = await import('@/lib/api');
        const res = await fetchWithAuth(`/api/v2/streaming/outline/${pfId}`);

        if (!res.ok) {
          throw new Error(`Failed to fetch outline`);
        }

        const data = await res.json();

        setCourseName(data.fileName || 'Course Materials');

        // Transform outline data to our format
        const formattedChapters: Chapter[] = data.chapters.map(
          (ch: any, index: number) => ({
            id: ch.id,
            title: ch.title || ch.chapterTitle,
            subsections: ch.subsections.map((sub: any) => ({
              id: sub.id,
              title: sub.title,
              estimatedTokens: sub.estimatedTokens,
              type: 'text',
              completed: false,
              timeToComplete: Math.ceil(sub.estimatedTokens / 150), // Estimate reading time
              isLoading: false,
              isStreaming: false,
            })),
            progress: 0,
            estimatedTokens: ch.estimatedTokens,
          }),
        );

        setChapters(formattedChapters);

        const total = formattedChapters.reduce(
          (acc, chapter) => acc + chapter.subsections.length,
          0,
        );
        setTotalLessons(total);
        setCompletedLessons(0);
      } catch (err) {
        console.error('Error fetching outline:', err);
      }
    };

    fetchOutline();
  }, [pfId]);

  // Stream content for a specific section
  const streamSectionContent = useCallback(
    async (chapterId: string, subsectionId: string) => {
      if (!pfId) return;

      // Mark as already loaded
      const sectionKey = `${chapterId}-${subsectionId}`;
      if (loadedSections.has(sectionKey)) return;

      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        // Mark section as loading
        setChapters((prev) =>
          prev.map((chapter) => {
            if (chapter.id === chapterId) {
              return {
                ...chapter,
                subsections: chapter.subsections.map((sub) => {
                  if (sub.id === subsectionId) {
                    return {
                      ...sub,
                      isLoading: true,
                      isStreaming: false,
                      content: '',
                    };
                  }
                  return sub;
                }),
              };
            }
            return chapter;
          }),
        );

        // Collect previous sections for context
        const previousSections: Array<{ section: string; content: string }> =
          [];
        chapters.forEach((chapter) => {
          chapter.subsections.forEach((sub) => {
            if (sub.content && sub.id !== subsectionId) {
              previousSections.push({
                section: sub.id,
                content: sub.content,
              });
            }
          });
        });

        const response = await fetch(
          `http://localhost:8080/api/personalize/${pfId}/stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              userId: 'current-user', // This should come from auth context
              chapterId,
              subsectionId,
              previousSections,
            }),
            signal: abortControllerRef.current.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Streaming failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = '';
          let accumulatedContent = '';
          let firstTokenTime: number | null = null;

          // Mark as streaming (removes skeleton)
          setChapters((prev) =>
            prev.map((chapter) => {
              if (chapter.id === chapterId) {
                return {
                  ...chapter,
                  subsections: chapter.subsections.map((sub) => {
                    if (sub.id === subsectionId) {
                      return { ...sub, isLoading: false, isStreaming: true };
                    }
                    return sub;
                  }),
                };
              }
              return chapter;
            }),
          );

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                try {
                  const data: StreamToken = JSON.parse(line.trim().slice(6));

                  if (data.type === 'token' && data.content) {
                    if (firstTokenTime === null) {
                      firstTokenTime = Date.now();
                    }

                    accumulatedContent += data.content;

                    // Update content in real-time
                    setChapters((prev) =>
                      prev.map((chapter) => {
                        if (chapter.id === chapterId) {
                          return {
                            ...chapter,
                            subsections: chapter.subsections.map((sub) => {
                              if (sub.id === subsectionId) {
                                return { ...sub, content: accumulatedContent };
                              }
                              return sub;
                            }),
                          };
                        }
                        return chapter;
                      }),
                    );
                  } else if (data.type === 'complete') {
                    // Mark as complete
                    setChapters((prev) =>
                      prev.map((chapter) => {
                        if (chapter.id === chapterId) {
                          return {
                            ...chapter,
                            subsections: chapter.subsections.map((sub) => {
                              if (sub.id === subsectionId) {
                                return { ...sub, isStreaming: false };
                              }
                              return sub;
                            }),
                          };
                        }
                        return chapter;
                      }),
                    );

                    setLoadedSections((prev) => new Set([...prev, sectionKey]));
                  } else if (data.type === 'error') {
                    console.error('Stream error:', data.message);
                    throw new Error(data.message || 'Stream error');
                  }
                } catch (e) {
                  console.error('SSE parse error:', e);
                }
              }
            }
          }

          reader.releaseLock();
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Streaming error:', error);

          // Show error state
          setChapters((prev) =>
            prev.map((chapter) => {
              if (chapter.id === chapterId) {
                return {
                  ...chapter,
                  subsections: chapter.subsections.map((sub) => {
                    if (sub.id === subsectionId) {
                      return {
                        ...sub,
                        isLoading: false,
                        isStreaming: false,
                        content: 'Error loading content. Please try again.',
                      };
                    }
                    return sub;
                  }),
                };
              }
              return chapter;
            }),
          );
        }
      }
    },
    [pfId, chapters, loadedSections],
  );

  return {
    courseName,
    chapters,
    totalLessons,
    completedLessons,
    streamSectionContent,
  };
};

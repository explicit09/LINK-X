'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentOutline {
  heading_id: string;
  title: string;
  est_tokens: number;
}

interface ChunkData {
  chunk_id: string;
  ordering: number;
  tokens: string[];
  complete?: boolean;
}

interface ChunkedDocumentViewerProps {
  documentId: string;
  title: string;
  onClose?: () => void;
}

export function ChunkedDocumentViewer({
  documentId,
  title,
  onClose,
}: ChunkedDocumentViewerProps) {
  const [outline, setOutline] = useState<DocumentOutline[]>([]);
  const [loadedChunks, setLoadedChunks] = useState<Map<string, string>>(
    new Map(),
  );
  const [loadingChunks, setLoadingChunks] = useState<Set<string>>(new Set());
  const [visibleChunkIds, setVisibleChunkIds] = useState<string[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [isLoadingOutline, setIsLoadingOutline] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const chunkRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Fetch document outline
  useEffect(() => {
    fetchOutline();
  }, [documentId]);

  const fetchOutline = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/documents/${documentId}/outline`,
        { credentials: 'include' },
      );

      if (response.ok) {
        const data = await response.json();
        setOutline(data);

        // Load first chunk immediately
        if (data.length > 0) {
          loadChunk(0);
          setActiveHeading(data[0].heading_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch outline:', error);
    } finally {
      setIsLoadingOutline(false);
    }
  };

  const loadChunk = async (chunkIndex: number) => {
    const chunkId = `chunk-${chunkIndex}`;

    if (loadedChunks.has(chunkId) || loadingChunks.has(chunkId)) {
      return;
    }

    setLoadingChunks((prev) => new Set(prev).add(chunkId));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chunks?doc_id=${documentId}&from=${chunkIndex}&limit=1`,
        { credentials: 'include' },
      );

      if (!response.ok) throw new Error('Failed to fetch chunk');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let chunkContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data: ChunkData = JSON.parse(line);

              if (data.tokens) {
                chunkContent += data.tokens.join(' ') + ' ';

                // Update loaded chunks in real-time for streaming effect
                setLoadedChunks((prev) =>
                  new Map(prev).set(chunkId, chunkContent),
                );
              }
            } catch (e) {
              console.error('Error parsing chunk data:', e);
            }
          }
        }
      }

      // Prefetch next two chunks
      if (chunkIndex < outline.length - 1) {
        setTimeout(() => loadChunk(chunkIndex + 1), 100);
      }
      if (chunkIndex < outline.length - 2) {
        setTimeout(() => loadChunk(chunkIndex + 2), 200);
      }
    } catch (error) {
      console.error('Failed to load chunk:', error);
    } finally {
      setLoadingChunks((prev) => {
        const next = new Set(prev);
        next.delete(chunkId);
        return next;
      });
    }
  };

  // Set up intersection observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const chunkIndex = parseInt(
              entry.target.getAttribute('data-chunk-index') || '0',
            );
            loadChunk(chunkIndex);

            // Update active heading
            const headingId = entry.target.getAttribute('data-heading-id');
            if (headingId) {
              setActiveHeading(headingId);
            }
          }
        });
      },
      { rootMargin: '100px' },
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [outline]);

  // Register chunk elements for observation
  const setChunkRef = useCallback(
    (index: number, element: HTMLElement | null) => {
      if (element && observerRef.current) {
        observerRef.current.observe(element);
        chunkRefs.current.set(`chunk-${index}`, element);
      }
    },
    [],
  );

  const scrollToHeading = (headingId: string, index: number) => {
    const element = chunkRefs.current.get(`chunk-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveHeading(headingId);
  };

  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-gray-200 bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </h3>
        </div>

        <ScrollArea className="h-[calc(100%-4rem)]">
          <div className="p-4 space-y-1">
            {isLoadingOutline ? (
              <>
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full" />
              </>
            ) : (
              outline.map((item, index) => (
                <Button
                  key={item.heading_id}
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollToHeading(item.heading_id, index)}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    activeHeading === item.heading_id &&
                      'bg-blue-50 text-blue-700',
                  )}
                >
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 mr-2 transition-transform',
                      activeHeading === item.heading_id && 'rotate-90',
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    ~{Math.round(item.est_tokens / 200)}min
                  </span>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-8 max-w-4xl mx-auto">
            {outline.map((heading, index) => {
              const chunkId = `chunk-${index}`;
              const content = loadedChunks.get(chunkId);
              const isLoading = loadingChunks.has(chunkId);

              return (
                <div
                  key={heading.heading_id}
                  ref={(el) => setChunkRef(index, el)}
                  data-chunk-index={index}
                  data-heading-id={heading.heading_id}
                  className="mb-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {heading.title}
                  </h2>

                  {content ? (
                    <div className="prose prose-gray max-w-none">
                      <p className="whitespace-pre-wrap">{content}</p>
                    </div>
                  ) : isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[95%]" />
                      <Skeleton className="h-4 w-[90%]" />
                      <Skeleton className="h-4 w-[85%]" />
                      <Skeleton className="h-4 w-[88%]" />
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">
                      Scroll to load content...
                    </div>
                  )}

                  {isLoading && content && (
                    <div className="mt-4">
                      <Progress
                        value={
                          (content.split(' ').length /
                            (heading.est_tokens * 0.75)) *
                          100
                        }
                        className="h-1"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Loading indicator for background prefetch */}
        {loadingChunks.size > 0 && (
          <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              Loading {loadingChunks.size} section
              {loadingChunks.size > 1 ? 's' : ''}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentOutline } from '../hooks/useDocumentOutline';
import { StreamingText } from '@/components/StreamingText';

interface StreamingContentProps {
  outline: DocumentOutline | null;
  streamingContent: Map<string, string>;
  streamingStates: Map<string, 'waiting' | 'streaming' | 'complete'>;
  activeSectionKey: string | null;
  focusedSectionKey: string | null;
  contentRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onStreamSection: (chapterId: string, subsectionId: string) => void;
  onRegenerateSection: (chapterId: string, subsectionId: string) => void;
  onSetVisibleSections: (sections: Set<string>) => void;
}

export function StreamingContent({
  outline,
  streamingContent,
  streamingStates,
  activeSectionKey,
  focusedSectionKey,
  contentRefs,
  onStreamSection,
  onRegenerateSection,
  onSetVisibleSections
}: StreamingContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for tracking visible sections
  useEffect(() => {
    if (!outline) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = new Set<string>();
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          }
        });
        onSetVisibleSections(visible);
      },
      {
        threshold: 0.1,
        rootMargin: '-10% 0px -10% 0px'
      }
    );

    // Observe all section elements
    outline.chapters.forEach((chapter) => {
      chapter.subsections.forEach((subsection) => {
        const sectionKey = `${chapter.id}-${subsection.id}`;
        const element = document.getElementById(sectionKey);
        if (element) {
          observer.observe(element);
        }
      });
    });

    return () => observer.disconnect();
  }, [outline, onSetVisibleSections]);

  if (!outline) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-gray-200">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto" ref={containerRef}>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {outline.chapters.map((chapter) => (
          <div key={chapter.id} className="space-y-6">
            {/* Chapter Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {chapter.title}
              </h1>
              <div className="flex items-center justify-center space-x-2">
                <Badge variant="outline">
                  {chapter.subsections.length} sections
                </Badge>
                <Badge variant="outline">
                  ~{chapter.estimatedTokens} tokens
                </Badge>
              </div>
            </div>

            {/* Chapter Subsections */}
            {chapter.subsections.map((subsection) => {
              const sectionKey = `${chapter.id}-${subsection.id}`;
              const content = streamingContent.get(sectionKey);
              const state = streamingStates.get(sectionKey);
              const isActive = activeSectionKey === sectionKey;
              const isFocused = focusedSectionKey === sectionKey;

              return (
                <Card
                  key={subsection.id}
                  id={sectionKey}
                  ref={(el) => {
                    if (el) {
                      contentRefs.current.set(sectionKey, el);
                    }
                  }}
                  className={cn(
                    "border transition-all duration-200",
                    isFocused 
                      ? "border-blue-300 shadow-lg ring-2 ring-blue-100" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <CardContent className="p-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                          {subsection.title}
                        </h2>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>~{subsection.estimatedTokens} tokens</span>
                          {state === 'complete' && (
                            <Badge variant="secondary" className="text-xs">
                              Generated
                            </Badge>
                          )}
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              Generating...
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {state === 'complete' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRegenerateSection(chapter.id, subsection.id)}
                            className="text-xs"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Regenerate
                          </Button>
                        )}
                        
                        {!content && state !== 'streaming' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onStreamSection(chapter.id, subsection.id)}
                            className="text-xs"
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Generate
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Section Content */}
                    <div className="prose prose-lg max-w-none">
                      {content ? (
                        state === 'streaming' && isActive ? (
                          <StreamingText content={content} isStreaming={true} />
                        ) : (
                          <div
                            className="text-gray-800 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: content.replace(/\n/g, '<br />')
                            }}
                          />
                        )
                      ) : state === 'streaming' ? (
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-5/6" />
                          <Skeleton className="h-4 w-4/5" />
                          <div className="flex items-center space-x-2 mt-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-sm text-gray-500">Generating content...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-lg mb-2">Ready to generate</div>
                          <div className="text-sm">
                            Click "Generate" to create content for this section
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
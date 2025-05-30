import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Circle, 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  ChevronRight,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentOutline } from '../hooks/useDocumentOutline';

interface DocumentSidebarProps {
  outline: DocumentOutline | null;
  isLoadingOutline: boolean;
  streamingStates: Map<string, 'waiting' | 'streaming' | 'complete'>;
  activeSectionKey: string | null;
  focusedSectionKey: string | null;
  visibleSections: Set<string>;
  isSticky: boolean;
  onToggleChapter: (chapterId: string) => void;
  onStreamSection: (chapterId: string, subsectionId: string) => void;
  onFocusSection: (sectionKey: string | null) => void;
  onRegenerateSection: (chapterId: string, subsectionId: string) => void;
}

export function DocumentSidebar({
  outline,
  isLoadingOutline,
  streamingStates,
  activeSectionKey,
  focusedSectionKey,
  visibleSections,
  isSticky,
  onToggleChapter,
  onStreamSection,
  onFocusSection,
  onRegenerateSection
}: DocumentSidebarProps) {
  const getStatusIcon = (state: 'waiting' | 'streaming' | 'complete' | undefined, isActive: boolean) => {
    if (isActive) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
    
    switch (state) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'streaming':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'waiting':
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoadingOutline) {
    return (
      <div className={cn(
        "w-80 bg-white border-r border-gray-200 p-4 space-y-4",
        isSticky ? "sticky top-4 h-[calc(100vh-2rem)]" : ""
      )}>
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <div className="ml-4 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!outline) {
    return (
      <div className={cn(
        "w-80 bg-white border-r border-gray-200 p-4",
        isSticky ? "sticky top-4 h-[calc(100vh-2rem)]" : ""
      )}>
        <div className="text-center text-gray-500">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No document outline available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-80 bg-white border-r border-gray-200 overflow-y-auto",
      isSticky ? "sticky top-4 h-[calc(100vh-2rem)]" : ""
    )}>
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {outline.fileName}
          </h2>
        </div>

        <div className="space-y-2">
          {outline.chapters.map((chapter) => (
            <Card key={chapter.id} className="border border-gray-200">
              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleChapter(chapter.id)}
                  className="w-full justify-between p-2 h-auto hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-left">
                      {chapter.title}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {chapter.subsections.length}
                    </Badge>
                  </div>
                  {chapter.isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {chapter.isExpanded && (
                  <div className="mt-2 space-y-1">
                    {chapter.subsections.map((subsection) => {
                      const sectionKey = `${chapter.id}-${subsection.id}`;
                      const state = streamingStates.get(sectionKey);
                      const isActive = activeSectionKey === sectionKey;
                      const isFocused = focusedSectionKey === sectionKey;
                      const isVisible = visibleSections.has(sectionKey);

                      return (
                        <div
                          key={subsection.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border transition-all",
                            isFocused 
                              ? "bg-blue-50 border-blue-200" 
                              : isVisible
                              ? "bg-gray-50 border-gray-200"
                              : "border-transparent hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {getStatusIcon(state, isActive)}
                            <button
                              onClick={() => {
                                onFocusSection(isFocused ? null : sectionKey);
                                const element = document.getElementById(sectionKey);
                                if (element) {
                                  element.scrollIntoView({ 
                                    behavior: 'smooth',
                                    block: 'center'
                                  });
                                }
                              }}
                              className="text-left flex-1 min-w-0"
                            >
                              <div className="text-sm text-gray-900 truncate">
                                {subsection.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                ~{subsection.estimatedTokens} tokens
                              </div>
                            </button>
                          </div>

                          <div className="flex items-center space-x-1">
                            {state === 'complete' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRegenerateSection(chapter.id, subsection.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                title="Regenerate section"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {state !== 'complete' && state !== 'streaming' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onStreamSection(chapter.id, subsection.id)}
                                className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600"
                                title="Generate section"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
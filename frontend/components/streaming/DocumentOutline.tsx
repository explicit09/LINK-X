"use client";

import React, { useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronDown, Circle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreaming } from './StreamingContext';
import { OutlineSection, OutlineSubsection } from '@/lib/api/streaming';

interface SectionItemProps {
  section: OutlineSection;
  isActive: boolean;
  isComplete: boolean;
  isStreaming: boolean;
  hasError: boolean;
  onSelect: (sectionId: string) => void;
  level?: number;
}

function SectionItem({ 
  section, 
  isActive, 
  isComplete, 
  isStreaming,
  hasError,
  onSelect,
  level = 0 
}: SectionItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubsections = section.subsections && section.subsections.length > 0;
  
  const toggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);
  
  const getStatusIcon = () => {
    if (hasError) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (isComplete) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (isStreaming) return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };
  
  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground",
          level > 0 && "ml-4"
        )}
        onClick={() => onSelect(section.id)}
      >
        {hasSubsections && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={toggleExpanded}
          >
            {isExpanded ? 
              <ChevronDown className="h-3 w-3" /> : 
              <ChevronRight className="h-3 w-3" />
            }
          </Button>
        )}
        {!hasSubsections && <div className="w-4" />}
        
        {getStatusIcon()}
        
        <span className={cn(
          "flex-1 text-sm",
          level > 0 && "text-xs"
        )}>
          {section.title}
        </span>
      </div>
      
      {hasSubsections && isExpanded && (
        <div className="mt-1">
          {section.subsections!.map((subsection) => (
            <SectionItem
              key={subsection.id}
              section={subsection as OutlineSection}
              isActive={isActive && section.id === subsection.id}
              isComplete={false} // Subsections don&apos;t track completion
              isStreaming={false}
              hasError={false}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DocumentOutlineProps {
  className?: string;
}

export function DocumentOutline({ className }: DocumentOutlineProps) {
  const { state, setActiveSection } = useStreaming();
  const { outline, sections, activeSectionId } = state;
  
  if (!outline) {
    return (
      <div className={cn("p-4", className)}>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  const completedSections = Array.from(sections.values()).filter(
    s => s.status === 'complete'
  ).length;
  const totalSections = outline.sections.length;
  const progress = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-2">{outline.title}</h3>
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedSections} of {totalSections} sections</span>
            <Badge variant="secondary" className="text-xs">
              {Math.round(progress)}%
            </Badge>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {outline.sections.map((section) => {
            const sectionState = sections.get(section.id);
            return (
              <SectionItem
                key={section.id}
                section={section}
                isActive={activeSectionId === section.id}
                isComplete={sectionState?.status === 'complete'}
                isStreaming={sectionState?.status === 'streaming'}
                hasError={sectionState?.status === 'error'}
                onSelect={setActiveSection}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  Circle, 
  Play,
  ChevronRight
} from 'lucide-react';

interface OutlineSection {
  anchor: string;
  title: string;
  isComplete: boolean;
}

interface CollapsibleOutlineProps {
  outline: OutlineSection[];
  currentSection: string | null;
  onNavigate: (sectionId: string) => void;
  progress: number;
  isStreaming: boolean;
  className?: string;
}

export function CollapsibleOutline({
  outline,
  currentSection,
  onNavigate,
  progress,
  isStreaming,
  className
}: CollapsibleOutlineProps) {
  const completedSections = outline.filter(s => s.isComplete).length;
  const totalSections = outline.length;

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Outline Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-2">Document Outline</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedSections} of {totalSections} sections</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Section List */}
      <div className="flex-1 overflow-y-auto p-2">
        <nav className="space-y-1">
          {outline.map((section, index) => {
            const isCurrent = currentSection === section.anchor;
            const isPending = !section.isComplete && !isCurrent;
            
            return (
              <button
                key={section.anchor}
                onClick={() => onNavigate(section.anchor)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                  "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                  isCurrent && "bg-accent",
                  section.isComplete && "text-foreground/80",
                  isPending && "text-muted-foreground"
                )}
              >
                {/* Status Icon */}
                <div className="mt-0.5 shrink-0">
                  {section.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : isCurrent && isStreaming ? (
                    <div className="relative">
                      <Circle className="w-4 h-4 text-primary animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                      </div>
                    </div>
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>

                {/* Section Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm leading-tight",
                    isCurrent && "font-medium"
                  )}>
                    {section.title}
                  </p>
                  {isCurrent && isStreaming && (
                    <p className="text-xs text-primary mt-1">Personalizing...</p>
                  )}
                </div>

                {/* Navigation Arrow */}
                <ChevronRight className={cn(
                  "w-4 h-4 shrink-0 transition-transform",
                  isCurrent && "translate-x-0.5"
                )} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick Actions */}
      {!isStreaming && progress < 100 && outline.length > 0 && (
        <div className="p-4 border-t">
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              const nextIncomplete = outline.find(s => !s.isComplete);
              if (nextIncomplete) {
                onNavigate(nextIncomplete.anchor);
              }
            }}
          >
            <Play className="w-3 h-3 mr-2" />
            Continue Learning
          </Button>
        </div>
      )}
    </div>
  );
}
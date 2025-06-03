import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

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

interface OutlineProgressProps {
  outline: Outline | null;
  currentSection: number;
  progress: number;
  onSectionClick?: (index: number) => void;
}

export function OutlineProgress({ 
  outline, 
  currentSection, 
  progress,
  onSectionClick 
}: OutlineProgressProps) {
  if (!outline) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </Card>
    );
  }

  const completedSections = outline.sections.filter(s => s.isComplete).length;
  const totalSections = outline.sections.length;

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Content Outline</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completedSections} of {totalSections} sections complete
          </p>
        </div>
      </div>

      <ScrollArea className="h-[400px] pr-3">
        <div className="space-y-2">
          {outline.sections.map((section, index) => {
            const isActive = index === currentSection;
            const isComplete = section.isComplete;
            const isPending = index > currentSection;

            return (
              <Button
                key={section.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left p-3 h-auto",
                  isActive && "bg-primary/10 border-l-2 border-primary",
                  isComplete && "text-muted-foreground"
                )}
                onClick={() => onSectionClick?.(index)}
                disabled={isPending}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="mt-0.5">
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn(
                      "text-sm font-medium line-clamp-2",
                      isPending && "text-muted-foreground"
                    )}>
                      {section.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ~{section.tokens} tokens
                    </p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Section navigation hint */}
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Click any completed section to review
        </p>
      </div>
    </Card>
  );
}
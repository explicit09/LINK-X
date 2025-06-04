'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Section } from '../hooks/useEnhancedPersonalization';
import { cn } from '@/lib/utils';

interface EnhancedOutlineProps {
  outline: Section[];
  progress: number;
  currentSection: string | null;
  isStreaming: boolean;
  onNavigate: (sectionId: string) => void;
  onGenerate: () => void;
}

export const EnhancedOutline: React.FC<EnhancedOutlineProps> = ({
  outline,
  progress,
  currentSection,
  isStreaming,
  onNavigate,
  onGenerate,
}) => {
  const getSectionIcon = (section: Section) => {
    if (section.isComplete) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (currentSection === section.anchor && isStreaming) {
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    }
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  const getSectionTypeColor = (type: string) => {
    switch (type) {
      case 'intro':
        return 'bg-blue-500/10 text-blue-500';
      case 'definition':
        return 'bg-purple-500/10 text-purple-500';
      case 'example':
        return 'bg-green-500/10 text-green-500';
      case 'practice':
        return 'bg-orange-500/10 text-orange-500';
      case 'summary':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Document Outline</CardTitle>
        {outline.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {outline.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No outline generated yet
            </p>
            <Button 
              onClick={onGenerate}
              disabled={isStreaming}
              className="w-full"
            >
              Generate Outline
            </Button>
          </div>
        ) : (
          <>
            {outline.map((section, index) => (
              <button
                key={section.anchor}
                onClick={() => onNavigate(section.anchor)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all duration-200",
                  "hover:bg-muted/50 group",
                  currentSection === section.anchor && "bg-primary/10",
                  section.isComplete && "opacity-90"
                )}
                disabled={!section.isComplete && currentSection !== section.anchor}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getSectionIcon(section)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "font-medium truncate",
                        section.level === 1 && "text-base",
                        section.level === 2 && "text-sm",
                        section.level > 2 && "text-sm ml-2"
                      )}>
                        {section.title}
                      </h3>
                      {section.type && (
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          getSectionTypeColor(section.type)
                        )}>
                          {section.type}
                        </span>
                      )}
                    </div>
                    {section.keywords && section.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {section.keywords.slice(0, 3).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-muted px-1.5 py-0.5 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    "group-hover:translate-x-1"
                  )} />
                </div>
              </button>
            ))}
            
            {!isStreaming && outline.length > 0 && !outline[0].isComplete && (
              <Button 
                onClick={onGenerate}
                className="w-full mt-4"
              >
                Start Personalization
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
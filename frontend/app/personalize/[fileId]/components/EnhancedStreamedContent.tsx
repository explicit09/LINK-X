import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { TypewriterContent } from './TypewriterContent';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Lightbulb, 
  Target, 
  CheckCircle2, 
  Clock, 
  Eye,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Sparkles,
  Brain,
  Zap
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

interface OutlineSection {
  anchor: string;
  title: string;
  isComplete: boolean;
  isStreamingComplete: boolean;
  order: number;
  content_preview?: string;
}

interface StreamedContentProps {
  sections: Map<string, string>;
  outline: OutlineSection[];
  currentSection: string | null;
  isStreaming: boolean;
  onSectionComplete?: (sectionId: string) => void;
  onSectionIncomplete?: (sectionId: string) => void;
  onFeedback?: (sectionId: string, feedback: 'helpful' | 'not_helpful') => void;
  className?: string;
}

// Content type detection
const detectContentType = (content: string): 'theory' | 'example' | 'practice' | 'summary' => {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('example') || lowerContent.includes('for instance') || lowerContent.includes('imagine')) {
    return 'example';
  }
  if (lowerContent.includes('exercise') || lowerContent.includes('practice') || lowerContent.includes('try')) {
    return 'practice';
  }
  if (lowerContent.includes('summary') || lowerContent.includes('conclusion') || lowerContent.includes('key insights')) {
    return 'summary';
  }
  return 'theory';
};

// Estimate reading time (200 words per minute)
const estimateReadingTime = (content: string): number => {
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(words / 200);
};

// Content difficulty scoring (1-5)
const calculateDifficulty = (content: string): number => {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
  const complexWords = content.match(/\b\w{10,}\b/g)?.length || 0;
  const totalWords = content.split(/\s+/).length;
  
  const complexity = (avgSentenceLength / 20) + (complexWords / totalWords) * 5;
  return Math.min(5, Math.max(1, Math.round(complexity)));
};

const ContentTypeIcon = ({ type }: { type: 'theory' | 'example' | 'practice' | 'summary' }) => {
  const icons = {
    theory: <BookOpen className="w-4 h-4" />,
    example: <Lightbulb className="w-4 h-4" />,
    practice: <Target className="w-4 h-4" />,
    summary: <Brain className="w-4 h-4" />
  };
  
  const colors = {
    theory: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    example: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    practice: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    summary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  };
  
  return (
    <div className={cn('p-2 rounded-lg', colors[type])}>
      {icons[type]}
    </div>
  );
};

const DifficultyIndicator = ({ level }: { level: number }) => {
  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return 'Beginner';
    if (level <= 3) return 'Intermediate';
    if (level <= 4) return 'Advanced';
    return 'Expert';
  };
  
  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'text-green-600 dark:text-green-400';
    if (level <= 3) return 'text-yellow-600 dark:text-yellow-400';
    if (level <= 4) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'w-1.5 h-3 rounded-sm',
              i <= level ? getDifficultyColor(level) : 'bg-muted',
              i <= level && 'bg-current'
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs font-medium', getDifficultyColor(level))}>
        {getDifficultyLabel(level)}
      </span>
    </div>
  );
};

export function EnhancedStreamedContent({
  sections,
  outline,
  currentSection,
  isStreaming,
  onSectionComplete,
  onSectionIncomplete,
  onFeedback,
  className
}: StreamedContentProps) {
  const sectionRefs = useRef<{ [key: string]: HTMLElement }>({});
  const lastSectionRef = useRef<string | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());

  // Intersection Observer for tracking visible sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visibleSections);
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            newVisible.add(entry.target.id);
          } else {
            newVisible.delete(entry.target.id);
          }
        });
        setVisibleSections(newVisible);
      },
      { threshold: [0.1, 0.5, 0.9] }
    );

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [outline]);

  // Track current section without auto-scrolling to avoid interrupting reading
  useEffect(() => {
    if (currentSection && currentSection !== lastSectionRef.current) {
      lastSectionRef.current = currentSection;
    }
  }, [currentSection]);

  // No automatic completion tracking - user controls completion

  const handleFeedback = (sectionId: string, feedback: 'helpful' | 'not_helpful') => {
    if (onFeedback) {
      onFeedback(sectionId, feedback);
      setFeedbackGiven(prev => new Set([...prev, sectionId]));
    }
  };

  const renderSection = (section: OutlineSection, index: number) => {
    const content = sections.get(section.anchor) || '';
    const isCurrentSection = currentSection === section.anchor;
    const isEmpty = !content.trim();
    const isVisible = visibleSections.has(section.anchor);
    const contentType = detectContentType(content);
    const readingTime = estimateReadingTime(content);
    const difficulty = calculateDifficulty(content);
    const hasGivenFeedback = feedbackGiven.has(section.anchor);
    
    // Enhanced section title
    const enhancedTitle = section.title.replace(/^Part\s+\d+$/i, `${section.title}: ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`);

    return (
      <Card
        key={section.anchor}
        id={section.anchor}
        ref={el => { if (el) sectionRefs.current[section.anchor] = el; }}
        className={cn(
          "scroll-mt-20 transition-all duration-500 hover:shadow-lg",
          isCurrentSection && isStreaming && "ring-2 ring-primary/30 shadow-xl",
          isVisible && "scale-[1.01]",
          section.isComplete && "border-green-200 dark:border-green-800",
          className
        )}
      >
        {/* Enhanced Section Header */}
        <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/30 via-background to-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <ContentTypeIcon type={contentType} />
                <Badge variant="outline" className="text-xs">
                  Section {index + 1}
                </Badge>
                {section.isComplete && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Complete
                  </Badge>
                )}
                {isCurrentSection && isStreaming && (
                  <Badge className="bg-primary/10 text-primary animate-pulse">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generating...
                  </Badge>
                )}
              </div>
              
              <h2 className="text-xl font-bold mb-3 text-foreground leading-tight">
                {enhancedTitle}
              </h2>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{readingTime} min read</span>
                </div>
                <DifficultyIndicator level={difficulty} />
                {isVisible && (
                  <div className="flex items-center gap-1 text-primary">
                    <Eye className="w-3 h-3" />
                    <span className="text-xs">In view</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section Progress */}
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">
                Progress
              </div>
              <div className="w-16">
                <Progress 
                  value={section.isComplete ? 100 : (isCurrentSection && isStreaming ? 50 : 0)}
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Section Content */}
        <div className="p-6">
          {isEmpty && isStreaming && isCurrentSection ? (
            <div className="space-y-4">
              {/* Real-time streaming indicator */}
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">
                    🤖 AI is generating content...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Content will appear here as it's created
                  </p>
                </div>
              </div>
              
              {/* Preview placeholder that will be replaced by streaming content */}
              <div className="space-y-3 opacity-30">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-4/6"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-3/6"></div>
              </div>
            </div>
          ) : (
            <TypewriterContent
              content={content}
              isStreaming={isStreaming && isCurrentSection}
              speed={60} // 60 characters per second for smooth streaming effect
              className="min-h-[100px]" // Ensure space is reserved for content
            />
          )}

          {/* Section Footer with Completion and Feedback */}
          {content && section.isStreamingComplete && (
            <div className="mt-8 pt-6 border-t border-border/50 space-y-4">
              {/* Section Completion Controls */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Have you finished reading this section?
                </div>
                <div className="flex items-center gap-2">
                  {!section.isComplete ? (
                    <Button
                      size="sm"
                      onClick={() => onSectionComplete?.(section.anchor)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark as Complete
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSectionIncomplete?.(section.anchor)}
                        className="text-xs"
                      >
                        Mark as Incomplete
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback Controls (only show after completion) */}
              {section.isComplete && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Was this section helpful?
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasGivenFeedback ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFeedback(section.anchor, 'helpful')}
                          className="text-green-600 hover:text-green-700 hover:border-green-300"
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Helpful
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFeedback(section.anchor, 'not_helpful')}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <ThumbsDown className="w-3 h-3 mr-1" />
                          Not helpful
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Thank you for your feedback!
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {outline.map((section, index) => renderSection(section, index))}
      
      {/* Enhanced Streaming indicator */}
      {isStreaming && (
        <Card className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full"></div>
              <Sparkles className="absolute inset-0 w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Personalization in Progress</h3>
            <p className="text-muted-foreground max-w-md">
              Our AI is analyzing your learning preferences and adapting the content to match your style.
              This process creates a unique learning experience just for you.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
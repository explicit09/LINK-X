import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

interface OutlineSection {
  anchor: string;
  title: string;
  isComplete: boolean;
}

interface StreamedContentProps {
  sections: Map<string, string>;
  outline: OutlineSection[];
  currentSection: string | null;
  isStreaming: boolean;
  onSectionComplete?: (sectionId: string) => void;
  className?: string;
}

export function StreamedContent({
  sections,
  outline,
  currentSection,
  isStreaming,
  onSectionComplete,
  className
}: StreamedContentProps) {
  const sectionRefs = useRef<{ [key: string]: HTMLElement }>({});
  const lastSectionRef = useRef<string | null>(null);

  // Auto-scroll to current section when streaming
  useEffect(() => {
    if (currentSection && currentSection !== lastSectionRef.current && isStreaming) {
      const element = sectionRefs.current[currentSection];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        lastSectionRef.current = currentSection;
      }
    }
  }, [currentSection, isStreaming]);

  // Track section completion
  useEffect(() => {
    outline.forEach(section => {
      if (section.isComplete && onSectionComplete) {
        onSectionComplete(section.anchor);
      }
    });
  }, [outline, onSectionComplete]);

  const renderSection = (section: OutlineSection) => {
    const content = sections.get(section.anchor) || '';
    const isCurrentSection = currentSection === section.anchor;
    const isEmpty = !content.trim();

    return (
      <section
        key={section.anchor}
        id={section.anchor}
        ref={el => { if (el) sectionRefs.current[section.anchor] = el; }}
        className={cn(
          "scroll-mt-20 transition-all duration-300",
          isCurrentSection && isStreaming && "ring-2 ring-primary/20 rounded-lg",
          className
        )}
      >
        {/* Section Header */}
        <h2 className="text-2xl font-bold mb-4 text-foreground">
          {section.title}
        </h2>

        {/* Section Content */}
        {isEmpty && isStreaming && isCurrentSection ? (
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-pulse flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              </div>
              <span className="text-sm">Personalizing content...</span>
            </div>
          </div>
        ) : (
          <div className="prose prose-gray max-w-none dark:prose-invert 
                          prose-headings:font-semibold prose-headings:text-foreground
                          prose-p:text-foreground/90 prose-p:leading-relaxed
                          prose-li:text-foreground/90
                          prose-strong:text-foreground prose-strong:font-semibold
                          prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                          prose-pre:bg-muted prose-pre:border prose-pre:border-border
                          prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                          prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              components={{
                // Custom code block rendering
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  if (!inline && language) {
                    return (
                      <div className="relative group">
                        <pre className={cn("overflow-x-auto", className)} {...props}>
                          <code>{children}</code>
                        </pre>
                        <button
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                                     text-xs px-2 py-1 rounded bg-background/80 border text-muted-foreground
                                     hover:text-foreground"
                          onClick={() => {
                            navigator.clipboard.writeText(String(children));
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    );
                  }
                  
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                // Enhanced list rendering
                ul({ children }) {
                  return <ul className="space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="space-y-1">{children}</ol>;
                },
                // Better blockquote styling
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-primary/30 pl-4 italic">
                      {children}
                    </blockquote>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}

        {/* Section divider */}
        {section !== outline[outline.length - 1] && (
          <hr className="my-8 border-border/50" />
        )}
      </section>
    );
  };

  return (
    <div className="space-y-8">
      {outline.map(section => renderSection(section))}
      
      {/* Streaming indicator at the end */}
      {isStreaming && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm">Generating personalized content...</span>
          </div>
        </div>
      )}
    </div>
  );
}
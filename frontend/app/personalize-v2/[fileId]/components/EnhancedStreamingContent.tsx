'use client';

import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { Section } from '../hooks/useEnhancedPersonalization';
import { cn } from '@/lib/utils';

interface EnhancedStreamingContentProps {
  sections: Map<string, string>;
  outline: Section[];
  isStreaming: boolean;
  currentSection?: string | null;
  showSectionIndicator?: boolean;
}

export const EnhancedStreamingContent: React.FC<EnhancedStreamingContentProps> = ({ 
  sections,
  outline,
  isStreaming,
  currentSection,
  showSectionIndicator = true
}) => {
  const contentEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = React.useState<string | null>(null);

  // Auto-scroll to new content while streaming
  useEffect(() => {
    if (isStreaming && currentSection) {
      const element = document.getElementById(currentSection);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentSection, isStreaming]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = document.querySelectorAll('[data-section]');
      let currentActive = null;
      
      sectionElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom > 150) {
          currentActive = element.id;
        }
      });
      
      setActiveSection(currentActive);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get current section title for indicator
  const getCurrentSectionTitle = () => {
    if (currentSection) {
      const section = outline.find(s => s.anchor === currentSection);
      return section?.title || currentSection;
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div ref={containerRef} className="p-6 space-y-8">
        {showSectionIndicator && currentSection && isStreaming && (
          <div className="sticky top-4 z-10 mb-4">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-2 rounded-full border">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>Generating: {getCurrentSectionTitle()}</span>
            </div>
          </div>
        )}
        
        {outline.length === 0 && !isStreaming && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground italic">
              Click "Generate Outline" to start personalizing this content for you.
            </p>
          </div>
        )}
        
        {outline.map((section) => {
          const content = sections.get(section.anchor) || '';
          const isActive = activeSection === section.anchor;
          const isCurrentlyStreaming = currentSection === section.anchor && isStreaming;
          
          return (
            <div
              key={section.anchor}
              id={section.anchor}
              data-section={section.title}
              className={cn(
                "scroll-mt-20 transition-all duration-300",
                isActive && "ring-2 ring-primary/20 rounded-lg p-4 -mx-4",
                isCurrentlyStreaming && "ring-2 ring-primary/40 rounded-lg p-4 -mx-4 animate-pulse"
              )}
            >
              {/* Section header */}
              <div className="flex items-center gap-2 mb-4">
                <h2 className={cn(
                  "font-semibold",
                  section.level === 1 && "text-2xl",
                  section.level === 2 && "text-xl",
                  section.level === 3 && "text-lg",
                  section.level > 3 && "text-base"
                )}>
                  {section.title}
                </h2>
                {section.isComplete && (
                  <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                    ✓ Complete
                  </span>
                )}
                {section.keywords && section.keywords.length > 0 && (
                  <div className="flex gap-1 ml-auto">
                    {section.keywords.slice(0, 3).map((keyword, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Section content */}
              {content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={cn(
                            inline ? "px-1 py-0.5 bg-muted rounded text-sm" : "block p-4 bg-muted rounded-md overflow-x-auto",
                            className
                          )} {...props}>
                            {children}
                          </code>
                        );
                      },
                      h1: ({ children, ...props }) => (
                        <h1 className="text-2xl font-bold mt-8 mb-4" {...props}>
                          {children}
                        </h1>
                      ),
                      h2: ({ children, ...props }) => (
                        <h2 className="text-xl font-semibold mt-6 mb-3" {...props}>
                          {children}
                        </h2>
                      ),
                      h3: ({ children, ...props }) => (
                        <h3 className="text-lg font-semibold mt-4 mb-2" {...props}>
                          {children}
                        </h3>
                      ),
                      p: ({ children, ...props }) => (
                        <p className="mb-4 leading-7" {...props}>
                          {children}
                        </p>
                      ),
                      ul: ({ children, ...props }) => (
                        <ul className="list-disc pl-6 mb-4 space-y-2" {...props}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children, ...props }) => (
                        <ol className="list-decimal pl-6 mb-4 space-y-2" {...props}>
                          {children}
                        </ol>
                      ),
                      li: ({ children, ...props }) => (
                        <li className="leading-7" {...props}>
                          {children}
                        </li>
                      ),
                      blockquote: ({ children, ...props }) => (
                        <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props}>
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, ...props }) => (
                        <a className="text-primary hover:underline" {...props}>
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                  
                  {isCurrentlyStreaming && (
                    <span className="inline-block w-2 h-5 bg-primary animate-pulse" />
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground italic p-4 bg-muted/20 rounded-lg">
                  {section.content_preview}
                  {isCurrentlyStreaming && (
                    <div className="mt-2 flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Completion message */}
        {!isStreaming && outline.length > 0 && outline.every(s => s.isComplete) && (
          <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
            <p className="text-green-600 dark:text-green-400 font-medium">
              ✨ Personalization complete! Your content is ready.
            </p>
          </div>
        )}
        
        {/* Invisible div for auto-scrolling */}
        <div ref={contentEndRef} />
      </div>
    </div>
  );
};
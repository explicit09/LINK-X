import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StreamingContentProps {
  content: string;
  isStreaming: boolean;
  currentSection: number;
  outline: any;
}

export function StreamingContent({ 
  content, 
  isStreaming, 
  currentSection,
  outline 
}: StreamingContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [displayContent, setDisplayContent] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  
  // Typewriter effect for streaming content
  useEffect(() => {
    if (isStreaming && content.length > displayContent.length) {
      const timer = setTimeout(() => {
        setDisplayContent(content.slice(0, displayContent.length + 1));
      }, 10); // Adjust speed as needed
      
      return () => clearTimeout(timer);
    } else if (!isStreaming) {
      setDisplayContent(content);
    }
  }, [content, displayContent, isStreaming]);

  // Cursor blink effect
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
    setShowCursor(false);
  }, [isStreaming]);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayContent, isStreaming]);

  // Section indicator
  const getCurrentSectionName = () => {
    if (outline && outline.sections[currentSection]) {
      return outline.sections[currentSection].title;
    }
    return null;
  };

  return (
    <div className="relative">
      {/* Current section indicator */}
      {isStreaming && getCurrentSectionName() && (
        <div className="mb-4">
          <div className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-medium">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-2" />
            Generating: {getCurrentSectionName()}
          </div>
        </div>
      )}

      {/* Content area */}
      <div 
        ref={contentRef}
        className="prose prose-neutral dark:prose-invert max-w-none overflow-y-auto max-h-[600px] pr-4"
      >
        <ReactMarkdown
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
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-relaxed">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary/30 pl-4 my-4 italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {displayContent}
        </ReactMarkdown>
        
        {/* Streaming cursor */}
        {isStreaming && (
          <span 
            className={cn(
              "inline-block w-0.5 h-5 bg-primary ml-0.5",
              showCursor ? "opacity-100" : "opacity-0"
            )} 
          />
        )}
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
          </div>
          <span>AI is generating personalized content...</span>
        </div>
      )}

      {/* Content stats */}
      <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
        <span>{displayContent.split(' ').filter(w => w).length} words</span>
        <span>{Math.ceil(displayContent.split(' ').filter(w => w).length / 200)} min read</span>
      </div>
    </div>
  );
}
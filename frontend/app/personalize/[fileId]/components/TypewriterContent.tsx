import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

interface TypewriterContentProps {
  content: string;
  isStreaming: boolean;
  speed?: number; // Characters per second
  className?: string;
}

export function TypewriterContent({ 
  content, 
  isStreaming, 
  speed = 50, // 50 characters per second = realistic typing speed
  className 
}: TypewriterContentProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastContentRef = useRef('');

  useEffect(() => {
    // If content hasn't changed, don't restart typing
    if (content === lastContentRef.current) return;
    
    // If not streaming, show content immediately
    if (!isStreaming) {
      setDisplayedContent(content);
      setIsTyping(false);
      lastContentRef.current = content;
      return;
    }

    // If content is new or longer, start/continue typing
    if (content.length > displayedContent.length) {
      setIsTyping(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Calculate delay between characters
      const delay = 1000 / speed;
      
      const typeNextCharacter = () => {
        setDisplayedContent(prev => {
          const nextLength = prev.length + 1;
          
          if (nextLength >= content.length) {
            setIsTyping(false);
            lastContentRef.current = content;
            return content;
          }
          
          // Schedule next character
          timeoutRef.current = setTimeout(typeNextCharacter, delay);
          return content.slice(0, nextLength);
        });
      };

      // Start typing
      timeoutRef.current = setTimeout(typeNextCharacter, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, isStreaming, speed, displayedContent.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div className="prose prose-gray max-w-none dark:prose-invert 
                      prose-headings:font-semibold prose-headings:text-foreground prose-headings:leading-tight
                      prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
                      prose-li:text-foreground/90 prose-li:mb-1
                      prose-strong:text-foreground prose-strong:font-semibold
                      prose-em:text-primary prose-em:font-medium
                      prose-code:text-primary prose-code:bg-primary/10 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                      prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4
                      prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:bg-muted/30 prose-blockquote:p-4 prose-blockquote:rounded-r-lg
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeHighlight]}
        >
          {displayedContent}
        </ReactMarkdown>
      </div>
      
      {/* Typing cursor */}
      {isTyping && (
        <span className="inline-block w-0.5 h-5 bg-primary animate-pulse ml-1 align-text-bottom" />
      )}
      
      {/* Streaming indicator when content is being received */}
      {isStreaming && content.length > displayedContent.length && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
          </div>
          <span>AI is writing...</span>
        </div>
      )}
    </div>
  );
}
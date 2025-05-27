"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  className?: string;
  role?: string;
}

export function StreamingText({ content, isStreaming, className, role = "assistant" }: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!content) {
      setDisplayedContent("");
      return;
    }

    // If not streaming, show all content immediately
    if (!isStreaming) {
      setDisplayedContent(content);
      setShowCursor(false);
      return;
    }

    // For streaming, update displayed content smoothly
    setDisplayedContent(content);
    setShowCursor(true);
  }, [content, isStreaming]);

  // Blink cursor
  useEffect(() => {
    if (!isStreaming) {
      setShowCursor(false);
      return;
    }

    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className={cn("relative", className)}>
      <ReactMarkdown 
        components={{
          p: ({children}) => (
            <p className={cn(
              "mb-2 last:mb-0",
              role === "user" ? "text-white" : "text-gray-700"
            )}>
              {children}
              {isStreaming && showCursor && (
                <span className="inline-block w-0.5 h-4 bg-current ml-0.5 -mb-0.5" />
              )}
            </p>
          ),
          strong: ({children}) => (
            <strong className={cn(
              "font-semibold",
              role === "user" ? "text-white" : "text-gray-900"
            )}>
              {children}
            </strong>
          ),
          code: ({children}) => (
            <code className={cn(
              "px-1 py-0.5 rounded text-sm font-mono",
              role === "user" 
                ? "bg-blue-500 text-white" 
                : "bg-gray-100 text-gray-800"
            )}>
              {children}
            </code>
          ),
        }}
      >
        {displayedContent}
      </ReactMarkdown>
    </div>
  );
}
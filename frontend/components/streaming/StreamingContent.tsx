"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreaming } from './StreamingContext';
import { api } from '@/lib/api/index';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StreamingContentProps {
  fileId: string;
  className?: string;
}

export function StreamingContent({ fileId, className }: StreamingContentProps) {
  const { state, startStreaming, handleStreamingMessage } = useStreaming();
  const { activeSectionId, sections } = state;
  const streamCleanupRef = useRef<(() => void) | null>(null);
  
  const activeSection = activeSectionId ? sections.get(activeSectionId) : null;
  
  // Stream content when active section changes
  useEffect(() => {
    if (!activeSectionId || !fileId) return;
    
    // Clean up previous stream
    if (streamCleanupRef.current) {
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }
    
    // Check if section already has content
    if (activeSection && activeSection.status === 'complete') {
      return;
    }
    
    // Start streaming
    startStreaming(activeSectionId);
    
    const cleanup = api.streaming.streamLearningContent(
      fileId,
      { style: 'default' },
      (message) => {
        handleStreamingMessage(activeSectionId, message);
      },
      (error) => {
        handleStreamingMessage(activeSectionId, {
          type: 'error',
          message: error.message
        });
      }
    );
    
    streamCleanupRef.current = cleanup;
    
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
    };
  }, [activeSectionId, fileId, startStreaming, handleStreamingMessage, activeSection]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
    };
  }, []);
  
  if (!activeSectionId) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Select a section from the outline to start learning
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!activeSection) {
    return (
      <div className={cn("p-6", className)}>
        <Skeleton className="h-8 w-3/4 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }
  
  if (activeSection.status === 'error') {
    return (
      <div className={cn("p-6", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {activeSection.error || 'Failed to load content'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            // Retry streaming
            startStreaming(activeSectionId);
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className={cn("p-6 overflow-auto", className)}>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  {...props}
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code {...props} className={className}>
                  {children}
                </code>
              );
            }
          }}
        >
          {activeSection.content}
        </ReactMarkdown>
        
        {activeSection.status === 'streaming' && (
          <span className="inline-block w-2 h-5 bg-primary animate-pulse" />
        )}
      </div>
    </div>
  );
}
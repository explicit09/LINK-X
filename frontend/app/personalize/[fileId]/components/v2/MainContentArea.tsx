'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Meh, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

interface MainContentAreaProps {
  content: Map<string, string>;
  currentSection: string | null;
  isStreaming: boolean;
}

export function MainContentArea({
  content,
  currentSection,
  isStreaming,
}: MainContentAreaProps) {
  const [note, setNote] = useState('');
  const [sectionFeedback, setSectionFeedback] = useState<Record<string, 'positive' | 'neutral' | 'negative'>>({});
  
  const handleFeedback = (sectionId: string, feedback: 'positive' | 'neutral' | 'negative') => {
    setSectionFeedback(prev => ({ ...prev, [sectionId]: feedback }));
    // TODO: Send feedback to backend
    console.log(`Feedback for section ${sectionId}: ${feedback}`);
  };
  
  // Get current content
  const currentContent = currentSection && content.get(currentSection);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {isStreaming && (
        <div className="mb-6 flex items-center gap-2 text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Personalizing content for you...</span>
        </div>
      )}
      
      {/* Main Content */}
      <div className="prose prose-gray max-w-none">
        {currentContent ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold mb-4 text-gray-900">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold mb-3 text-gray-800">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-medium mb-2 text-gray-700">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-gray-600 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 space-y-2">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="ml-4 text-gray-600">• {children}</li>
              ),
              code: ({ inline, children, ...props }) => {
                if (inline) {
                  return (
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm" {...props}>
                      {children}
                    </code>
                  );
                }
                return <code {...props}>{children}</code>;
              },
              pre: ({ children }) => (
                <pre className="mb-4 p-4 bg-gray-50 rounded-lg overflow-x-auto">{children}</pre>
              ),
            }}
          >
            {currentContent}
          </ReactMarkdown>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg mb-2">Select a topic from the outline to begin</p>
            <p className="text-sm">AI-personalized content will appear here</p>
          </div>
        )}
      </div>
      
      {/* Quick Note */}
      {currentContent && (
        <Card className="mt-8 p-4">
          <div className="space-y-3">
            <label htmlFor="quick-note" className="text-sm font-medium text-gray-700">
              Quick Note
            </label>
            <textarea
              id="quick-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jot down your thoughts..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
        </Card>
      )}
      
      {/* Feedback */}
      {currentContent && currentSection && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <span className="text-sm text-gray-600">Was this helpful?</span>
          <div className="flex gap-2">
            <Button
              variant={sectionFeedback[currentSection] === 'positive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback(currentSection, 'positive')}
              className="gap-1"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant={sectionFeedback[currentSection] === 'neutral' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback(currentSection, 'neutral')}
              className="gap-1"
            >
              <Meh className="h-4 w-4" />
            </Button>
            <Button
              variant={sectionFeedback[currentSection] === 'negative' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFeedback(currentSection, 'negative')}
              className="gap-1"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
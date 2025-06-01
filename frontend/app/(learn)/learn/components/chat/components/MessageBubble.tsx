'use client';

import { Bot, User as UserIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MessageBubbleProps } from '../types';

const formatTimestamp = () => {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLastMessage = false,
  isLoading = false,
  showLatency = false,
  generationTime,
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        'flex gap-3 max-w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {isAssistant && (
        <Avatar className="h-8 w-8 border-2 border-blue-200 flex-shrink-0 shadow-sm">
          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Bot className="h-4 w-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'rounded-xl px-4 py-3 max-w-[85%] shadow-sm border transition-all duration-200',
          isUser
            ? 'bg-blue-600 text-white border-blue-600 ml-auto'
            : 'bg-white text-gray-900 border-gray-200 hover:shadow-md',
        )}
      >
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {isUser ? (
            <p className="mb-0 text-white whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <>
              {message.content ? (
                <div className="relative">
                  <ReactMarkdown className="text-gray-700">
                    {message.content}
                  </ReactMarkdown>
                  {isLoading && isLastMessage && (
                    <span className="inline-block w-0.5 h-4 bg-gray-600 animate-pulse ml-1" />
                  )}
                </div>
              ) : (
                isLoading &&
                isLastMessage && (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                )
              )}
            </>
          )}
        </div>
        <div
          className={cn(
            'text-xs mt-2 opacity-70',
            isUser ? 'text-blue-100' : 'text-gray-500',
          )}
        >
          {message.timestamp || formatTimestamp()}
          {showLatency && generationTime && isLastMessage && isAssistant && (
            <span className="ml-2">
              • Generated in {generationTime.toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 border-2 border-green-200 flex-shrink-0 shadow-sm">
          <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-blue-500">
            <UserIcon className="h-4 w-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

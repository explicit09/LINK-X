'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { StreamingProgress } from './StreamingProgress';
import { SuggestionList } from './SuggestionList';
import { Message, Suggestion } from '../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  showLatency: boolean;
  generationTime: number | null;
  suggestions: Suggestion[];
  showSuggestions: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  streamingContent,
  showLatency,
  generationTime,
  suggestions,
  showSuggestions,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            isLastMessage={index === messages.length - 1}
            isLoading={isLoading}
            showLatency={showLatency}
            generationTime={generationTime}
          />
        ))}

        <StreamingProgress
          isLoading={isLoading}
          streamingContent={streamingContent}
        />

        {showSuggestions && messages.length <= 1 && (
          <SuggestionList suggestions={suggestions} visible={showSuggestions} />
        )}
      </div>
      <div ref={messagesEndRef} />
    </ScrollArea>
  );
};

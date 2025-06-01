import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  X,
  Send,
  User,
  Bot,
  Maximize2,
  Minimize2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '../hooks/useChat';

interface AIChatProps {
  isChatOpen: boolean;
  isChatMinimized: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  isChatLoading: boolean;
  showChatSuggestions: boolean;
  chatGenerationTime: number | null;
  streamingChatContent: string;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  chatSuggestions: string[];
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  onToggleChat: () => void;
  onToggleChatMinimized: () => void;
  onUseSuggestion: (suggestion: string) => void;
}

export function AIChat({
  isChatOpen,
  isChatMinimized,
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  showChatSuggestions,
  chatGenerationTime,
  streamingChatContent,
  chatScrollRef,
  chatSuggestions,
  onSendMessage,
  onClearChat,
  onToggleChat,
  onToggleChatMinimized,
  onUseSuggestion,
}: AIChatProps) {
  if (!isChatOpen) {
    return (
      <Button
        onClick={onToggleChat}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
        size="lg"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        'fixed right-6 bg-white shadow-xl border border-gray-200 z-40 transition-all duration-300',
        isChatMinimized ? 'bottom-6 w-80 h-16' : 'bottom-6 w-96 h-[600px]',
      )}
    >
      {/* Chat Header */}
      <CardHeader className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                AI Learning Assistant
              </h3>
              {chatGenerationTime && (
                <div className="text-xs text-gray-500">
                  Last response: {chatGenerationTime}ms
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleChatMinimized}
              className="h-8 w-8 p-0"
            >
              {isChatMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleChat}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isChatMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(600px-80px)]">
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
            {chatMessages.length === 0 && showChatSuggestions ? (
              <div className="space-y-3">
                <div className="text-center text-gray-500 text-sm mb-4">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p>Hi! I'm your AI learning assistant.</p>
                  <p>Ask me anything about what you're studying!</p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    Suggested questions:
                  </div>
                  {chatSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => onUseSuggestion(suggestion)}
                      className="w-full text-left justify-start h-auto p-2 text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex space-x-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue-100">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        'max-w-[80%] p-3 rounded-lg text-sm',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900',
                      )}
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: message.content.replace(/\n/g, '<br />'),
                        }}
                      />
                      <div
                        className={cn(
                          'text-xs mt-1 opacity-70',
                          message.role === 'user'
                            ? 'text-blue-100'
                            : 'text-gray-500',
                        )}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-100">
                          <User className="h-4 w-4 text-gray-600" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {/* Streaming Message */}
                {streamingChatContent && (
                  <div className="flex space-x-3 justify-start">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-100">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[80%] p-3 rounded-lg text-sm bg-gray-100 text-gray-900">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: streamingChatContent.replace(/\n/g, '<br />'),
                        }}
                      />
                      <div className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                    </div>
                  </div>
                )}

                {isChatLoading && !streamingChatContent && (
                  <div className="flex space-x-3 justify-start">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-100">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg bg-gray-100">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {chatMessages.length > 0 && (
              <div className="flex justify-between items-center mb-3">
                <div className="text-xs text-gray-500">
                  {chatMessages.length} messages
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearChat}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}

            <div className="flex space-x-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendMessage(chatInput);
                  }
                }}
                placeholder="Ask me anything about this content..."
                className="flex-1 min-h-[2.5rem] max-h-20 resize-none"
                disabled={isChatLoading}
              />
              <Button
                onClick={() => onSendMessage(chatInput)}
                disabled={!chatInput.trim() || isChatLoading}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-xs text-gray-400 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

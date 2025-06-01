import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, ChevronRight, ArrowLeft } from 'lucide-react';
import { ChatMessage } from '../types/streaming.types';
import { BlinkingCursor } from './ui/BlinkingCursor';

interface AITutorChatProps {
  chatOpen: boolean;
  chatInput: string;
  chatMessages: ChatMessage[];
  unreadMessages: number;
  isStreaming: boolean;
  chatMessagesEndRef: React.RefObject<HTMLDivElement>;
  setChatOpen: (open: boolean) => void;
  setChatInput: (input: string) => void;
  handleChatSubmit: () => void;
  openChat: () => void;
}

export const AITutorChat = ({
  chatOpen,
  chatInput,
  chatMessages,
  unreadMessages,
  isStreaming,
  chatMessagesEndRef,
  setChatOpen,
  setChatInput,
  handleChatSubmit,
  openChat,
}: AITutorChatProps) => {
  return (
    <>
      {/* Floating AI Chat Badge */}
      {!chatOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={openChat}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg px-4 py-2 flex items-center space-x-2"
          >
            <Brain className="h-4 w-4" />
            <span className="font-medium">AI Tutor</span>
            {unreadMessages > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadMessages}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Floating AI Chat Panel */}
      {chatOpen && (
        <div className="fixed top-6 right-6 bottom-6 w-[420px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-purple-50 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">AI Tutor</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatOpen(false)}
              className="p-1 hover:bg-purple-100"
            >
              <ChevronRight className="h-4 w-4 text-purple-600" />
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <Brain className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <p className="font-medium">
                  Ask me anything about your lesson!
                </p>
                <p className="text-xs mt-1">
                  I can explain concepts, create quizzes, or help with
                  questions.
                </p>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-3 rounded-lg text-sm max-w-[85%] break-words',
                    message.role === 'user'
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-gray-100 text-gray-800',
                  )}
                >
                  {message.content ? (
                    <>
                      <span>{message.content}</span>
                      {isStreaming &&
                        message.role === 'ai' &&
                        index === chatMessages.length - 1 && <BlinkingCursor />}
                    </>
                  ) : (
                    isStreaming &&
                    message.role === 'ai' &&
                    index === chatMessages.length - 1 && (
                      <div className="flex items-center space-x-1">
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0s' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                    )
                  )}
                </div>
              ))
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && !isStreaming && handleChatSubmit()
                }
                placeholder={
                  isStreaming ? 'AI is thinking...' : 'Ask a question...'
                }
                disabled={isStreaming}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                size="sm"
                onClick={handleChatSubmit}
                disabled={isStreaming}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

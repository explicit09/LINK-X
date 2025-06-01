'use client';

import { useState, useCallback, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { Lightbulb, MessageSquare, FileText, HelpCircle } from 'lucide-react';

import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { useChatState } from './hooks/useChatState';
import { useChatApi } from './hooks/useChatApi';
import { Suggestion } from './types';

interface ChatContainerProps {
  fileId?: string;
  className?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  fileId,
  className,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const { state, updateState, addMessage, updateMessage } = useChatState();
  const auth = getAuth();
  const user = auth.currentUser;

  const { sendStreamingMessage, sendRegularMessage } = useChatApi({
    fileId,
    onChatIdReceived: (chatId) => {
      updateState({ chatId });
      if (user?.uid) {
        localStorage.setItem(`chatId_${user.uid}`, chatId);
      }
    },
    onTokenReceived: (token) => {
      updateState({ streamingContent: state.streamingContent + token });
    },
    onStreamComplete: (elapsed) => {
      updateState({
        generationTime: elapsed,
        showLatency: true,
      });
      setTimeout(() => updateState({ showLatency: false }), 3000);
    },
  });

  const handleSuggestionClick = useCallback((suggestionText: string) => {
    setInput(suggestionText);
    setShowSuggestions(false);
    handleSubmit(undefined, suggestionText);
  }, []);

  const getContextualSuggestions = useCallback((): Suggestion[] => {
    return [
      {
        id: 'explain',
        text: 'Explain key concepts',
        icon: Lightbulb,
        color:
          'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
        action: () =>
          handleSuggestionClick(
            'Can you explain the key concepts in this lesson in simple terms?',
          ),
      },
      {
        id: 'quiz',
        text: 'Create practice quiz',
        icon: MessageSquare,
        color:
          'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
        action: () =>
          handleSuggestionClick(
            'Generate a practice quiz with 5 questions based on this material',
          ),
      },
      {
        id: 'summary',
        text: 'Summarize lesson',
        icon: FileText,
        color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
        action: () =>
          handleSuggestionClick(
            'Please provide a comprehensive summary of the most important points',
          ),
      },
      {
        id: 'help',
        text: 'I need help',
        icon: HelpCircle,
        color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
        action: () =>
          handleSuggestionClick(
            "I'm having trouble understanding this. Can you help break it down step by step?",
          ),
      },
    ];
  }, [handleSuggestionClick]);

  const handleSubmit = async (e?: React.FormEvent, messageContent?: string) => {
    if (e) e.preventDefault();
    const content = messageContent || input.trim();
    if (!content) return;

    const newUserMessage = { role: 'user' as const, content };
    addMessage(newUserMessage);
    updateState({
      isLoading: true,
      streamingContent: '',
      generationTime: null,
      showLatency: false,
    });
    setShowSuggestions(false);

    const assistantId = Date.now().toString() + '-assistant';
    const optimisticAssistantMessage = {
      role: 'assistant' as const,
      content: '',
      id: assistantId,
    };
    addMessage(optimisticAssistantMessage);

    try {
      const result = await sendStreamingMessage(
        state.chatId,
        content,
        state.messages,
      );

      // Update the assistant message with the final content
      updateMessage(assistantId, result.content);

      if (result.chatId && !state.chatId) {
        updateState({ chatId: result.chatId });
        if (user?.uid) {
          localStorage.setItem(`chatId_${user.uid}`, result.chatId);
        }
      }

      if (result.elapsed) {
        updateState({
          generationTime: result.elapsed,
          showLatency: true,
        });
        setTimeout(() => updateState({ showLatency: false }), 3000);
      }

      setInput('');
    } catch (err) {
      console.error('Streaming error, falling back to regular endpoint:', err);

      // Remove the optimistic message
      updateState({
        messages: state.messages.filter((msg) => msg.id !== assistantId),
      });

      try {
        const result = await sendRegularMessage(
          state.chatId,
          content,
          state.messages,
        );

        addMessage({
          role: 'assistant',
          content: result.content,
        });

        if (result.chatId && !state.chatId && user?.uid) {
          updateState({ chatId: result.chatId });
          localStorage.setItem(`chatId_${user.uid}`, result.chatId);
        }

        setInput('');
      } catch (fallbackError) {
        console.error('Failed to call /ai-chat:', fallbackError);
        addMessage({
          role: 'assistant',
          content:
            "I'm sorry, I couldn't connect to the AI service. Please check your connection and try again.",
        });
      }
    } finally {
      updateState({ isLoading: false });
    }
  };

  useEffect(() => {
    setShowSuggestions(state.messages.length <= 1);
  }, [state.messages.length]);

  return (
    <div
      className={cn(
        'h-full bg-white flex flex-col transition-all duration-300 ease-in-out border-l border-gray-200',
        isMinimized ? 'h-16' : 'h-full',
        className,
      )}
    >
      <ChatHeader
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      {!isMinimized && (
        <>
          <MessageList
            messages={state.messages}
            isLoading={state.isLoading}
            streamingContent={state.streamingContent}
            showLatency={state.showLatency}
            generationTime={state.generationTime}
            suggestions={getContextualSuggestions()}
            showSuggestions={showSuggestions}
          />

          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={state.isLoading}
          />
        </>
      )}
    </div>
  );
};

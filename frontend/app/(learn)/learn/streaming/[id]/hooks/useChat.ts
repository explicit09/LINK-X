import { useState, useEffect, useRef } from 'react';
import { DocumentOutline } from './useDocumentOutline';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useChat(
  fileId: string | string[],
  outline: DocumentOutline | null,
  focusedSectionKey: string | null,
  streamingContent: Map<string, string>,
) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChatSuggestions, setShowChatSuggestions] = useState(true);
  const [chatGenerationTime, setChatGenerationTime] = useState<number | null>(
    null,
  );
  const [streamingChatContent, setStreamingChatContent] = useState('');

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, streamingChatContent]);

  // Chat suggestions
  const chatSuggestions = [
    'Explain this concept in simpler terms',
    'What are the key takeaways?',
    'Give me examples of this in practice',
    'How does this relate to previous concepts?',
    'Quiz me on this material',
    'What should I focus on most?',
  ];

  const sendChatMessage = async (message: string) => {
    if (!message.trim() || isChatLoading || !fileId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    setShowChatSuggestions(false);
    setStreamingChatContent('');

    const startTime = Date.now();

    try {
      // Get context from the focused section or all generated content
      let context = '';
      if (focusedSectionKey && streamingContent.has(focusedSectionKey)) {
        context = streamingContent.get(focusedSectionKey) || '';
      } else {
        // Use all generated content as context
        context = Array.from(streamingContent.values()).join('\n\n');
      }

      const response = await fetch(`http://localhost:8080/api/v2/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim(),
          context: context,
          file_id: fileId,
          conversation_history: chatMessages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        // Fallback to mock response for development
        const mockResponse = `I understand you're asking about: "${message.trim()}"

Based on the content you're studying, here's my response:

This is a mock AI response since the backend server isn't running. In production, this would be a personalized response based on:
- Your current learning progress
- The specific content you're studying
- Your conversation history
- Adaptive learning algorithms

The response would be streamed in real-time and tailored to your learning style and current understanding level.`;

        setStreamingChatContent(mockResponse);

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: mockResponse,
          timestamp: new Date(),
        };

        setChatMessages((prev) => [...prev, assistantMessage]);
        setChatGenerationTime(Date.now() - startTime);
        setStreamingChatContent('');
        setIsChatLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulatedContent += data.content;
                setStreamingChatContent(accumulatedContent);
              }
            } catch (error) {
              console.error('Error parsing chat SSE data:', error);
            }
          }
        }
      }

      // Create final assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: accumulatedContent,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
      setChatGenerationTime(Date.now() - startTime);
    } catch (error) {
      console.error('Error sending chat message:', error);

      // Error fallback message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setStreamingChatContent('');
      setIsChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setShowChatSuggestions(true);
    setChatGenerationTime(null);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const toggleChatMinimized = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  const useSuggestion = (suggestion: string) => {
    setChatInput(suggestion);
    setShowChatSuggestions(false);
  };

  return {
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
    sendChatMessage,
    clearChat,
    toggleChat,
    toggleChatMinimized,
    useSuggestion,
  };
}

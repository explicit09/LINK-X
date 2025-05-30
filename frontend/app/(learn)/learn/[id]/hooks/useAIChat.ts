import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/streaming.types';

export const useAIChat = (pfId: string | null) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    
    const newMessage = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, newMessage]);
    
    // Add empty AI message for streaming
    const aiMessage = { role: 'ai' as const, content: '' };
    setChatMessages(prev => [...prev, aiMessage]);
    
    const messageIndex = chatMessages.length + 1;
    setChatInput("");
    setIsStreaming(true);
    
    try {
      const response = await fetch('http://localhost:8080/ai-chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userMessage: chatInput,
          fileId: pfId,
          messages: chatMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })).slice(-10),
        }),
      });

      if (!response.ok) {
        throw new Error('Chat streaming failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        let buffer = '';
        let accumulatedContent = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              try {
                const data = JSON.parse(line.trim().slice(6));
                
                if (data.type === 'token') {
                  accumulatedContent += data.content;
                  
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[messageIndex]) {
                      newMessages[messageIndex] = {
                        ...newMessages[messageIndex],
                        content: accumulatedContent
                      };
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('Chat SSE parse error:', e);
              }
            }
          }
        }
        
        reader.releaseLock();
        setIsStreaming(false);
        
        if (!chatOpen) {
          setUnreadMessages(prev => prev + 1);
        }
      }
    } catch (error) {
      setIsStreaming(false);
      console.error('Chat streaming error:', error);
      setChatMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[messageIndex]) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: "I'm sorry, I couldn't connect to the AI service. Please try again."
          };
        }
        return newMessages;
      });
    }
  };

  const openChat = () => {
    setChatOpen(true);
    setUnreadMessages(0);
  };

  return {
    chatOpen,
    chatInput,
    chatMessages,
    unreadMessages,
    isStreaming,
    chatMessagesEndRef,
    setChatOpen,
    setChatInput,
    handleChatSubmit,
    openChat
  };
};
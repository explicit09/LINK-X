"use client";

import { useCallback } from "react";
import { getAuth } from "firebase/auth";
import { Message } from "../types";

interface UseChatApiOptions {
  fileId?: string;
  onChatIdReceived?: (chatId: string) => void;
  onTokenReceived?: (token: string) => void;
  onStreamComplete?: (elapsed: number) => void;
  onError?: (error: Error) => void;
}

export const useChatApi = (options: UseChatApiOptions = {}) => {
  const auth = getAuth();

  const sendStreamingMessage = useCallback(async (
    chatId: string | null,
    userMessage: string,
    messages: Message[]
  ): Promise<{ content: string; chatId?: string; elapsed?: number }> => {
    const requestBody: any = {
      id: chatId,
      userMessage,
      messages,
    };

    if (options.fileId) {
      requestBody.fileId = options.fileId;
    }

    try {
      const response = await fetch('http://localhost:8080/ai-chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Streaming failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let buffer = '';
      let accumulatedContent = '';
      let receivedChatId: string | undefined;
      let elapsed: number | undefined;
      
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
              
              if (data.type === 'metadata' && data.chatId) {
                receivedChatId = data.chatId;
                options.onChatIdReceived?.(data.chatId);
              } else if (data.type === 'token') {
                accumulatedContent += data.content;
                options.onTokenReceived?.(data.content);
              } else if (data.type === 'done') {
                elapsed = data.elapsed;
                options.onStreamComplete?.(data.elapsed);
              }
            } catch (e) {
              console.error('SSE parse error:', e);
            }
          }
        }
      }
      
      reader.releaseLock();
      
      return { 
        content: accumulatedContent, 
        chatId: receivedChatId,
        elapsed 
      };
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  }, [options]);

  const sendRegularMessage = useCallback(async (
    chatId: string | null,
    userMessage: string,
    messages: Message[]
  ): Promise<{ content: string; chatId?: string }> => {
    const requestBody: any = {
      id: chatId,
      userMessage,
      messages,
    };

    if (options.fileId) {
      requestBody.fileId = options.fileId;
    }
    
    const response = await fetch("http://localhost:8080/ai-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return {
      content: data.assistant,
      chatId: data.chatId
    };
  }, [options.fileId]);

  return {
    sendStreamingMessage,
    sendRegularMessage,
  };
};
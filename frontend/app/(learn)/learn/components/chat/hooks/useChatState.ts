"use client";

import { useState, useCallback, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Message, ChatState } from "../types";

const WELCOME_MESSAGE = `👋 **Welcome to your AI Learning Assistant!** 

I'm your personal tutor, ready to help you master this course material. Here's what I can do for you:

🎯 **Explain** complex concepts in your preferred learning style
📝 **Generate** practice quizzes and exercises
📚 **Summarize** key points and takeaways
💡 **Answer** specific questions about the content
🌟 **Provide** real-world examples and applications

✨ **Pro tip**: I remember our conversation, so feel free to ask follow-up questions!

What would you like to explore first?`;

export const useChatState = () => {
  const [state, setState] = useState<ChatState>({
    chatId: null,
    messages: [],
    isLoading: false,
    streamingContent: "",
    generationTime: null,
    showLatency: false,
  });

  const auth = getAuth();

  // Initialize chat from localStorage or create new
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      
      const localStorageKey = `chatId_${user.uid}`;
      const savedChatId = localStorage.getItem(localStorageKey);

      if (savedChatId) {
        try {
          const response = await fetch(`http://localhost:8080/student/chats/${savedChatId}/messages`, {
            method: "GET",
            credentials: "include",
          });
          const data = await response.json();
          
          if (data.error) {
            localStorage.removeItem(localStorageKey);
            setState(prev => ({
              ...prev,
              chatId: null,
              messages: [{ role: "assistant", content: WELCOME_MESSAGE }]
            }));
          } else {
            const formattedMessages = data.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            }));
            setState(prev => ({
              ...prev,
              chatId: savedChatId,
              messages: formattedMessages
            }));
          }
        } catch (err) {
          console.error("Error fetching messages:", err);
          setState(prev => ({
            ...prev,
            messages: [{ role: "assistant", content: WELCOME_MESSAGE }]
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          messages: [{ role: "assistant", content: WELCOME_MESSAGE }]
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const updateState = useCallback((updates: Partial<ChatState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const addMessage = useCallback((message: Message) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));
  }, []);

  const updateMessage = useCallback((messageId: string, content: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId ? { ...msg, content } : msg
      )
    }));
  }, []);

  const clearChat = useCallback(() => {
    const user = auth.currentUser;
    if (user) {
      localStorage.removeItem(`chatId_${user.uid}`);
    }
    setState({
      chatId: null,
      messages: [{ role: "assistant", content: WELCOME_MESSAGE }],
      isLoading: false,
      streamingContent: "",
      generationTime: null,
      showLatency: false,
    });
  }, []);

  return {
    state,
    updateState,
    addMessage,
    updateMessage,
    clearChat,
  };
};
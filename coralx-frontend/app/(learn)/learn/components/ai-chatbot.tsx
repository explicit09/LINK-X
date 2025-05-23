"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ChevronRight, Brain, Sparkles, Lightbulb, MessageSquare, FileText, HelpCircle } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  text: string;
  icon: any;
  action: () => void;
}

export default function AIChatbot({ fileId }: { fileId: string }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [width, setWidth] = useState(384);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const minWidth = 80;
  const maxWidth = 800;

  const auth = getAuth();
  const user = auth.currentUser;
  const firebaseUid = user?.uid;
  const userScopedKey = firebaseUid ? `chatId_${firebaseUid}` : null;
  const isDragging = useRef(false);

  // Quick suggestion buttons for common learning tasks
  const getContextualSuggestions = (): Suggestion[] => {
    return [
      {
        id: "explain",
        text: "Explain this concept",
        icon: Lightbulb,
        action: () => handleSuggestionClick("Can you explain the key concepts in this lesson?")
      },
      {
        id: "quiz",
        text: "Create practice quiz",
        icon: MessageSquare,
        action: () => handleSuggestionClick("Generate a practice quiz based on this material")
      },
      {
        id: "summary",
        text: "Summarize key points",
        icon: FileText,
        action: () => handleSuggestionClick("Please summarize the most important points")
      },
      {
        id: "help",
        text: "I need help understanding",
        icon: HelpCircle,
        action: () => handleSuggestionClick("I'm having trouble understanding this. Can you help break it down?")
      }
    ];
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setInput(suggestionText);
    setShowSuggestions(false);
    handleSubmit(undefined, suggestionText);
  };

  // Enhanced welcome message
  const getWelcomeMessage = () => {
    return "🧠 **Welcome to your AI Learning Assistant!** \n\nI'm here to help you understand this course material better. I can:\n\n• **Explain** complex concepts in simple terms\n• **Generate** practice quizzes and exercises\n• **Summarize** key points and takeaways\n• **Answer** specific questions about the content\n• **Provide** examples and real-world applications\n\nWhat would you like to explore first?";
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isMinimized]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    };
  
    const handleMouseUp = () => {
      isDragging.current = false;
    };
  
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const firebaseUid = user.uid;
      const localStorageKey = `chatId_${firebaseUid}`;
      const savedChatId = localStorage.getItem(localStorageKey);

      if (savedChatId) {
        setChatId(savedChatId);
        fetch(`http://localhost:8080/student/chats/${savedChatId}/messages`, {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              localStorage.removeItem(localStorageKey);
              setChatId(null);
              // Set welcome message for new chat
              setMessages([{ role: "assistant", content: getWelcomeMessage() }]);
            } else {
              const formattedMessages = data.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
              }));
              setMessages(formattedMessages);
              setShowSuggestions(formattedMessages.length <= 1);
            }
          })
          .catch((err) => {
            console.error("Error fetching messages:", err);
            setMessages([{ role: "assistant", content: getWelcomeMessage() }]);
          });
      } else {
        // New chat - show welcome message
        setMessages([{ role: "assistant", content: getWelcomeMessage() }]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e?: React.FormEvent, messageContent?: string) => {
    if (e) e.preventDefault();
    const content = messageContent || input.trim();
    if (!content) return;
  
    const newUserMessage = { role: "user", content };
    const updatedConversation = [...messages, newUserMessage];
    setMessages(updatedConversation);
    setIsLoading(true);
    setShowSuggestions(false);
  
    try {
      const requestBody: any = {
        id: chatId,
        userMessage: content,
        messages,
      };
  
      if (fileId) {
        requestBody.fileId = fileId;
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
        console.error("AI chat error:", data.error);
        const errorMessage = { role: "assistant", content: "I'm sorry, I encountered an error. Please try again." };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }
  
      const assistantMessage = { role: "assistant", content: data.assistant };
      setMessages((prev) => [...prev, assistantMessage]);
  
      if (data.chatId && !chatId && firebaseUid) {
        setChatId(data.chatId);
        localStorage.setItem(`chatId_${firebaseUid}`, data.chatId);
      }
  
      setInput("");
    } catch (err) {
      console.error("Failed to call /ai-chat:", err);
      const errorMessage = { role: "assistant", content: "I'm sorry, I couldn't connect to the AI service. Please check your connection and try again." };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div
      className="fixed top-0 right-0 h-screen z-40 bg-white border-l border-gray-200 shadow-lg"
      style={{ width: `${isMinimized ? 80 : width}px` }}
    >
      {/* Drag handle for resizing */}
      {!isMinimized && (
        <div
          onMouseDown={() => (isDragging.current = true)}
          className="absolute left-0 top-0 h-full w-2 cursor-col-resize bg-gray-300 opacity-0 hover:opacity-100 transition-opacity z-50"
        />
      )}
  
      <div className="flex flex-col h-full text-gray-900">
        {/* Enhanced Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 py-3 px-4 font-semibold flex items-center border-t border-gray-200 text-white">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:text-purple-200 transition-colors mr-3"
          >
            {isMinimized ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronRight size={18} className="rotate-180" />
            )}
          </button>
          
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <span className="text-sm font-medium">AI Learning Assistant</span>
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </div>
          )}

          {isMinimized && (
            <div className="flex items-center justify-center flex-1">
              <Brain className="h-5 w-5" />
            </div>
          )}
        </div>
  
        {/* Chat content */}
        {!isMinimized && (
          <>
            <div className="flex-grow overflow-auto p-4 space-y-4 bg-white">
              {messages.map((m, index) => (
                <div
                  key={index}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : "bg-gray-100 text-gray-800 border border-gray-200"
                    }`}
                  >
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {/* Quick Suggestions */}
              {showSuggestions && messages.length <= 1 && (
                <div className="space-y-3 mt-4">
                  <p className="text-xs text-gray-500 text-center mb-3">Quick actions to get started:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {getContextualSuggestions().map((suggestion) => {
                      const IconComponent = suggestion.icon;
                      return (
                        <Button
                          key={suggestion.id}
                          variant="outline"
                          size="sm"
                          onClick={suggestion.action}
                          className={cn(
                            "flex flex-col h-auto py-2 px-2 text-xs",
                            "hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-500 hover:text-white hover:border-transparent",
                            "transition-all duration-200"
                          )}
                        >
                          <IconComponent className="h-3 w-3 mb-1" />
                          <span className="leading-tight">{suggestion.text}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
  
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex space-x-1 bg-gray-100 text-gray-700 p-3 rounded-lg text-sm leading-relaxed animate-pulse border border-gray-200">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
  
              <div ref={messagesEndRef} />
            </div>
  
            {/* Enhanced Input form */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-gray-200 flex bg-white"
            >
              <input
                className="flex-grow bg-gray-100 text-gray-900 rounded-l-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this lesson..."
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className={cn(
                  "bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-r-lg transition-all duration-200",
                  "hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-2 focus:ring-purple-600"
                )}
              >
                <Send size={20} />
              </button>
            </form>

            {/* Status Footer */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Personalized AI
                  </Badge>
                </div>
                <span>Powered by your learning profile</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

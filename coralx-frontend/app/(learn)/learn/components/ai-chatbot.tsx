"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Brain, 
  Sparkles, 
  Lightbulb, 
  MessageSquare, 
  FileText, 
  HelpCircle,
  Minimize2,
  Maximize2,
  Bot,
  User as UserIcon,
  Zap,
  Clock,
  Star
} from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  text: string;
  icon: any;
  color: string;
  action: () => void;
}

export default function AIChatbot({ fileId }: { fileId: string }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;
  const firebaseUid = user?.uid;

  // Quick suggestion buttons for common learning tasks
  const getContextualSuggestions = (): Suggestion[] => {
    return [
      {
        id: "explain",
        text: "Explain key concepts",
        icon: Lightbulb,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
        action: () => handleSuggestionClick("Can you explain the key concepts in this lesson in simple terms?")
      },
      {
        id: "quiz",
        text: "Create practice quiz",
        icon: MessageSquare,
        color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
        action: () => handleSuggestionClick("Generate a practice quiz with 5 questions based on this material")
      },
      {
        id: "summary",
        text: "Summarize lesson",
        icon: FileText,
        color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
        action: () => handleSuggestionClick("Please provide a comprehensive summary of the most important points")
      },
      {
        id: "help",
        text: "I need help",
        icon: HelpCircle,
        color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
        action: () => handleSuggestionClick("I'm having trouble understanding this. Can you help break it down step by step?")
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
    return "👋 **Welcome to your AI Learning Assistant!** \n\nI'm your personal tutor, ready to help you master this course material. Here's what I can do for you:\n\n🎯 **Explain** complex concepts in your preferred learning style\n📝 **Generate** practice quizzes and exercises\n📚 **Summarize** key points and takeaways\n💡 **Answer** specific questions about the content\n🌟 **Provide** real-world examples and applications\n\n✨ **Pro tip**: I remember our conversation, so feel free to ask follow-up questions!\n\nWhat would you like to explore first?";
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isMinimized]);

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
        const errorMessage = { 
          role: "assistant", 
          content: "I'm sorry, I encountered an error. Please try again." 
        };
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
      const errorMessage = { 
        role: "assistant", 
        content: "I'm sorry, I couldn't connect to the AI service. Please check your connection and try again." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "h-full bg-white flex flex-col transition-all duration-300 ease-in-out border-l border-gray-200",
      isMinimized ? "h-16" : "h-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          {!isMinimized && (
            <div>
              <h3 className="canvas-heading-3">AI Tutor</h3>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="canvas-small text-green-600 font-medium">Online & Ready</span>
              </div>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(!isMinimized)}
          className="sidebar-text-muted hover:sidebar-text modern-hover"
        >
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3 max-w-full",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 border-2 border-blue-200 flex-shrink-0 shadow-sm">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600">
                        <Bot className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "rounded-xl px-4 py-3 max-w-[85%] shadow-sm border transition-all duration-200",
                      message.role === "user"
                        ? "bg-blue-600 text-white border-blue-600 ml-auto"
                        : "bg-white text-gray-900 border-gray-200 hover:shadow-md"
                    )}
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown 
                        components={{
                          p: ({children}) => (
                            <p className={cn(
                              "mb-2 last:mb-0",
                              message.role === "user" ? "text-white" : "canvas-body text-gray-700"
                            )}>
                              {children}
                            </p>
                          ),
                          strong: ({children}) => (
                            <strong className={cn(
                              "font-semibold",
                              message.role === "user" ? "text-white" : "text-gray-900"
                            )}>
                              {children}
                            </strong>
                          ),
                          code: ({children}) => (
                            <code className={cn(
                              "px-1 py-0.5 rounded text-sm font-mono",
                              message.role === "user" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-100 text-gray-800"
                            )}>
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    <div className={cn(
                      "text-xs mt-2 opacity-70",
                      message.role === "user" ? "text-blue-100" : "text-gray-500"
                    )}>
                      {formatTimestamp()}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 border-2 border-green-200 flex-shrink-0 shadow-sm">
                      <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-blue-500">
                        <UserIcon className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 border-2 border-blue-200 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600">
                      <Bot className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="canvas-small text-blue-600 font-medium">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Suggestions */}
              {showSuggestions && messages.length <= 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="canvas-small font-semibold text-gray-700">Quick Actions</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {getContextualSuggestions().map((suggestion) => {
                      const IconComponent = suggestion.icon;
                      return (
                        <Button
                          key={suggestion.id}
                          variant="outline"
                          size="sm"
                          onClick={suggestion.action}
                          className={cn(
                            "justify-start h-auto py-3 text-left transition-all duration-200 modern-hover",
                            suggestion.color
                          )}
                        >
                          <IconComponent className="h-4 w-4 mr-3 flex-shrink-0" />
                          <span className="canvas-small font-medium">{suggestion.text}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-gray-50/50 flex-shrink-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything about this lesson..."
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white canvas-body transition-all duration-200"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white rounded-md modern-hover"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Status indicator */}
              <div className="flex items-center justify-between canvas-small text-gray-500">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-3 w-3 text-purple-600" />
                  <span>Powered by AI • Context-aware</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Instant responses</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-600" />
                    <span className="text-yellow-600">Personalized</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

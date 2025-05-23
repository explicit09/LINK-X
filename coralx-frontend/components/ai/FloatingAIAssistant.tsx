"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  MessageSquare,
  X,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  BookOpen,
  FileText,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  type?: "text" | "suggestion" | "system";
}

interface Suggestion {
  id: string;
  text: string;
  icon: any;
  action: () => void;
}

interface FloatingAIAssistantProps {
  courseId?: string;
  courseName?: string;
  currentMaterial?: {
    id: string;
    title: string;
    type: string;
  };
}

export function FloatingAIAssistant({ 
  courseId, 
  courseName,
  currentMaterial 
}: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Welcome message and suggestions based on context
  const getContextualSuggestions = (): Suggestion[] => {
    const baseSuggestions = [
      {
        id: "explain",
        text: "Explain this concept",
        icon: Lightbulb,
        action: () => handleSuggestionClick("Can you explain this concept in simple terms?")
      },
      {
        id: "quiz",
        text: "Generate practice quiz",
        icon: MessageSquare,
        action: () => handleSuggestionClick("Create a practice quiz on this material")
      },
      {
        id: "summary",
        text: "Summarize key points",
        icon: FileText,
        action: () => handleSuggestionClick("Can you summarize the key points?")
      },
      {
        id: "help",
        text: "I need help understanding",
        icon: HelpCircle,
        action: () => handleSuggestionClick("I'm having trouble understanding this. Can you help?")
      }
    ];

    return baseSuggestions;
  };

  const getWelcomeMessage = () => {
    if (currentMaterial) {
      return `Hi! I'm your AI tutor. I can see you're working with "${currentMaterial.title}". How can I help you understand this better?`;
    }
    if (courseName) {
      return `Hi! I'm your AI tutor for ${courseName}. Ask me anything about the course materials, concepts, or get practice problems!`;
    }
    return "Hi! I'm your AI tutor. Ask me anything about your courses, upload materials for analysis, or get personalized study help!";
  };

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: getWelcomeMessage(),
        sender: "ai",
        timestamp: new Date(),
        type: "system"
      };
      setMessages([welcomeMessage]);
    }
  }, [courseName, currentMaterial]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setInputValue(suggestionText);
    handleSendMessage(suggestionText);
  };

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if (!content) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(content);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: "ai",
        timestamp: new Date(),
        type: "text"
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);

      // If chat is minimized, increase unread count
      if (isMinimized) {
        setUnreadCount(prev => prev + 1);
      }
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    // Simple response generation based on keywords
    const input = userInput.toLowerCase();
    
    if (input.includes("quiz") || input.includes("practice")) {
      return "I'd be happy to create a practice quiz for you! Based on the current material, I can generate questions covering the key concepts. Would you like multiple choice, short answer, or a mix of both?";
    }
    
    if (input.includes("explain") || input.includes("understand")) {
      return "I can definitely help explain that! Let me break this down into simpler terms with examples. Which specific part would you like me to focus on first?";
    }
    
    if (input.includes("summary") || input.includes("summarize")) {
      return "Here's a concise summary of the key points:\n\n• Main concept and definition\n• Key applications and examples\n• Important relationships to remember\n• Common misconceptions to avoid\n\nWould you like me to elaborate on any of these points?";
    }
    
    if (input.includes("help") || input.includes("stuck")) {
      return "I'm here to help! Learning can be challenging, but we'll work through this together. Can you tell me specifically what part is confusing? I can provide:\n\n• Step-by-step explanations\n• Visual analogies\n• Practice problems\n• Alternative explanations";
    }

    // Default response
    return "That's a great question! I can help you with that. Let me provide a detailed explanation with examples to make sure you understand the concept clearly. Would you like me to also suggest some practice problems to reinforce your learning?";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const minimizeChat = () => {
    setIsMinimized(true);
    setUnreadCount(0);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const suggestions = getContextualSuggestions();

  // Floating button when closed
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={openChat}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <div className="relative">
            <Brain className="h-6 w-6 text-white" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0 flex items-center justify-center"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
        </Button>
      </div>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-80 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <span className="font-medium">AI Tutor</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={() => setIsMinimized(false)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={closeChat}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Full chat interface
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 h-[500px] shadow-xl border-2 border-purple-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <CardTitle className="text-lg">AI Tutor</CardTitle>
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={minimizeChat}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={closeChat}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {courseName && (
            <p className="text-purple-100 text-sm">{courseName}</p>
          )}
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-[432px]">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      message.sender === "user"
                        ? "bg-blue-600 text-white"
                        : message.type === "system"
                        ? "bg-purple-50 text-purple-800 border border-purple-200"
                        : "bg-gray-100 text-gray-800"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={cn(
                      "text-xs mt-1 opacity-70",
                      message.sender === "user" ? "text-blue-100" : "text-gray-500"
                    )}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="p-4 border-t bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">Quick suggestions:</p>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 justify-start"
                    onClick={suggestion.action}
                  >
                    <suggestion.icon className="h-3 w-3 mr-1" />
                    {suggestion.text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button 
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
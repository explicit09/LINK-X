"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ChevronRight } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function AIChatbot() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const firebaseUid = user?.uid; // will be undefined if not logged in
  const userScopedKey = firebaseUid ? `chatId_${firebaseUid}` : null;



  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isMinimized]);

  useEffect(() => {
    const auth = getAuth();
  
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
  
      const firebaseUid = user.uid;
      const localStorageKey = `chatId_${firebaseUid}`;
      const savedChatId = localStorage.getItem(localStorageKey);
  
      if (savedChatId) {
        setChatId(savedChatId);
  
        fetch(`http://localhost:8080/messages/${savedChatId}`, {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              localStorage.removeItem(localStorageKey);
              setChatId(null);
              setMessages([]);
            } else {
              const formattedMessages = data.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
              }));
              setMessages(formattedMessages);
            }
          })
          .catch((err) => console.error("Error fetching messages:", err));
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
  
    const newUserMessage = { role: "user", content: input };
    const updatedConversation = [...messages, newUserMessage];
    setMessages(updatedConversation);
    setIsLoading(true);
  
    try {
      const response = await fetch("http://localhost:8080/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: chatId, // May be null on first run
          userMessage: input,
          messages: messages, // Only prior history, not including the new message yet
        }),
      });
  
      const data = await response.json();
  
      if (data.error) {
        console.error("AI chat error:", data.error);
        return;
      }
  
      const assistantMessage = { role: "assistant", content: data.assistant };
  
      // 🔄 Update state with assistant reply
      setMessages((prev) => [...prev, assistantMessage]);
  
      // 🔄 Set chatId if it was just created
      if (data.chatId && !chatId && firebaseUid) {
        setChatId(data.chatId);
        localStorage.setItem(`chatId_${firebaseUid}`, data.chatId);
      }
      
      setInput("");
    } catch (err) {
      console.error("Failed to call /ai-chat:", err);
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="flex flex-col h-full text-foreground bg-background border-l border-border shadow-lg">
      <div
        className={`flex flex-col h-full transition-all duration-300 ease-in-out ${
          isMinimized ? "w-20" : "w-96"
        }`}
      >
        <div className="relative bg-card py-2 px-4 font-semibold flex items-center border-t border-border">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMinimized ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronRight size={18} className="rotate-180" />
            )}
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-sm">
            {isMinimized ? "AI" : "AI Assistant"}
          </span>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-grow overflow-auto p-4 space-y-4 bg-background">
              {messages.map((m, index) => (
                <div
                  key={index}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] p-3 rounded-lg text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-blue-accent text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Typing bubble */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex space-x-1 bg-muted text-muted-foreground p-3 rounded-lg text-sm leading-relaxed animate-pulse">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-border flex bg-card"
            >
              <input
                className="flex-grow bg-muted text-foreground rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-accent"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
              />
              <button
                type="submit"
                aria-label="Send message"
                className="bg-blue-accent text-white p-2 rounded-r-lg hover:bg-blue-accent-hover transition-colors duration-200"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

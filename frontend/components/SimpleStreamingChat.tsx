'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SimpleStreamingChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Add empty assistant message
    const assistantMessage = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(true);

    try {
      const response = await fetch('http://localhost:8080/ai-chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userMessage: input,
          messages: messages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'token') {
                  // Update last message content
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      lastMsg.content += data.content;
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {msg.content}
                {isStreaming &&
                  msg.role === 'assistant' &&
                  i === messages.length - 1 && (
                    <span className="inline-block w-0.5 h-4 bg-gray-600 animate-pulse ml-1" />
                  )}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            disabled={isStreaming}
          />
          <Button onClick={sendMessage} disabled={isStreaming}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

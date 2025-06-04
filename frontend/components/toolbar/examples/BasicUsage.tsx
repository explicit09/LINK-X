/**
 * Example usage of the refactored Toolbar component
 */

import { useState } from 'react';
import type { Message } from 'ai';
import { Toolbar } from '../Toolbar';

export const BasicToolbarExample = () => {
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const append = async (message: Message) => {
    console.log('Appending message:', message);
    setMessages((prev) => [...prev, message]);
    return message.id;
  };

  const stop = () => {
    console.log('Stopping generation');
    setIsLoading(false);
  };

  return (
    <div className="relative h-screen">
      <button
        onClick={() => setIsLoading(!isLoading)}
        className="p-2 bg-blue-500 text-white rounded"
      >
        Toggle Loading
      </button>

      <Toolbar
        isToolbarVisible={isToolbarVisible}
        setIsToolbarVisible={setIsToolbarVisible}
        isLoading={isLoading}
        append={append}
        stop={stop}
        setMessages={setMessages}
        blockKind="text"
      />
    </div>
  );
};

/**
 * AI Chatbot Component - Compatibility Wrapper
 *
 * This file maintains backward compatibility with the original ai-chatbot.tsx interface
 * while using the new modular chat implementation.
 *
 * The original implementation has been refactored into:
 * - ./chat/ChatContainer.tsx - Main container component
 * - ./chat/components/* - Individual UI components
 * - ./chat/hooks/* - Business logic hooks
 * - ./chat/types.ts - TypeScript type definitions
 *
 * Original file backed up at: ai-chatbot.tsx.backup
 */

'use client';

import { ChatContainer } from './chat';

interface AIChatbotProps {
  fileId: string;
}

/**
 * Legacy AI Chatbot component
 * Maintains the original interface for backward compatibility
 */
export default function AIChatbot({ fileId }: AIChatbotProps) {
  return <ChatContainer fileId={fileId} />;
}

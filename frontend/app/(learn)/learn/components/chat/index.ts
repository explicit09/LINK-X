// Main chat exports
export { ChatContainer } from './ChatContainer';

// Component exports
export { ChatHeader } from './components/ChatHeader';
export { ChatInput } from './components/ChatInput';
export { MessageBubble } from './components/MessageBubble';
export { MessageList } from './components/MessageList';
export { StreamingProgress } from './components/StreamingProgress';
export { SuggestionList } from './components/SuggestionList';

// Hook exports
export { useChatState } from './hooks/useChatState';
export { useChatApi } from './hooks/useChatApi';

// Type exports
export type {
  Message,
  ChatState,
  Suggestion,
  ChatInputProps,
  MessageBubbleProps,
  ChatHeaderProps,
  SuggestionListProps,
  ChatContextType,
} from './types';
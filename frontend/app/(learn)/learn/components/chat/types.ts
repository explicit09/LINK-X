// Chat-related type definitions
import { LucideIcon } from "lucide-react";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
  timestamp?: string;
}

export interface ChatState {
  chatId: string | null;
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  generationTime: number | null;
  showLatency: boolean;
}

export interface Suggestion {
  id: string;
  text: string;
  icon: LucideIcon;
  color: string;
  action: () => void;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  placeholder?: string;
}

export interface MessageBubbleProps {
  message: Message;
  isLastMessage?: boolean;
  isLoading?: boolean;
  showLatency?: boolean;
  generationTime?: number | null;
}

export interface ChatHeaderProps {
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export interface SuggestionListProps {
  suggestions: Suggestion[];
  visible: boolean;
}

export interface ChatContextType {
  chatId: string | null;
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  generationTime: number | null;
  showLatency: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}
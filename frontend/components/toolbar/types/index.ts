import type { ChatRequestOptions, CreateMessage, Message } from 'ai';
import type { Dispatch, SetStateAction } from 'react';
import type { BlockKind } from '@/components/block';

export type ToolType =
  | 'final-polish'
  | 'request-suggestions'
  | 'adjust-reading-level'
  | 'code-review'
  | 'add-comments'
  | 'add-logs';

export interface ToolDefinition {
  type: ToolType;
  description: string;
  icon: JSX.Element;
}

export interface ToolProps {
  type: ToolType;
  description: string;
  icon: JSX.Element;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isToolbarVisible?: boolean;
  setIsToolbarVisible?: Dispatch<SetStateAction<boolean>>;
  isAnimating: boolean;
  append: AppendMessage;
}

export type AppendMessage = (
  message: Message | CreateMessage,
  chatRequestOptions?: ChatRequestOptions,
) => Promise<string | null | undefined>;

export interface ToolsProps {
  isToolbarVisible: boolean;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  append: AppendMessage;
  isAnimating: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  blockKind: 'text' | 'code';
}

export interface ReadingLevelSelectorProps {
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  append: AppendMessage;
  isAnimating: boolean;
}

export interface ToolbarProps {
  isToolbarVisible: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
  append: AppendMessage;
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  blockKind: 'text' | 'code';
}

export interface ToolbarContainerProps {
  isToolbarVisible: boolean;
  isLoading: boolean;
  selectedTool: string | null;
  blockKind: BlockKind;
  children: React.ReactNode;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onAnimationStart: () => void;
  onAnimationComplete: () => void;
  toolbarRef: React.RefObject<HTMLDivElement>;
}

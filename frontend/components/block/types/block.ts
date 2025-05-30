/**
 * Block component types
 */

import type { Attachment, ChatRequestOptions, CreateMessage, Message } from 'ai';
import type { Document, Suggestion, Vote } from '@/lib/db/schema';

export type BlockKind = 'text' | 'code';

export interface UIBlock {
  title: string;
  documentId: string;
  kind: BlockKind;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface ConsoleOutput {
  id: string;
  type: 'stdout' | 'stderr';
  content: string;
}

export interface BlockProps {
  chatId: string;
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (
    event?: { preventDefault?: () => void },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  messages: Array<Message>;
  setMessages: React.Dispatch<React.SetStateAction<Array<Message>>>;
  votes: Array<Vote> | undefined;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
}

export interface BlockState {
  mode: 'edit' | 'diff';
  document: Document | null;
  currentVersionIndex: number;
  consoleOutputs: Array<ConsoleOutput>;
  isContentDirty: boolean;
  isToolbarVisible: boolean;
}

export interface BlockActions {
  setMode: (mode: 'edit' | 'diff') => void;
  setDocument: (document: Document | null) => void;
  setCurrentVersionIndex: (index: number) => void;
  setConsoleOutputs: (outputs: Array<ConsoleOutput>) => void;
  setIsContentDirty: (dirty: boolean) => void;
  setIsToolbarVisible: (visible: boolean) => void;
  handleContentChange: (content: string) => void;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  saveContent: () => void;
  getDocumentContentById: (index: number) => string;
}
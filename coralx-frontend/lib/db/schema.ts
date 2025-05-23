// Temporary schema definitions to satisfy imports

export interface Vote {
  id: string;
  messageId: string;
  isUpvoted: boolean;
  userId?: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
  chatId: string;
}

export interface Chat {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  visibility?: 'private' | 'public';
  messages?: Message[];
}

export interface Suggestion {
  id: string;
  documentId: string;
  originalText: string;
  suggestedText: string;
  description?: string;
  createdAt: Date;
  isResolved?: boolean;
}

export interface Document {
  id: string;
  title: string;
  content?: string;
  kind?: 'text' | 'code';
  userId: string;
  createdAt: Date;
}

export {} // ensure this file is treated as a module 
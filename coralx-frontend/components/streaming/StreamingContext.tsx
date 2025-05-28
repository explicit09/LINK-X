"use client";

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { DocumentOutline, StreamingMessage } from '@/lib/api/streaming';

// Types
export interface StreamingSection {
  id: string;
  content: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  error?: string;
}

export interface StreamingState {
  outline: DocumentOutline | null;
  sections: Map<string, StreamingSection>;
  activeSectionId: string | null;
  isLoading: boolean;
  error: string | null;
}

type StreamingAction =
  | { type: 'SET_OUTLINE'; payload: DocumentOutline }
  | { type: 'SET_ACTIVE_SECTION'; payload: string | null }
  | { type: 'START_STREAMING'; payload: string }
  | { type: 'UPDATE_SECTION_CONTENT'; payload: { id: string; content: string } }
  | { type: 'COMPLETE_SECTION'; payload: string }
  | { type: 'ERROR_SECTION'; payload: { id: string; error: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

// Initial state
const initialState: StreamingState = {
  outline: null,
  sections: new Map(),
  activeSectionId: null,
  isLoading: false,
  error: null,
};

// Reducer
function streamingReducer(state: StreamingState, action: StreamingAction): StreamingState {
  switch (action.type) {
    case 'SET_OUTLINE':
      return {
        ...state,
        outline: action.payload,
        error: null,
      };
      
    case 'SET_ACTIVE_SECTION':
      return {
        ...state,
        activeSectionId: action.payload,
      };
      
    case 'START_STREAMING': {
      const newSections = new Map(state.sections);
      newSections.set(action.payload, {
        id: action.payload,
        content: '',
        status: 'streaming',
      });
      return {
        ...state,
        sections: newSections,
      };
    }
    
    case 'UPDATE_SECTION_CONTENT': {
      const newSections = new Map(state.sections);
      const section = newSections.get(action.payload.id);
      if (section) {
        newSections.set(action.payload.id, {
          ...section,
          content: section.content + action.payload.content,
        });
      }
      return {
        ...state,
        sections: newSections,
      };
    }
    
    case 'COMPLETE_SECTION': {
      const newSections = new Map(state.sections);
      const section = newSections.get(action.payload);
      if (section) {
        newSections.set(action.payload, {
          ...section,
          status: 'complete',
        });
      }
      return {
        ...state,
        sections: newSections,
      };
    }
    
    case 'ERROR_SECTION': {
      const newSections = new Map(state.sections);
      const section = newSections.get(action.payload.id);
      if (section) {
        newSections.set(action.payload.id, {
          ...section,
          status: 'error',
          error: action.payload.error,
        });
      }
      return {
        ...state,
        sections: newSections,
      };
    }
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
      
    case 'RESET':
      return initialState;
      
    default:
      return state;
  }
}

// Context
interface StreamingContextValue {
  state: StreamingState;
  dispatch: React.Dispatch<StreamingAction>;
  
  // Helper functions
  setOutline: (outline: DocumentOutline) => void;
  setActiveSection: (sectionId: string | null) => void;
  startStreaming: (sectionId: string) => void;
  updateSectionContent: (sectionId: string, content: string) => void;
  completeSection: (sectionId: string) => void;
  handleStreamingMessage: (sectionId: string, message: StreamingMessage) => void;
  reset: () => void;
}

const StreamingContext = createContext<StreamingContextValue | null>(null);

// Provider
interface StreamingProviderProps {
  children: ReactNode;
}

export function StreamingProvider({ children }: StreamingProviderProps) {
  const [state, dispatch] = useReducer(streamingReducer, initialState);
  
  // Helper functions
  const setOutline = useCallback((outline: DocumentOutline) => {
    dispatch({ type: 'SET_OUTLINE', payload: outline });
  }, []);
  
  const setActiveSection = useCallback((sectionId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SECTION', payload: sectionId });
  }, []);
  
  const startStreaming = useCallback((sectionId: string) => {
    dispatch({ type: 'START_STREAMING', payload: sectionId });
  }, []);
  
  const updateSectionContent = useCallback((sectionId: string, content: string) => {
    dispatch({ type: 'UPDATE_SECTION_CONTENT', payload: { id: sectionId, content } });
  }, []);
  
  const completeSection = useCallback((sectionId: string) => {
    dispatch({ type: 'COMPLETE_SECTION', payload: sectionId });
  }, []);
  
  const handleStreamingMessage = useCallback((sectionId: string, message: StreamingMessage) => {
    switch (message.type) {
      case 'content':
      case 'section':
        updateSectionContent(sectionId, message.data || '');
        break;
      case 'complete':
        completeSection(sectionId);
        break;
      case 'error':
        dispatch({ 
          type: 'ERROR_SECTION', 
          payload: { id: sectionId, error: message.message || 'Unknown error' } 
        });
        break;
    }
  }, [updateSectionContent, completeSection]);
  
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);
  
  const value: StreamingContextValue = {
    state,
    dispatch,
    setOutline,
    setActiveSection,
    startStreaming,
    updateSectionContent,
    completeSection,
    handleStreamingMessage,
    reset,
  };
  
  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  );
}

// Hook
export function useStreaming() {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreaming must be used within StreamingProvider');
  }
  return context;
}
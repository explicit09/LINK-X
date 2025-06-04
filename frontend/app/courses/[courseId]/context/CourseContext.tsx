'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  Course,
  Module,
  CourseProgress,
  AIConversation,
  Quiz,
  Material,
} from '../types/course.types';

// State Types
export interface CourseState {
  course: Course | null;
  modules: Module[];
  courseProgress: CourseProgress;
  conversations: AIConversation[];
  quizzes: Quiz[];
  loading: boolean;
  error: string | null;
  currentUser: any;
  // UI State
  activeTab: string;
  selectedFiles: Set<string>;
  searchQuery: string;
  filters: {
    fileTypes: string[];
    aiProcessed: 'all' | 'processed' | 'unprocessed';
    dateRange: 'all' | 'today' | 'week' | 'month';
  };
}

// Action Types
export type CourseAction =
  | { type: 'SET_COURSE'; payload: Course }
  | { type: 'SET_MODULES'; payload: Module[] }
  | {
      type: 'UPDATE_MODULE';
      payload: { moduleId: string; data: Partial<Module> };
    }
  | { type: 'DELETE_MODULE'; payload: string }
  | { type: 'ADD_MODULE'; payload: Module }
  | { type: 'TOGGLE_MODULE'; payload: string }
  | { type: 'ADD_MATERIAL'; payload: { moduleId: string; material: Material } }
  | {
      type: 'DELETE_MATERIAL';
      payload: { moduleId: string; materialId: string };
    }
  | { type: 'UPDATE_PROGRESS'; payload: CourseProgress }
  | { type: 'SET_CONVERSATIONS'; payload: AIConversation[] }
  | { type: 'SET_QUIZZES'; payload: Quiz[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'TOGGLE_FILE_SELECTION'; payload: string }
  | { type: 'CLEAR_FILE_SELECTION' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<CourseState['filters']> };

// Initial State
const initialState: CourseState = {
  course: null,
  modules: [],
  courseProgress: {
    completedMaterials: 0,
    totalMaterials: 0,
    weeklyTimeMinutes: 0,
    todayTimeMinutes: 0,
    progressPercentage: 0,
  },
  conversations: [],
  quizzes: [],
  loading: true,
  error: null,
  currentUser: null,
  activeTab: 'home',
  selectedFiles: new Set(),
  searchQuery: '',
  filters: {
    fileTypes: [],
    aiProcessed: 'all',
    dateRange: 'all',
  },
};

// Reducer
const courseReducer = (
  state: CourseState,
  action: CourseAction,
): CourseState => {
  switch (action.type) {
    case 'SET_COURSE':
      return { ...state, course: action.payload };

    case 'SET_MODULES':
      return { ...state, modules: action.payload };

    case 'UPDATE_MODULE':
      return {
        ...state,
        modules: state.modules.map((module) =>
          module.id === action.payload.moduleId
            ? { ...module, ...action.payload.data }
            : module,
        ),
      };

    case 'DELETE_MODULE':
      return {
        ...state,
        modules: state.modules.filter((module) => module.id !== action.payload),
      };

    case 'ADD_MODULE':
      return {
        ...state,
        modules: [...state.modules, action.payload],
      };

    case 'TOGGLE_MODULE':
      return {
        ...state,
        modules: state.modules.map((module) =>
          module.id === action.payload
            ? { ...module, isExpanded: !module.isExpanded }
            : module,
        ),
      };

    case 'ADD_MATERIAL':
      return {
        ...state,
        modules: state.modules.map((module) =>
          module.id === action.payload.moduleId
            ? {
                ...module,
                materials: [...module.materials, action.payload.material],
              }
            : module,
        ),
      };

    case 'DELETE_MATERIAL':
      return {
        ...state,
        modules: state.modules.map((module) =>
          module.id === action.payload.moduleId
            ? {
                ...module,
                materials: module.materials.filter(
                  (m) => m.id !== action.payload.materialId,
                ),
              }
            : module,
        ),
      };

    case 'UPDATE_PROGRESS':
      return { ...state, courseProgress: action.payload };

    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'SET_QUIZZES':
      return { ...state, quizzes: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_USER':
      return { ...state, currentUser: action.payload };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };

    case 'TOGGLE_FILE_SELECTION':
      const newSelection = new Set(state.selectedFiles);
      if (newSelection.has(action.payload)) {
        newSelection.delete(action.payload);
      } else {
        newSelection.add(action.payload);
      }
      return { ...state, selectedFiles: newSelection };

    case 'CLEAR_FILE_SELECTION':
      return { ...state, selectedFiles: new Set() };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    default:
      return state;
  }
};

// Context
interface CourseContextType {
  state: CourseState;
  dispatch: React.Dispatch<CourseAction>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

// Provider
export const CourseProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(courseReducer, initialState);

  return (
    <CourseContext.Provider value={{ state, dispatch }}>
      {children}
    </CourseContext.Provider>
  );
};

// Custom Hook
export const useCourseContext = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourseContext must be used within a CourseProvider');
  }
  return context;
};

// Action Creators (for convenience)
export const courseActions = {
  setCourse: (course: Course): CourseAction => ({
    type: 'SET_COURSE',
    payload: course,
  }),
  setModules: (modules: Module[]): CourseAction => ({
    type: 'SET_MODULES',
    payload: modules,
  }),
  updateModule: (moduleId: string, data: Partial<Module>): CourseAction => ({
    type: 'UPDATE_MODULE',
    payload: { moduleId, data },
  }),
  deleteModule: (moduleId: string): CourseAction => ({
    type: 'DELETE_MODULE',
    payload: moduleId,
  }),
  addModule: (module: Module): CourseAction => ({
    type: 'ADD_MODULE',
    payload: module,
  }),
  toggleModule: (moduleId: string): CourseAction => ({
    type: 'TOGGLE_MODULE',
    payload: moduleId,
  }),
  addMaterial: (moduleId: string, material: Material): CourseAction => ({
    type: 'ADD_MATERIAL',
    payload: { moduleId, material },
  }),
  deleteMaterial: (moduleId: string, materialId: string): CourseAction => ({
    type: 'DELETE_MATERIAL',
    payload: { moduleId, materialId },
  }),
  updateProgress: (progress: CourseProgress): CourseAction => ({
    type: 'UPDATE_PROGRESS',
    payload: progress,
  }),
  setConversations: (conversations: AIConversation[]): CourseAction => ({
    type: 'SET_CONVERSATIONS',
    payload: conversations,
  }),
  setQuizzes: (quizzes: Quiz[]): CourseAction => ({
    type: 'SET_QUIZZES',
    payload: quizzes,
  }),
  setLoading: (loading: boolean): CourseAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),
  setError: (error: string | null): CourseAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),
  setUser: (user: any): CourseAction => ({ type: 'SET_USER', payload: user }),
  setActiveTab: (tab: string): CourseAction => ({
    type: 'SET_ACTIVE_TAB',
    payload: tab,
  }),
  toggleFileSelection: (fileId: string): CourseAction => ({
    type: 'TOGGLE_FILE_SELECTION',
    payload: fileId,
  }),
  clearFileSelection: (): CourseAction => ({ type: 'CLEAR_FILE_SELECTION' }),
  setSearchQuery: (query: string): CourseAction => ({
    type: 'SET_SEARCH_QUERY',
    payload: query,
  }),
  setFilters: (filters: Partial<CourseState['filters']>): CourseAction => ({
    type: 'SET_FILTERS',
    payload: filters,
  }),
};

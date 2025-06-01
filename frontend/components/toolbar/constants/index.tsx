import {
  PenIcon,
  SummarizeIcon,
  MessageIcon,
  CodeIcon,
  LogsIcon,
} from '@/components/icons';
import type { ToolDefinition } from '../types';
import type { BlockKind } from '@/components/block';

export const READING_LEVELS = [
  'Elementary',
  'Middle School',
  'Keep current level',
  'High School',
  'College',
  'Graduate',
] as const;

export const DEFAULT_READING_LEVEL = 2;

export const TOOLBAR_CLOSE_DELAY = 2000;

export const TOOL_MESSAGES: Record<string, string> = {
  'final-polish':
    'Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.',
  'request-suggestions':
    'Please add suggestions you have that could improve the writing.',
  'add-comments': 'Please add comments to explain the code.',
  'add-logs': 'Please add logs to help debug the code.',
};

export const TOOLS_BY_BLOCK_KIND: Record<BlockKind, ToolDefinition[]> = {
  text: [
    {
      type: 'final-polish',
      description: 'Add final polish',
      icon: <PenIcon />,
    },
    {
      type: 'adjust-reading-level',
      description: 'Adjust reading level',
      icon: <SummarizeIcon />,
    },
    {
      type: 'request-suggestions',
      description: 'Request suggestions',
      icon: <MessageIcon />,
    },
  ],
  code: [
    {
      type: 'add-comments',
      description: 'Add comments',
      icon: <CodeIcon />,
    },
    {
      type: 'add-logs',
      description: 'Add logs',
      icon: <LogsIcon />,
    },
  ],
};

// Animation constants
export const TOOL_ANIMATION = {
  initial: { scale: 1, opacity: 0 },
  animate: { opacity: 1, transition: { delay: 0.1 } },
  whileHover: { scale: 1.1 },
  whileTap: { scale: 0.95 },
  exit: {
    scale: 0.9,
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

export const TOOLBAR_ANIMATION = {
  initial: { opacity: 0, y: -20, scale: 1 },
  exit: { opacity: 0, y: -20, transition: { duration: 0.1 } },
  transition: { type: 'spring', stiffness: 300, damping: 25 },
};

export const READING_LEVEL_DRAG_CONSTRAINTS = 5 * 40 + 2;
export const READING_LEVEL_Y_OFFSET = -40 * 2;

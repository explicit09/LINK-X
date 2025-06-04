/**
 * @deprecated This file has been refactored into modular components.
 * Please use the new modular version from './stats/StatsSidePanel' instead.
 * This file remains as a compatibility wrapper.
 */

'use client';

import { StatsSidePanel as ModularStatsSidePanel } from './stats';

// Re-export the types for backward compatibility
export type {
  Course,
  CourseProgress,
  TodoItem,
  StatsSidePanelProps,
} from './stats';

// Export the modular component as the default
export const StatsSidePanel = ModularStatsSidePanel;

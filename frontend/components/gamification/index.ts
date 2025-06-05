// Gamification Components
export { XPBar } from './XPBar';
export { XPAnimationOverlay } from './XPAnimationOverlay';
export { StreakTracker } from './StreakTracker';
export { WeeklyGoals } from './WeeklyGoals';
export { GamificationDashboard } from './GamificationDashboard';
export { GamificationWidget } from './GamificationWidget';

// Re-export context and hooks
export { 
  GamificationProvider, 
  useGamification,
  withXPTracking,
  XP_ACTIONS,
  type XPActionType 
} from '@/contexts/GamificationContext';

export {
  useXPTracking,
  useFileViewXP,
  useChatMessageXP,
  useTodoCompleteXP,
  useModuleCompleteXP,
  useVideoWatchXP
} from '@/hooks/useXPTracking';
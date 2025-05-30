/**
 * Form options and constants for onboarding
 */

export const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', description: 'Learn best with diagrams, charts, and visual aids' },
  { value: 'auditory', label: 'Auditory', description: 'Learn best through listening and discussion' },
  { value: 'kinesthetic', label: 'Hands-on', description: 'Learn best through practice and experimentation' },
  { value: 'reading', label: 'Reading/Writing', description: 'Learn best through text and written materials' }
];

export const DEPTH_OPTIONS = [
  { value: 'surface', label: 'Quick Overview' },
  { value: 'moderate', label: 'Balanced Detail' },
  { value: 'deep', label: 'Comprehensive Deep-dive' }
];

export const SCHEDULE_OPTIONS = [
  { value: 'flexible', label: 'Flexible (Learn as I go)' },
  { value: 'structured', label: 'Structured (Set schedule)' },
  { value: 'intensive', label: 'Intensive (Dedicated blocks)' }
];

export const TONE_OPTIONS = [
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'professional', label: 'Professional & Direct' },
  { value: 'encouraging', label: 'Encouraging & Supportive' },
  { value: 'challenging', label: 'Challenging & Rigorous' }
];

export const TOPIC_SUGGESTIONS = [
  'Programming', 'Data Science', 'Business', 'Design', 'Marketing'
];

export const INTEREST_SUGGESTIONS = [
  'Reading', 'Technology', 'Music', 'Sports', 'Travel', 'Cooking', 'Art', 'Gaming'
];

export const STEP_ICONS = {
  1: 'User',
  2: 'BookOpen', 
  3: 'Target',
  4: 'Heart'
} as const;

export const STEP_COLORS = {
  1: 'from-blue-600 to-purple-600',
  2: 'from-purple-600 to-pink-600',
  3: 'from-pink-600 to-red-600', 
  4: 'from-red-600 to-orange-600'
} as const;

export const STEP_TITLES = {
  1: 'Who You Are',
  2: 'How You Learn',
  3: 'What You Want',
  4: 'Your Interests'
} as const;

export const STEP_DESCRIPTIONS = {
  1: "Let's start with the basics",
  2: 'Choose your preferred learning approach',
  3: 'Set your learning preferences',
  4: 'Tell us about your interests'
} as const;
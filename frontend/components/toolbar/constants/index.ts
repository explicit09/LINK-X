// Toolbar constants
export const TOOLBAR_HEIGHT = 64;
export const TOOLBAR_MOBILE_HEIGHT = 56;

export const TOOLBAR_VARIANTS = {
  default: 'default',
  transparent: 'transparent',
  blur: 'blur',
} as const;

export type ToolbarVariant = typeof TOOLBAR_VARIANTS[keyof typeof TOOLBAR_VARIANTS];
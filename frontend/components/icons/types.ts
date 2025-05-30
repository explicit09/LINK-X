/**
 * Common types and utilities for all icon components
 */

export interface IconProps {
  /** Size of the icon (width and height) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Accessibility label */
  "aria-label"?: string;
  /** Additional props for the SVG element */
  [key: string]: any;
}

export const defaultIconProps = {
  size: 16,
  style: { color: 'currentcolor' } as React.CSSProperties,
};

/**
 * Helper function to create consistent SVG props
 */
export const getSvgProps = (
  size: number = defaultIconProps.size,
  className?: string,
  style?: React.CSSProperties,
  additionalProps?: Record<string, any>
) => ({
  height: size,
  width: size,
  className,
  style: { ...defaultIconProps.style, ...style },
  strokeLinejoin: "round" as const,
  viewBox: "0 0 16 16",
  role: "img",
  ...additionalProps,
});
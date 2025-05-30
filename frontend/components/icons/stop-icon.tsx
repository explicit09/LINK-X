import { IconProps, getSvgProps } from './types';

export const StopIcon = ({ size = 16, className, style, "aria-label": ariaLabel, ...props }: IconProps) => {
  return (
    <svg
      {...getSvgProps(size, className, style)}
      aria-label={ariaLabel}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 3H13V13H3V3Z"
        fill="currentColor"
      />
    </svg>
  );
};
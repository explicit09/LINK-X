import { IconProps, getSvgProps } from './types';

export const GPSIcon = ({ size = 16, className, style, "aria-label": ariaLabel, ...props }: IconProps) => {
  return (
    <svg
      {...getSvgProps(size, className, style)}
      aria-label={ariaLabel}
    >
      <path
        d="M1 6L15 1L10 15L7.65955 8.91482C7.55797 8.65073 7.34927 8.44203 7.08518 8.34045L1 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="bevel"
        fill="transparent"
      />
    </svg>
  );
};
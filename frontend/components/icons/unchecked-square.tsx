import { IconProps, getSvgProps } from './types';

export const UncheckedSquare = ({
  size = 16,
  className,
  style,
  'aria-label': ariaLabel,
  ...props
}: IconProps) => {
  return (
    <svg {...getSvgProps(size, className, style)} aria-label={ariaLabel}>
      <rect
        x="1"
        y="1"
        width={size}
        height={size}
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
};

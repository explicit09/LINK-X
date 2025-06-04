import { IconProps, getSvgProps } from './types';

export const VercelIcon = ({
  size = 16,
  className,
  style,
  'aria-label': ariaLabel,
  ...props
}: IconProps) => {
  return (
    <svg {...getSvgProps(size, className, style)} aria-label={ariaLabel}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 1L16 15H0L8 1Z"
        fill="currentColor"
      />
    </svg>
  );
};

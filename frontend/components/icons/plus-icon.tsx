import { IconProps, getSvgProps } from './types';

export const PlusIcon = ({ size = 16, className, style, "aria-label": ariaLabel, ...props }: IconProps) => (
  <svg
      {...getSvgProps(size, className, style)}
      aria-label={ariaLabel}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.75 1.75V1H7.25V1.75V6.75H2.25H1.5V8.25H2.25H7.25V13.25V14H8.75V13.25V8.25H13.75H14.5V6.75H13.75H8.75V1.75Z"
      fill="currentColor"
    />
  </svg>
);
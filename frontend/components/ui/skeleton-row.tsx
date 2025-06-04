'use client';

import { cn } from '@/lib/utils';

interface SkeletonRowProps {
  height?: number;
  rounded?: boolean;
  className?: string;
}

export function SkeletonRow({ height = 54, rounded = true, className }: SkeletonRowProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        rounded && 'rounded-lg',
        className
      )}
      style={{ height: `${height}px` }}
    />
  );
}

interface FadeInWhenProps {
  dataReady: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FadeInWhen({ dataReady, children, className }: FadeInWhenProps) {
  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        dataReady ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}
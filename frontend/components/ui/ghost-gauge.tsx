'use client';

import { cn } from '@/lib/utils';

interface GhostGaugeProps {
  value?: number;
  maxValue?: number;
  color?: string;
  className?: string;
  showPlaceholder?: boolean;
}

export function GhostGauge({ 
  value = 0, 
  maxValue = 100, 
  color = 'blue',
  className,
  showPlaceholder = true 
}: GhostGaugeProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const isActive = value > 0;

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
  };

  return (
    <div className={cn('relative', className)}>
      {/* Background bar */}
      <div className="w-full h-1.5 bg-[#E0E4EB] rounded-full overflow-hidden">
        {/* Animated fill bar */}
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            isActive ? colorClasses[color as keyof typeof colorClasses] : 'bg-[#E0E4EB]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Placeholder text when no data */}
      {showPlaceholder && !isActive && (
        <div className="absolute -top-6 left-0 text-xs text-gray-400">––</div>
      )}
    </div>
  );
}
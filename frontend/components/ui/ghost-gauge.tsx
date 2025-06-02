'use client';

import { useState, useEffect } from 'react';
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
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    // Animate width from 0 to target percentage
    const timer = setTimeout(() => {
      setAnimatedWidth(percentage);
    }, 100); // Small delay to trigger animation after mount
    
    return () => clearTimeout(timer);
  }, [percentage]);

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
  };

  return (
    <div className={cn('relative', className)}>
      {/* Background bar */}
      <div className="w-full h-1.5 bg-[#D8DBE3] rounded-full overflow-hidden">
        {/* Animated fill bar */}
        <div
          className={cn(
            'h-full transition-all duration-[600ms] ease-out rounded-full',
            isActive ? colorClasses[color as keyof typeof colorClasses] : 'bg-[#D8DBE3]'
          )}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
      
      {/* Placeholder text when no data */}
      {showPlaceholder && !isActive && (
        <div className="absolute -top-6 left-0 text-xs text-gray-400">––</div>
      )}
    </div>
  );
}
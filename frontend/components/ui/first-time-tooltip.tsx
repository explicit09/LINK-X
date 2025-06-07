'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface FirstTimeTooltipProps {
  targetSelector: string;
  children: React.ReactNode;
  storageKey?: string;
}

export function FirstTimeTooltip({ 
  targetSelector, 
  children, 
  storageKey = 'hasShownOnboard' 
}: FirstTimeTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Check if we've shown this before
    if (typeof window === 'undefined') return;
    
    const hasShown = localStorage.getItem(storageKey);
    if (hasShown) return;

    // Wait for target element to be rendered
    const checkTarget = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 100, // Center tooltip (assuming 200px width)
        });
        setShow(true);
        
        // Hide after first interaction
        const hideTooltip = () => {
          setShow(false);
          localStorage.setItem(storageKey, 'true');
          target.removeEventListener('click', hideTooltip);
        };
        
        target.addEventListener('click', hideTooltip);
        
        // Auto-dismiss after 15 seconds
        const autoDismissTimer = setTimeout(() => {
          setShow(false);
          localStorage.setItem(storageKey, 'true');
        }, 15000);
        
        return () => {
          clearTimeout(autoDismissTimer);
          target.removeEventListener('click', hideTooltip);
        };
      }
    };

    // Check after a short delay to ensure DOM is ready
    const timer = setTimeout(checkTarget, 500);
    return () => clearTimeout(timer);
  }, [targetSelector, storageKey]);

  if (!show) return null;

  return (
    <div
      className={cn(
        'fixed z-50 w-[200px] p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg',
        'animate-in fade-in slide-in-from-top-2 duration-300'
      )}
      style={{ top: position.top, left: position.left }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-900" />
      {children}
    </div>
  );
}
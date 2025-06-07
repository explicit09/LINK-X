'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

// Fade in animation with CSS
export function FadeInCard({ 
  children, 
  delay = 0, 
  className = "" 
}: { 
  children: React.ReactNode; 
  delay?: number; 
  className?: string; 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
        }
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-5',
        className
      )}
    >
      {children}
    </div>
  );
}

// Scale animation for interactive elements
export function ScaleOnHover({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div
      className={cn(
        'transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[1.01]',
        className
      )}
    >
      {children}
    </div>
  );
}

// Stagger animation for lists
export function StaggerContainer({ 
  children, 
  staggerDelay = 0.1,
  className = "" 
}: { 
  children: React.ReactNode; 
  staggerDelay?: number;
  className?: string; 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {React.Children.map(children, (child, index) => (
        <StaggerItem key={index} delay={index * staggerDelay} isVisible={isVisible}>
          {child}
        </StaggerItem>
      ))}
    </div>
  );
}

export function StaggerItem({ 
  children, 
  delay = 0,
  isVisible = false,
  className = "" 
}: { 
  children: React.ReactNode; 
  delay?: number;
  isVisible?: boolean;
  className?: string; 
}) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShouldShow(true), delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay]);

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        shouldShow 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-5',
        className
      )}
    >
      {children}
    </div>
  );
}

// Number counter animation
export function AnimatedNumber({ 
  value, 
  duration = 1, 
  className = "" 
}: { 
  value: number; 
  duration?: number;
  className?: string; 
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          const startTime = Date.now();
          const startValue = displayValue;
          const endValue = value;

          const animate = () => {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            
            const currentValue = startValue + (endValue - startValue) * easeOutQuart;
            setDisplayValue(Math.round(currentValue));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          animate();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, duration, hasStarted, displayValue]);

  return (
    <span ref={ref} className={className}>
      {displayValue.toLocaleString()}
    </span>
  );
}

// Progress bar animation
export function AnimatedProgress({ 
  value, 
  maxValue = 100, 
  delay = 0,
  className = "" 
}: { 
  value: number; 
  maxValue?: number;
  delay?: number;
  className?: string; 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const percentage = Math.min((value / maxValue) * 100, 100);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={cn('relative bg-gray-200 rounded-full overflow-hidden', className)}>
      <div
        className={cn(
          'h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out',
          isVisible ? '' : 'w-0'
        )}
        style={{ width: isVisible ? `${percentage}%` : '0%' }}
      />
    </div>
  );
}

// Bounce animation for celebration elements
export function BounceIn({ 
  children, 
  delay = 0,
  className = "" 
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string; 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-600 ease-out',
        isVisible 
          ? 'opacity-100 scale-100 animate-bounce-in' 
          : 'opacity-0 scale-90',
        className
      )}
    >
      {children}
    </div>
  );
}

// Typewriter effect for text
export function TypewriterText({ 
  text, 
  delay = 0,
  speed = 50,
  className = "" 
}: { 
  text: string; 
  delay?: number;
  speed?: number;
  className?: string; 
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          const timer = setTimeout(() => {
            let index = 0;
            const interval = setInterval(() => {
              setDisplayedText(text.slice(0, index + 1));
              index++;
              if (index >= text.length) {
                clearInterval(interval);
                setTimeout(() => setShowCursor(false), 1000);
              }
            }, speed);

            return () => clearInterval(interval);
          }, delay);

          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [text, delay, speed, hasStarted]);

  return (
    <span ref={ref} className={className}>
      {displayedText}
      {showCursor && (
        <span className="inline-block ml-1 animate-pulse">|</span>
      )}
    </span>
  );
}

// Animation styles are now defined in tailwind.config.ts
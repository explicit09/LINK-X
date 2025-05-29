'use client';

import { useState, useEffect, useRef, ReactNode, ComponentType } from 'react';
import { cn } from '@/lib/utils';

interface LazyComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
  minHeight?: number;
}

export function LazyComponent({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
  className,
  minHeight = 200,
}: LazyComponentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, hasLoaded]);

  const defaultFallback = (
    <div 
      className="flex items-center justify-center bg-gray-50 rounded-lg animate-pulse"
      style={{ minHeight }}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {isVisible ? children : (fallback || defaultFallback)}
    </div>
  );
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    rootMargin?: string;
    threshold?: number;
    minHeight?: number;
  }
) {
  return function LazyWrappedComponent(props: P) {
    return (
      <LazyComponent {...options}>
        <Component {...props} />
      </LazyComponent>
    );
  };
}

export default LazyComponent; 
import { useState } from 'react';

export interface PerformanceMetrics {
  startTime: number;
  firstTokenTime?: number;
  completionTime?: number;
}

export function usePerformanceMetrics() {
  const [showMetrics, setShowMetrics] = useState(false);

  const toggleMetrics = () => {
    setShowMetrics(!showMetrics);
  };

  const closeMetrics = () => {
    setShowMetrics(false);
  };

  return {
    showMetrics,
    toggleMetrics,
    closeMetrics,
  };
}

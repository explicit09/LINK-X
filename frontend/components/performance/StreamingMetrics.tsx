import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Zap, MemoryStick } from 'lucide-react';

interface Metrics {
  firstTokenTime: number | null;
  completionTime: number | null;
  tokensReceived: number;
  memoryUsage: number;
  droppedFrames: number;
  totalFrames: number;
}

export function StreamingMetrics({ sectionKey, isStreaming }: { sectionKey: string; isStreaming: boolean }) {
  const [metrics, setMetrics] = useState<Metrics>({
    firstTokenTime: null,
    completionTime: null,
    tokensReceived: 0,
    memoryUsage: 0,
    droppedFrames: 0,
    totalFrames: 0,
  });
  
  const [startTime] = useState(Date.now());
  
  useEffect(() => {
    if (!isStreaming) return;
    
    let frameCount = 0;
    let lastFrameTime = performance.now();
    let rafId: number;
    
    const checkPerformance = () => {
      frameCount++;
      const now = performance.now();
      const frameDuration = now - lastFrameTime;
      
      // Check if frame took longer than 16.67ms (60fps)
      if (frameDuration > 16.67) {
        setMetrics(prev => ({ ...prev, droppedFrames: prev.droppedFrames + 1 }));
      }
      
      setMetrics(prev => ({ ...prev, totalFrames: frameCount }));
      
      // Check memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({ 
          ...prev, 
          memoryUsage: Math.round(memory.usedJSHeapSize / 1048576) // Convert to MB
        }));
      }
      
      lastFrameTime = now;
      rafId = requestAnimationFrame(checkPerformance);
    };
    
    rafId = requestAnimationFrame(checkPerformance);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isStreaming]);
  
  const getMetricColor = (metric: string, value: number) => {
    switch (metric) {
      case 'firstToken':
        return value < 300 ? 'text-green-600' : value < 500 ? 'text-yellow-600' : 'text-red-600';
      case 'completion':
        return value < 4000 ? 'text-green-600' : value < 6000 ? 'text-yellow-600' : 'text-red-600';
      case 'droppedFrames':
        const percentage = (value / metrics.totalFrames) * 100;
        return percentage < 5 ? 'text-green-600' : percentage < 10 ? 'text-yellow-600' : 'text-red-600';
      case 'memory':
        return value < 150 ? 'text-green-600' : value < 200 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <Card className="fixed bottom-4 left-4 w-80 shadow-lg border-gray-200 bg-white/95 backdrop-blur z-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Performance Metrics - {sectionKey}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-gray-500" />
            <span>First Token</span>
          </div>
          <span className={`font-mono ${getMetricColor('firstToken', metrics.firstTokenTime || 0)}`}>
            {metrics.firstTokenTime ? `${metrics.firstTokenTime}ms` : '-'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-gray-500" />
            <span>Completion</span>
          </div>
          <span className={`font-mono ${getMetricColor('completion', metrics.completionTime || 0)}`}>
            {metrics.completionTime ? `${metrics.completionTime}ms` : '-'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-gray-500" />
            <span>Dropped Frames</span>
          </div>
          <span className={`font-mono ${getMetricColor('droppedFrames', metrics.droppedFrames)}`}>
            {metrics.totalFrames > 0 
              ? `${((metrics.droppedFrames / metrics.totalFrames) * 100).toFixed(1)}%`
              : '-'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MemoryStick className="h-3 w-3 text-gray-500" />
            <span>Memory</span>
          </div>
          <span className={`font-mono ${getMetricColor('memory', metrics.memoryUsage)}`}>
            {metrics.memoryUsage}MB
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
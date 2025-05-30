import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PerformanceMetricsPanelProps {
  metricsData: Map<string, { startTime: number; firstTokenTime?: number; completionTime?: number }>;
  onClose: () => void;
}

export function PerformanceMetricsPanel({ metricsData, onClose }: PerformanceMetricsPanelProps) {
  const [frameStats, setFrameStats] = useState({ dropped: 0, total: 0 });
  const [memoryUsage, setMemoryUsage] = useState(0);
  
  // Performance monitoring effect
  useEffect(() => {
    let frameCount = 0;
    let droppedFrames = 0;
    let lastFrameTime = performance.now();
    let rafId: number;
    
    const checkPerformance = () => {
      frameCount++;
      const now = performance.now();
      const frameDuration = now - lastFrameTime;
      
      if (frameDuration > 16.67) {
        droppedFrames++;
      }
      
      setFrameStats({ dropped: droppedFrames, total: frameCount });
      
      // Check memory if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryUsage(Math.round(memory.usedJSHeapSize / 1048576));
      }
      
      lastFrameTime = now;
      rafId = requestAnimationFrame(checkPerformance);
    };
    
    rafId = requestAnimationFrame(checkPerformance);
    return () => cancelAnimationFrame(rafId);
  }, []);
  
  const allMetrics = Array.from(metricsData.entries());
  const avgFirstToken = allMetrics.filter(([_, m]) => m.firstTokenTime).reduce((acc, [_, m]) => acc + (m.firstTokenTime || 0), 0) / allMetrics.filter(([_, m]) => m.firstTokenTime).length || 0;
  const p95Completion = allMetrics.filter(([_, m]) => m.completionTime)
    .map(([_, m]) => m.completionTime || 0)
    .sort((a, b) => a - b)[Math.floor(allMetrics.length * 0.95)] || 0;
  
  const getColor = (metric: string, value: number) => {
    switch (metric) {
      case 'firstToken': return value < 300 ? 'text-green-600' : value < 500 ? 'text-yellow-600' : 'text-red-600';
      case 'completion': return value < 4000 ? 'text-green-600' : value < 6000 ? 'text-yellow-600' : 'text-red-600';
      case 'frames': return value < 5 ? 'text-green-600' : value < 10 ? 'text-yellow-600' : 'text-red-600';
      case 'memory': return value < 150 ? 'text-green-600' : value < 200 ? 'text-yellow-600' : 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg bg-white/95 backdrop-blur z-50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Performance Metrics</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>Avg First Token</span>
            <span className={`font-mono ${getColor('firstToken', avgFirstToken)}`}>
              {avgFirstToken.toFixed(0)}ms
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>P95 Completion</span>
            <span className={`font-mono ${getColor('completion', p95Completion)}`}>
              {p95Completion.toFixed(0)}ms
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Dropped Frames</span>
            <span className={`font-mono ${getColor('frames', (frameStats.dropped / frameStats.total) * 100)}`}>
              {frameStats.total > 0 ? ((frameStats.dropped / frameStats.total) * 100).toFixed(1) : 0}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Memory Usage</span>
            <span className={`font-mono ${getColor('memory', memoryUsage)}`}>
              {memoryUsage}MB
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
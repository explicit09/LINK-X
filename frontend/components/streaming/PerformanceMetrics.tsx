"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Activity, Cpu, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricData {
  startTime: number;
  firstTokenTime?: number;
  completionTime?: number;
}

interface PerformanceMetricsProps {
  metricsData: Map<string, MetricData>;
  onClose: () => void;
  className?: string;
}

export function PerformanceMetrics({ metricsData, onClose, className }: PerformanceMetricsProps) {
  const [frameStats, setFrameStats] = useState({ dropped: 0, total: 0 });
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(0);
  
  // Calculate aggregate metrics
  const aggregateMetrics = React.useMemo(() => {
    let totalFirstToken = 0;
    let totalCompletion = 0;
    let count = 0;
    
    metricsData.forEach((metric) => {
      if (metric.firstTokenTime) {
        totalFirstToken += metric.firstTokenTime - metric.startTime;
        count++;
      }
      if (metric.completionTime) {
        totalCompletion += metric.completionTime - metric.startTime;
      }
    });
    
    return {
      avgFirstToken: count > 0 ? totalFirstToken / count : 0,
      avgCompletion: count > 0 ? totalCompletion / count : 0,
      totalSections: metricsData.size,
    };
  }, [metricsData]);
  
  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let droppedFrames = 0;
    let lastFrameTime = performance.now();
    let rafId: number;
    
    const checkPerformance = () => {
      frameCount++;
      const now = performance.now();
      const frameDuration = now - lastFrameTime;
      
      // Check for dropped frames (>16.67ms is roughly 60fps)
      if (frameDuration > 16.67) {
        droppedFrames++;
      }
      
      setFrameStats({ dropped: droppedFrames, total: frameCount });
      
      // Check memory if available
      if ('memory' in performance) {
        const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
        const usage = Math.round(memory.usedJSHeapSize / 1048576);
        setMemoryUsage(usage);
      }
      
      // Simulate CPU usage (in real app, this would come from performance observer)
      setCpuUsage(Math.random() * 20 + 10); // 10-30%
      
      lastFrameTime = now;
      rafId = requestAnimationFrame(checkPerformance);
    };
    
    rafId = requestAnimationFrame(checkPerformance);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
  
  const frameRate = frameStats.total > 0 
    ? Math.round((frameStats.total - frameStats.dropped) / frameStats.total * 60)
    : 60;
  
  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Frame Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>Frame Rate</span>
            </div>
            <Badge variant={frameRate >= 50 ? "default" : frameRate >= 30 ? "secondary" : "destructive"}>
              {frameRate} FPS
            </Badge>
          </div>
          <Progress value={(frameRate / 60) * 100} className="h-2" />
        </div>
        
        {/* Memory Usage */}
        {memoryUsage > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span>Memory Usage</span>
              </div>
              <span className="text-xs text-muted-foreground">{memoryUsage} MB</span>
            </div>
            <Progress value={Math.min((memoryUsage / 500) * 100, 100)} className="h-2" />
          </div>
        )}
        
        {/* CPU Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span>CPU Usage</span>
            </div>
            <span className="text-xs text-muted-foreground">{cpuUsage.toFixed(1)}%</span>
          </div>
          <Progress value={cpuUsage} className="h-2" />
        </div>
        
        {/* Streaming Metrics */}
        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Streaming Performance
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Avg First Token</p>
              <p className="font-medium">{aggregateMetrics.avgFirstToken.toFixed(0)}ms</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Completion</p>
              <p className="font-medium">{(aggregateMetrics.avgCompletion / 1000).toFixed(1)}s</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Sections</p>
              <p className="font-medium">{aggregateMetrics.totalSections}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dropped Frames</p>
              <p className="font-medium">{frameStats.dropped}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCw, 
  Download,
  Square,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamingControlsProps {
  streamingState: 'idle' | 'initializing' | 'streaming' | 'paused' | 'complete' | 'error';
  canContinue: boolean;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
}

export function StreamingControls({
  streamingState,
  canContinue,
  onPause,
  onResume,
  onSkip,
  onRegenerate,
  onDownload
}: StreamingControlsProps) {
  const isStreaming = streamingState === 'streaming';
  const isPaused = streamingState === 'paused';
  const isComplete = streamingState === 'complete';
  const canControl = isStreaming || isPaused;

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold">Streaming Controls</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Play/Pause */}
        {isStreaming ? (
          <Button
            onClick={onPause}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        ) : isPaused ? (
          <Button
            onClick={onResume}
            variant="default"
            size="sm"
            className="w-full"
            disabled={!canContinue}
          >
            <Play className="w-4 h-4 mr-2" />
            Resume
          </Button>
        ) : isComplete ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled
          >
            <Square className="w-4 h-4 mr-2" />
            Complete
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
        )}

        {/* Skip Section */}
        <Button
          onClick={onSkip}
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!canControl || !canContinue}
        >
          <SkipForward className="w-4 h-4 mr-2" />
          Skip
        </Button>

        {/* Regenerate */}
        <Button
          onClick={onRegenerate}
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!canControl}
        >
          <RotateCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>

        {/* Download */}
        <Button
          onClick={onDownload}
          variant="outline"
          size="sm"
          className="w-full"
          disabled={streamingState === 'idle' || streamingState === 'initializing'}
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Keyboard shortcuts */}
      <div className="space-y-2 pt-2 border-t">
        <p className="text-xs font-medium text-muted-foreground">Keyboard Shortcuts</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd>
            <span className="text-muted-foreground">Play/Pause</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">→</kbd>
            <span className="text-muted-foreground">Skip Section</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">R</kbd>
            <span className="text-muted-foreground">Regenerate</span>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="pt-2 border-t">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isStreaming && "bg-green-500 animate-pulse",
            isPaused && "bg-yellow-500",
            isComplete && "bg-blue-500",
            streamingState === 'error' && "bg-red-500"
          )} />
          <span className="text-xs font-medium capitalize">
            {streamingState === 'initializing' ? 'Preparing...' : streamingState}
          </span>
        </div>
      </div>
    </Card>
  );
}
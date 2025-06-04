import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  RotateCw, 
  Download
} from 'lucide-react';

interface StreamingControlsProps {
  streamingState: 'idle' | 'initializing' | 'streaming' | 'paused' | 'complete' | 'error';
  onRegenerate: () => void;
  onDownload: () => void;
}

export function StreamingControls({
  streamingState,
  onRegenerate,
  onDownload
}: StreamingControlsProps) {
  const canRegenerate = streamingState === 'streaming' || streamingState === 'paused' || streamingState === 'complete';
  const canDownload = streamingState !== 'idle' && streamingState !== 'initializing';

  return (
    <div className="flex gap-2">
      {/* Regenerate Button */}
      <Button
        onClick={onRegenerate}
        variant="outline"
        size="sm"
        className="flex-1"
        disabled={!canRegenerate}
      >
        <RotateCw className="w-4 h-4 mr-2" />
        Regenerate
      </Button>

      {/* Download Button */}
      <Button
        onClick={onDownload}
        variant="outline"
        size="sm"
        className="flex-1"
        disabled={!canDownload}
      >
        <Download className="w-4 h-4 mr-2" />
        Download
      </Button>
    </div>
  );
}
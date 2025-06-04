'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  RotateCcw,
  Download, 
  Maximize, 
  Minimize,
  Move,
  Maximize2,
  X
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhancedImageViewerProps {
  url: string;
  alt: string;
  className?: string;
  onError?: (error: string) => void;
}

export function EnhancedImageViewer({ url, alt, className = '', onError }: EnhancedImageViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const resetZoom = () => {
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  };

  // Handle rotation
  const handleRotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleRotateCounterClockwise = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };

  // Handle fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle download
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = alt || 'image';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // Handle drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true);
      setDragStart({ 
        x: e.clientX - position.x, 
        y: e.clientY - position.y 
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 100) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle image load
  const handleImageLoad = () => {
    setLoading(false);
  };

  // Handle image error
  const handleImageError = () => {
    const errorMsg = 'Failed to load image';
    setError(errorMsg);
    setLoading(false);
    onError?.(errorMsg);
  };

  // Reset position when zoom goes back to 100 or below
  useEffect(() => {
    if (zoom <= 100) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  return (
    <div 
      ref={containerRef}
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${className} ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/70 backdrop-blur-sm p-2">
        <div className="flex items-center justify-between">
          {/* Left side - Info */}
          <div className="text-white text-sm px-2">
            {alt}
          </div>

          {/* Center - Zoom controls */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              disabled={zoom <= 25}
              className="text-white hover:bg-white/20 p-2"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2 w-32">
              <Slider
                value={[zoom]}
                onValueChange={handleZoomChange}
                min={25}
                max={300}
                step={25}
                className="flex-1"
              />
              <span className="text-sm text-white w-12 text-right">{zoom}%</span>
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              disabled={zoom >= 300}
              className="text-white hover:bg-white/20 p-2"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={resetZoom}
              className="text-white hover:bg-white/20 p-2"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRotateCounterClockwise}
                    className="text-white hover:bg-white/20 p-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate left</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRotateClockwise}
                    className="text-white hover:bg-white/20 p-2"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate right</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownload}
                    className="text-white hover:bg-white/20 p-2"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20 p-2"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Image container */}
      <div 
        ref={imageContainerRef}
        className="w-full h-full overflow-hidden flex items-center justify-center pt-12"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: zoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white">Loading image...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="mb-2">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(url, '_blank')}
                className="text-white border-white hover:bg-white/20"
              >
                Open in new tab
              </Button>
            </div>
          </div>
        )}

        <img
          ref={imageRef}
          src={url}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.3s ease-in-out'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
        />
      </div>

      {/* Zoom indicator when zoomed in */}
      {zoom > 100 && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
          <Move className="h-3 w-3" />
          <span>Drag to pan</span>
        </div>
      )}

      {/* Mobile controls */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden bg-black/70 rounded-lg p-2 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" onClick={handleZoomOut} className="text-white">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-white">{zoom}%</span>
          <Button size="sm" variant="ghost" onClick={handleZoomIn} className="text-white">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" onClick={handleRotateClockwise} className="text-white">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="text-white">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
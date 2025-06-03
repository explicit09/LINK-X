'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Maximize, 
  Minimize,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Grid,
  FileText,
  Loader2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhancedPDFViewerProps {
  url: string;
  title: string;
  className?: string;
  onError?: (error: string) => void;
}

export function EnhancedPDFViewer({ url, title, className = '', onError }: EnhancedPDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  // Handle rotation
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
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

  // Handle page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Update iframe URL with page parameter
      if (iframeRef.current) {
        iframeRef.current.src = `${url}#page=${page}`;
      }
    }
  };

  // Handle download
  const handleDownload = () => {
    window.open(url, '_blank');
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setLoading(false);
    // Try to get page count from PDF (this would require PDF.js integration for full functionality)
    // For now, we'll use a placeholder
    setTotalPages(1); // This would be dynamically determined with PDF.js
  };

  // Handle iframe error
  const handleIframeError = () => {
    const errorMsg = 'Failed to load PDF';
    setError(errorMsg);
    setLoading(false);
    onError?.(errorMsg);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-gray-100 rounded-lg overflow-hidden ${className} ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-2">
        <div className="flex items-center justify-between">
          {/* Left side - Navigation */}
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    className="p-2"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle thumbnails</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center space-x-1 px-2 border-l border-gray-200">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-1">
                <Input
                  type="number"
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="w-12 h-7 text-center text-sm"
                  min={1}
                  max={totalPages}
                />
                <span className="text-sm text-gray-500">/ {totalPages}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Center - Zoom controls */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-2"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2 w-32">
              <Slider
                value={[zoom]}
                onValueChange={handleZoomChange}
                min={50}
                max={200}
                step={25}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-12 text-right">{zoom}%</span>
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-2"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 pr-2 border-r border-gray-200">
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-32 h-7 text-sm"
              />
              <Button size="sm" variant="ghost" className="p-1">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRotate}
                    className="p-2"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownload}
                    className="p-2"
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
                    className="p-2"
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

      {/* Main content area */}
      <div className="flex h-full pt-14">
        {/* Thumbnails sidebar */}
        {showThumbnails && (
          <div className="w-48 bg-gray-50 border-r border-gray-200 overflow-y-auto p-2">
            <div className="space-y-2">
              {/* Placeholder thumbnails - would be generated from PDF pages */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-full p-2 rounded-md border-2 transition-colors ${
                    page === currentPage
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="aspect-[8.5/11] bg-white rounded border border-gray-300 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">Page {page}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PDF viewer */}
        <div className="flex-1 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(url, '_blank')}
                  className="mt-2"
                >
                  Open in new tab
                </Button>
              </div>
            </div>
          )}

          <div 
            className="w-full h-full overflow-auto flex items-center justify-center p-4"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.3s ease-in-out'
            }}
          >
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full bg-white shadow-lg"
              style={{
                minHeight: '1000px',
                minWidth: '700px',
              }}
              title={title}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>
        </div>
      </div>

      {/* Mobile controls */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden bg-white rounded-lg shadow-lg p-2 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{zoom}%</span>
          <Button size="sm" variant="ghost" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
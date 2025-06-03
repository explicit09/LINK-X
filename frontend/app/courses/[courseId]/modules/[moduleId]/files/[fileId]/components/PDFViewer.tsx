'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, RotateCw, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  filename: string;
  onError?: (error: string) => void;
}

export function PDFViewer({ fileUrl, filename, onError }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleIframeLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load PDF file');
    onError?.('Failed to load PDF file');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetView = () => {
    setScale(1);
    setRotation(0);
  };

  // Create embed URL with parameters
  const embedUrl = `${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-red-500" />
          <div>
            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
              {filename}
            </div>
            <div className="text-xs text-gray-500">PDF Document</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={zoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Button
            size="sm"
            variant="outline"
            onClick={zoomIn}
            disabled={scale >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300" />
          
          <Button
            size="sm"
            variant="outline"
            onClick={rotate}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={resetView}
          >
            Reset
          </Button>
          
          <div className="w-px h-6 bg-gray-300" />
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenInNewTab}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Open
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 relative bg-gray-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-gray-600">Loading PDF...</div>
            </div>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-center max-w-md">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <div className="text-lg font-medium text-gray-900 mb-2">
                Unable to Display PDF
              </div>
              <div className="text-gray-600 mb-6">
                The PDF file could not be displayed in the browser.
              </div>
              <div className="flex justify-center space-x-3">
                <Button onClick={handleDownload} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button onClick={handleOpenInNewTab}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="w-full h-full"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-in-out'
            }}
          >
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              title={filename}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{
                minHeight: '600px',
                width: '100%',
                height: '100%'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
} 
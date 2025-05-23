'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Maximize2, Minimize2, Download, AlertCircle, ExternalLink } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
}

export default function PDFViewer({ fileUrl, fileName, onClose }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };
  
  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const openInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  const renderPDFContent = () => {
    if (hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load PDF</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to display this PDF document in the browser.
            </p>
            <div className="space-y-2">
              <Button onClick={openInNewTab} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button variant="outline" onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <iframe
        src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        title={fileName || "PDF Document"}
        sandbox="allow-same-origin allow-scripts"
      />
    );
  };
  
  return (
    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <div className="relative w-full h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          <div className="text-sm font-medium truncate max-w-[70%]">
            {fileName || 'PDF Document'}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openInNewTab}
              title="Open in New Tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className="relative flex-1 min-h-[500px] bg-gray-200 dark:bg-gray-900">
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF...</p>
              </div>
            </div>
          )}
          
          {renderPDFContent()}
        </div>
      </div>
      
      {/* Fullscreen Dialog */}
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0">
        <DialogHeader className="p-3 bg-gray-100 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg">{fileName || 'PDF Document'}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={openInNewTab}
                title="Open in New Tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsFullscreen(false)}
                title="Exit Fullscreen"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="h-full bg-gray-200 dark:bg-gray-900">
          {renderPDFContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
} 
'use client';

import { useState, useEffect } from 'react';
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  
  // Fetch the PDF as a blob to handle authentication
  useEffect(() => {
    const fetchPDFAsBlob = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        console.log('Fetching PDF from:', fileUrl);
        
        const response = await fetch(fileUrl, {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Accept': 'application/pdf,*/*'
          }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          console.error('Failed to fetch PDF:', response.status, response.statusText);
          setHasError(true);
          setIsLoading(false);
          return;
        }
        
        const blob = await response.blob();
        console.log('Blob received:', blob.type, 'Size:', blob.size);
        
        if (blob.size === 0) {
          console.error('Empty PDF blob received');
          setHasError(true);
          setIsLoading(false);
          return;
        }
        
        const url = URL.createObjectURL(blob);
        console.log('Created blob URL:', url);
        setBlobUrl(url);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching PDF:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };
    
    fetchPDFAsBlob();
    
    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileUrl]);

  const handleDownload = () => {
    try {
      // Use blob URL if available, otherwise fall back to direct URL
      const link = document.createElement('a');
      link.href = blobUrl || fileUrl;
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
    window.open(blobUrl || fileUrl, '_blank');
  };

  // Render PDF content
  const renderContent = () => {
    if (hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Unable to display document</h3>
            <p className="text-gray-600 mb-6">
              The document couldn't be displayed in the viewer.
            </p>
            <div className="space-y-3">
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
    
    return blobUrl ? (
      <iframe
        src={blobUrl}
        className="w-full h-full border-0"
        title={fileName || "PDF Document"}
      />
    ) : null;
  };

  // Main render function
  return (
    <div className="relative w-full h-full">
      {/* Normal view */}
      <div className="w-full h-full flex flex-col rounded-lg overflow-hidden border border-gray-200">
        {/* Toolbar */}
        <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200">
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
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-gray-100">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading document...</p>
              </div>
            </div>
          )}

          {renderContent()}
        </div>
      </div>
      
      {/* Fullscreen dialog */}
      {isFullscreen && (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] h-[90vh] p-0">
            <DialogHeader className="p-3 border-b">
              <div className="flex justify-between items-center">
                <DialogTitle>{fileName || 'PDF Document'}</DialogTitle>
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
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(false)}
                    title="Exit fullscreen"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 h-[calc(90vh-4rem)] bg-gray-100">
              {renderContent()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
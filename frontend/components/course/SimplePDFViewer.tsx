'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Download, Maximize } from 'lucide-react';

interface SimplePDFViewerProps {
  url: string;
  title: string;
  className?: string;
  onError?: (error: string) => void;
}

export function SimplePDFViewer({ url, title, className = '', onError }: SimplePDFViewerProps) {
  const [zoom, setZoom] = useState(100);
  
  return (
    <div className={`flex flex-col bg-gray-100 ${className}`}>
      {/* Simple Toolbar */}
      <div className="bg-blue-600 text-white border-b border-gray-300 p-3 flex items-center justify-between flex-shrink-0">
        <div className="text-sm font-medium">{title}</div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom(prev => Math.max(prev - 25, 50))}
            className="text-white hover:bg-blue-700"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm px-3">{zoom}%</span>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom(prev => Math.min(prev + 25, 200))}
            className="text-white hover:bg-blue-700"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-blue-400 mx-2" />
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(url, '_blank')}
            className="text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      
      {/* PDF Content */}
      <div className="flex-1 relative overflow-hidden">
        <iframe
          src={url}
          className="w-full h-full border-0"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            width: `${100 * (100 / zoom)}%`,
            height: `${100 * (100 / zoom)}%`,
          }}
          title={title}
          onError={() => onError?.('Failed to load PDF')}
        />
      </div>
    </div>
  );
}
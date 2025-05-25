'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Video, Mic, AlertCircle, X, Loader2 } from 'lucide-react';
import PDFViewer from '@/components/PDFViewer';
import { instructorAPI, studentAPI } from '@/lib/api';
import { toast as sonnerToast } from 'sonner';

interface MaterialViewerProps {
  materialId: string;
  materialType: 'pdf' | 'audio' | 'video' | 'document';
  materialTitle: string;
  userRole: 'student' | 'instructor' | 'admin';
  courseId: string;
  onClose?: () => void;
}

export default function MaterialViewer({
  materialId,
  materialType,
  materialTitle,
  userRole,
  courseId,
  onClose
}: MaterialViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let fileData;
        if (userRole === 'student') {
          fileData = await studentAPI.getFileUrl(materialId);
        } else {
          fileData = await instructorAPI.getFileUrl(materialId);
        }
        
        if (fileData?.url) {
          setFileUrl(fileData.url);
        } else {
          throw new Error('No file URL returned from API');
        }
      } catch (err: any) {
        console.error('Error fetching file:', err);
        
        // Check if it's a 404 or access error
        if (err?.message?.includes('404') || err?.message?.includes('NOT FOUND')) {
          setError('File not found. It may have been moved or deleted.');
        } else if (err?.message?.includes('Load failed') || err?.message?.includes('access control')) {
          setError('File access denied. Please check your permissions.');
        } else {
          setError('Failed to load file. Please check your connection and try again.');
        }
        
        // Don't show toast error for common issues like 404
        if (!err?.message?.includes('404')) {
          sonnerToast.error('Failed to load file');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchFileContent();
  }, [materialId, userRole]);
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[500px] w-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading material...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex items-center justify-center h-[500px] w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load material</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      );
    }
    
    if (!fileUrl) {
      return (
        <div className="flex items-center justify-center h-[500px] w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">File not available</h3>
            <p className="text-gray-600">The file could not be accessed.</p>
          </div>
        </div>
      );
    }
    
    switch (materialType) {
      case 'pdf':
        return <PDFViewer fileUrl={fileUrl} fileName={materialTitle} />;
        
      case 'video':
        return (
          <div className="w-full h-full min-h-[500px]">
            <video 
              src={fileUrl} 
              controls 
              className="w-full h-full" 
              controlsList="nodownload"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );
        
      case 'audio':
        return (
          <div className="w-full p-8 flex flex-col items-center justify-center min-h-[300px]">
            <Mic className="h-16 w-16 text-purple-600 mb-4" />
            <h3 className="text-lg font-medium mb-4">{materialTitle}</h3>
            <audio 
              src={fileUrl} 
              controls 
              className="w-full max-w-md" 
              controlsList="nodownload"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-[500px] w-full">
            <div className="text-center">
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{materialTitle}</h3>
              <p className="text-gray-600 mb-4">This file type cannot be previewed directly.</p>
              <Button asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={materialTitle}>
                  Download File
                </a>
              </Button>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="w-full h-full">
      {renderContent()}
    </div>
  );
} 
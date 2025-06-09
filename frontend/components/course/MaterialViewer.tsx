'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Video, Mic, AlertCircle, X, Loader2 } from 'lucide-react';
import { PDFViewer } from '@/components/ui/lazy-imports';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/lib/supabase';

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
  onClose,
}: MaterialViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ NEW: Use direct Supabase operations for file access
        // Get file details from database
        const { data: fileDetails, error: dbError } = await supabase
          .from('files')
          .select('storage_path, filename')
          .eq('id', materialId)
          .single();

        if (dbError || !fileDetails) {
          throw new Error('File not found in database');
        }

        // Get signed URL from Supabase Storage
        const { data: urlData, error: storageError } = await supabase.storage
          .from('course-files')
          .createSignedUrl(fileDetails.storage_path, 3600); // 1 hour expiry

        if (storageError || !urlData?.signedUrl) {
          throw new Error('Failed to generate file access URL');
        }

        setFileUrl(urlData.signedUrl);
      } catch (err: any) {
        console.error('Error fetching file:', err);

        // Check if it's a 404 or access error
        if (
          err?.message?.includes('not found') ||
          err?.message?.includes('NOT FOUND')
        ) {
          setError('File not found. It may have been moved or deleted.');
        } else if (
          err?.message?.includes('access') ||
          err?.message?.includes('permission')
        ) {
          setError('File access denied. Please check your permissions.');
        } else {
          setError(
            'Failed to load file. Please check your connection and try again.',
          );
        }

        // Don't show toast error for common issues like 404
        if (!err?.message?.includes('not found')) {
          sonnerToast.error('Failed to load file');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFileContent();
  }, [materialId]);

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
            <h3 className="text-lg font-medium mb-2">
              Failed to load material
            </h3>
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

    try {
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
                <p className="text-gray-600 mb-4">
                  This file type cannot be previewed directly.
                </p>
                <Button asChild>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={materialTitle}
                  >
                    Download File
                  </a>
                </Button>
              </div>
            </div>
          );
      }
    } catch (err) {
      console.error('Error rendering content:', err);
      return (
        <div className="flex items-center justify-center h-[500px] w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Failed to display content
            </h3>
            <p className="text-gray-600 mb-4">
              There was an error displaying this content.
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      );
    }
  };

  return <div className="w-full h-full">{renderContent()}</div>;
}

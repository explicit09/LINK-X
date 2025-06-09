'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { FileText, Video, Music, Image, File, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface FileData {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  processed: boolean;
  s3_key?: string;
  s3_bucket?: string;
}

interface S3FileViewerProps {
  file: FileData;
  courseId: string;
  moduleId: string;
  onError?: (error: string) => void;
}

export function S3FileViewer({ file, courseId, moduleId, onError }: S3FileViewerProps) {
  // Note: This component now works with Supabase Storage directly
  const { user: currentUser } = useAuth();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Get file type icon
  const getFileIcon = (fileType: string) => {
    const type = fileType?.toLowerCase() || '';
    
    if (type.includes('pdf') || type.includes('document')) {
      return <FileText className="w-16 h-16 text-red-500" />;
    }
    if (type.includes('video')) {
      return <Video className="w-16 h-16 text-purple-500" />;
    }
    if (type.includes('audio')) {
      return <Music className="w-16 h-16 text-green-500" />;
    }
    if (type.includes('image')) {
      return <Image className="w-16 h-16 text-blue-500" />;
    }
    return <File className="w-16 h-16 text-gray-500" />;
  };

  // Check if file type is viewable in browser
  const isViewableInBrowser = (fileType: string) => {
    const type = fileType?.toLowerCase() || '';
    return (
      type.includes('pdf') ||
      type.includes('image') ||
      type.includes('video') ||
      type.includes('audio') ||
      type.includes('text')
    );
  };

  // ✅ NEW: Direct Supabase Storage access instead of backend API
  const fetchFileUrl = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!file.s3_key) {
        throw new Error('File storage path not available');
      }

      // Get signed URL directly from Supabase Storage
      const { data, error: storageError } = await supabase.storage
        .from(file.s3_bucket || 'course-files')
        .createSignedUrl(file.s3_key, 3600); // 1 hour expiry

      if (storageError) {
        throw new Error(`Failed to get file URL: ${storageError.message}`);
      }

      if (!data?.signedUrl) {
        throw new Error('No file URL received from storage');
      }

      setFileUrl(data.signedUrl);

    } catch (err) {
      console.error('Error fetching file URL:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Retry loading
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchFileUrl();
  };

  // Initialize file loading
  useEffect(() => {
    if (file && currentUser) {
      fetchFileUrl();
    }
  }, [file, currentUser, retryCount]);

  // Cleanup blob URLs (not needed for signed URLs, but keeping for safety)
  useEffect(() => {
    return () => {
      if (fileUrl && fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-gray-600 text-center">
          <div className="font-medium">Loading file content...</div>
          <div className="text-sm mt-1">Getting secure access to {file.filename}</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-gray-900 mb-2">Unable to load file</div>
          <div className="text-gray-600 mb-4">
            {error || 'The file content could not be loaded'}
          </div>
          <div className="text-sm text-gray-500">
            File: {file.filename} ({file.file_type})
          </div>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button 
            onClick={() => window.open(fileUrl || '#', '_blank')}
            variant="outline"
            disabled={!fileUrl}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  }

  // Check if viewable
  if (!isViewableInBrowser(file.file_type)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        {getFileIcon(file.file_type)}
        <div className="text-center mt-6">
          <div className="text-lg font-semibold text-gray-900 mb-2">{file.title}</div>
          <div className="text-gray-600 mb-4">
            This file type ({file.file_type}) cannot be previewed in the browser
          </div>
          <Button 
            onClick={() => window.open(fileUrl, '_blank')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    );
  }

  // Render appropriate viewer based on file type
  const renderViewer = () => {
    const fileType = file.file_type?.toLowerCase() || '';

    // PDF Viewer
    if (fileType.includes('pdf')) {
      return (
        <div className="w-full h-[800px]">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={file.title}
            onError={() => {
              setError('Failed to load PDF');
              onError?.('Failed to load PDF');
            }}
          />
        </div>
      );
    }

    // Image Viewer
    if (fileType.includes('image')) {
      return (
        <div className="flex justify-center p-4">
          <img
            src={fileUrl}
            alt={file.title}
            className="max-w-full max-h-[800px] object-contain rounded-lg shadow-lg"
            onError={() => {
              setError('Failed to load image');
              onError?.('Failed to load image');
            }}
          />
        </div>
      );
    }

    // Video Viewer
    if (fileType.includes('video')) {
      return (
        <div className="flex justify-center p-4">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-[600px] rounded-lg shadow-lg"
            onError={() => {
              setError('Failed to load video');
              onError?.('Failed to load video');
            }}
          >
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    // Audio Viewer
    if (fileType.includes('audio')) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Music className="w-24 h-24 text-green-500 mb-6" />
          <div className="text-center mb-6">
            <div className="text-lg font-semibold text-gray-900 mb-2">{file.title}</div>
            <div className="text-gray-600">Audio File</div>
          </div>
          <audio
            src={fileUrl}
            controls
            className="w-full max-w-md"
            onError={() => {
              setError('Failed to load audio');
              onError?.('Failed to load audio');
            }}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // Text/Document Viewer
    if (fileType.includes('text') || fileType.includes('document')) {
      return (
        <div className="w-full h-[800px]">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={file.title}
            onError={() => {
              setError('Failed to load document');
              onError?.('Failed to load document');
            }}
          />
        </div>
      );
    }

    // Fallback: Generic viewer
    return (
      <div className="w-full h-[800px]">
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          title={file.title}
          onError={() => {
            setError('Failed to load file');
            onError?.('Failed to load file');
          }}
        />
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Viewer Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          {getFileIcon(file.file_type)}
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">{file.filename}</div>
            <div className="text-xs text-gray-500">{file.file_type}</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(fileUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>

      {/* File Content */}
      <div className="relative">
        {renderViewer()}
      </div>
    </div>
  );
}
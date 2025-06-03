'use client';

import { useState, useEffect } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Button } from '@/components/ui/button';
import { FileText, Video, Music, Image, File, AlertCircle, ExternalLink, RefreshCw, Download } from 'lucide-react';
import { EnhancedPDFViewer } from '@/components/course/EnhancedPDFViewer';
import { SimplePDFViewer } from '@/components/course/SimplePDFViewer';
import { EnhancedImageViewer } from '@/components/course/EnhancedImageViewer';
import { apiClient } from '@/lib/api/client';

interface FileData {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  type?: string;
  file_size: number;
  processed: boolean;
  s3_key?: string;
  s3_bucket?: string;
}

interface UniversalFileViewerProps {
  file: FileData;
  courseId: string;
  moduleId: string;
  onError?: (error: string) => void;
}

export function UniversalFileViewer({ file, courseId, moduleId, onError }: UniversalFileViewerProps) {
  const { user: currentUser } = useAuthUser();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  console.log('UniversalFileViewer received file:', file);

  // Enhanced file type detection
  const detectFileType = (file: FileData): string => {
    // Try multiple sources for file type
    let detectedType = file.file_type || file.type || '';
    
    // If no type or generic type, infer from filename
    if (!detectedType || detectedType === 'application/octet-stream' || detectedType === 'binary/octet-stream') {
      const filename = file.filename || file.title || '';
      const extension = filename.split('.').pop()?.toLowerCase();
      
      if (extension) {
        const typeMap: Record<string, string> = {
          // Documents
          'pdf': 'application/pdf',
          
          // Images
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'svg': 'image/svg+xml',
          'bmp': 'image/bmp',
          'ico': 'image/x-icon',
          
          // Videos
          'mp4': 'video/mp4',
          'avi': 'video/avi',
          'mov': 'video/quicktime',
          'webm': 'video/webm',
          'mkv': 'video/x-matroska',
          'flv': 'video/x-flv',
          'wmv': 'video/x-ms-wmv',
          
          // Audio
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg',
          'm4a': 'audio/mp4',
          'aac': 'audio/aac',
          'flac': 'audio/flac',
          
          // Text
          'txt': 'text/plain',
          'md': 'text/markdown',
          'html': 'text/html',
          'htm': 'text/html',
          'css': 'text/css',
          'js': 'text/javascript',
          'json': 'application/json',
          'xml': 'application/xml',
          'csv': 'text/csv',
          
          // Office docs (for identification)
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
        
        detectedType = typeMap[extension] || `application/${extension}`;
      }
    }
    
    console.log('Detected file type:', detectedType);
    return detectedType;
  };

  // Determine if we should attempt to view the file - now always tries to view
  const shouldAttemptView = (fileType: string): boolean => {
    const type = fileType.toLowerCase();
    
    // Only exclude files that definitely can't be viewed
    const definitelyNotViewable = [
      'application/zip',
      'application/x-rar',
      'application/x-7z',
      'application/msword',
      'application/vnd.openxml',
      'application/vnd.ms-'
    ];
    
    const isNotViewable = definitelyNotViewable.some(excludedType => type.includes(excludedType));
    
    // Try to view everything except definitely non-viewable files
    return !isNotViewable;
  };

  // Get appropriate file icon
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) return <FileText className="w-16 h-16 text-red-500" />;
    if (type.includes('video')) return <Video className="w-16 h-16 text-purple-500" />;
    if (type.includes('audio')) return <Music className="w-16 h-16 text-green-500" />;
    if (type.includes('image')) return <Image className="w-16 h-16 text-blue-500" />;
    return <File className="w-16 h-16 text-gray-500" />;
  };

  // Fetch file URL
  const fetchFileUrl = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!file?.id) {
        throw new Error('File ID is missing');
      }

      console.log('Fetching file URL for:', file.id);
      const data = await apiClient.get(`/api/v2/files/${file.id}/content`);
      
      if (data?.url) {
        setFileUrl(data.url);
      } else if (data?.content) {
        const detectedType = detectFileType(file);
        const blob = new Blob([data.content], { type: detectedType });
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      } else {
        throw new Error('No file URL or content received');
      }

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



  // Download file
  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = file.filename || file.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    if (file) {
      fetchFileUrl();
    }
  }, [file, retryCount]);

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
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />
        <div className="text-gray-600 text-center">
          <div className="text-lg font-medium">Loading file...</div>
          <div className="text-sm mt-2">Preparing {file.filename}</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
        <AlertCircle className="w-20 h-20 text-red-500 mb-6" />
        <div className="text-center max-w-lg">
          <div className="text-xl font-semibold text-gray-900 mb-3">Unable to Load File</div>
          <div className="text-gray-600 mb-6">
            {error || 'The file content could not be loaded'}
          </div>
          <div className="text-sm text-gray-500 mb-8">
            File: {file.filename} • Type: {file.file_type || 'Unknown'}
          </div>
          <div className="flex justify-center space-x-4">
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            {fileUrl && (
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const detectedType = detectFileType(file);
  
  // Check if we should attempt to view - only for definitely non-viewable files
  if (!shouldAttemptView(detectedType)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
        {getFileIcon(detectedType)}
        <div className="text-center mt-8 max-w-lg">
          <div className="text-xl font-semibold text-gray-900 mb-3">{file.title}</div>
          <div className="text-gray-600 mb-4">
            This file type requires downloading to view
          </div>
          <div className="text-sm text-gray-500 mb-8">
            Type: {detectedType} • File: {file.filename}
          </div>
          <div className="flex justify-center">
            <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate viewer
  const renderViewer = () => {
    const type = detectedType.toLowerCase();

    // PDF Viewer - Using enhanced viewer with all features
    if (type.includes('pdf')) {
      return (
        <EnhancedPDFViewer
          url={fileUrl}
          title={file.filename || file.title}
          className="w-full h-full"
          onError={(error) => {
            onError?.(error);
          }}
        />
      );
    }

    // Image Viewer - Using enhanced viewer with zoom, pan, and rotation
    if (type.includes('image')) {
      return (
        <EnhancedImageViewer
          url={fileUrl}
          alt={file.filename || file.title}
          className="w-full h-screen"
          onError={(error) => {
            onError?.(error);
          }}
        />
      );
    }

    // Video Viewer
    if (type.includes('video')) {
      return (
        <div className="flex flex-col h-screen bg-black">
          <div className="flex items-center justify-between p-4 bg-white border-b">
            <div className="flex items-center space-x-3">
              <Video className="w-6 h-6 text-purple-500" />
              <div>
                <div className="text-sm font-medium">{file.filename}</div>
                <div className="text-xs text-gray-500">Video File</div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Open
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <video
              src={fileUrl}
              controls
              className="max-w-full max-h-full"
              onError={() => onError?.('Failed to load video')}
            >
              Your browser does not support video playback.
            </video>
          </div>
        </div>
      );
    }

    // Audio Viewer
    if (type.includes('audio')) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
          <Music className="w-24 h-24 text-green-500 mb-8" />
          <div className="text-center mb-8">
            <div className="text-xl font-semibold text-gray-900 mb-2">{file.title}</div>
            <div className="text-gray-600">Audio File</div>
          </div>
          <audio
            src={fileUrl}
            controls
            className="w-full max-w-lg mb-6"
            onError={() => onError?.('Failed to load audio')}
          >
            Your browser does not support audio playback.
          </audio>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      );
    }

    // Universal/Generic Viewer - attempts to display any file
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <div className="flex items-center space-x-3">
            {getFileIcon(detectedType)}
            <div>
              <div className="text-sm font-medium">{file.filename}</div>
              <div className="text-xs text-gray-500">
                {detectedType === 'application/octet-stream' ? 'Attempting to display file' : detectedType}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
        <div className="flex-1 relative">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={file.title}
            onError={() => {
              console.log('Iframe failed to load, but that\'s okay - user can still download');
              // Don't show error - just let user use download/open options
            }}
          />
          {/* Subtle note for octet-stream files */}
          {detectedType === 'application/octet-stream' && (
            <div className="absolute top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 max-w-sm">
              <div className="font-medium mb-1">File type detection</div>
              <div>If the file doesn't display properly, try opening it in a new tab or downloading it.</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      {renderViewer()}
    </div>
  );
} 
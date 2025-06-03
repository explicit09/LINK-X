'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Sparkles, Eye, ExternalLink } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { UniversalFileViewer } from './components/UniversalFileViewer';
import { apiClient } from '@/lib/api/client';

interface FileData {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  processed: boolean;
  uploaded_at: string;
  s3_key?: string;
  s3_bucket?: string;
}

export default function FilePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthUser();

  const courseId = params?.courseId as string;
  const moduleId = params?.moduleId as string;
  const fileId = params?.fileId as string;

  // Debug logging
  console.log('FilePreviewPage params:', { courseId, moduleId, fileId });

  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch file data
  useEffect(() => {
    const fetchFile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the API client instead of manual fetch with auth headers
        console.log('Fetching file data for fileId:', fileId);
        
        // Raw API response logging (temporarily disabled)
        
        const response = await apiClient.get(`/api/v2/files/${fileId}`);
        console.log('Raw API response:', response);
        
        // Extract the actual file data from the response wrapper
        const fileData = response.data || response;
        console.log('Extracted file data:', fileData);
        
        // Handle case where the API might return different ID field names
        if (fileData && !fileData.id) {
          // Check for alternative ID field names
          if (fileData.file_id) {
            fileData.id = fileData.file_id;
          } else if (fileData._id) {
            fileData.id = fileData._id;
          } else if (fileData.material_id) {
            fileData.id = fileData.material_id;
          } else {
            // If no ID field found, use the fileId from URL params
            fileData.id = fileId;
          }
          console.log('Added missing ID field:', fileData.id);
        }
        
        setFile(fileData);
      } catch (err) {
        console.error('Error fetching file:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
        sonnerToast.error('Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      fetchFile();
    }
  }, [fileId]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format upload date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle download
  const handleDownload = async () => {
    try {
      // Get the file download URL from the API
      const data = await apiClient.get(`/api/v2/files/${fileId}/content?download=true`);
      
      let downloadUrl: string;
      
      if (data?.url) {
        // If we get a presigned URL, use it directly
        downloadUrl = data.url;
      } else {
        // Fallback: try to get the file directly
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v2/files/${fileId}/download`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        downloadUrl = window.URL.createObjectURL(blob);
      }
      
      // Create download link
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file?.filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up blob URL if we created one
      if (downloadUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(downloadUrl);
      }
      
      sonnerToast.success('File downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      sonnerToast.error('Failed to download file');
    }
  };

  // Handle personalize
  const handlePersonalize = () => {
    router.push(`/learn/streaming/${fileId}?courseId=${courseId}&moduleId=${moduleId}`);
  };

  if (loading) {
    return (
      <SharedDashboardLayout 
        pageTitle="Loading File..." 
        currentUser={currentUser}
        showGamification={false}
        showFocusMode={false}
      >
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-gray-600">Loading file...</div>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  if (error || !file) {
    return (
      <SharedDashboardLayout 
        pageTitle="File Not Found" 
        currentUser={currentUser}
        showGamification={false}
        showFocusMode={false}
      >
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            {error || 'File not found'}
          </div>
          <Button 
            onClick={() => router.push(`/courses/${courseId}`)} 
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>
        </div>
      </SharedDashboardLayout>
    );
  }

  return (
    <SharedDashboardLayout 
      pageTitle={file.title} 
      currentUser={currentUser}
      showGamification={false}
      showFocusMode={false}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/courses/${courseId}`)}
              className="text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="text-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              <Button
                size="sm"
                onClick={handlePersonalize}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Personalize
              </Button>
            </div>
          </div>

          {/* File Info */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-[20px] font-semibold text-gray-900 mb-2">{file.title}</h1>
              <div className="flex items-center space-x-4 text-[14px] text-gray-600">
                <span>{file.filename}</span>
                <span>•</span>
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>Uploaded {formatDate(file.uploaded_at)}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge 
                variant={file.processed ? "default" : "secondary"}
                className={file.processed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
              >
                {file.processed ? 'Processed' : 'Processing'}
              </Badge>
              <Badge variant="outline" className="text-[12px]">
                {file.file_type?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* File Viewer - Full Width & Height */}
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          {file && file.id ? (
            <UniversalFileViewer 
              file={file}
              courseId={courseId}
              moduleId={moduleId}
              onError={(error) => {
                setError(error);
                sonnerToast.error('Failed to load file content');
              }}
            />
          ) : (
            <div className="flex justify-center items-center min-h-[400px] p-8 bg-white">
              <div className="text-center">
                <div className="text-gray-600">File data is not available</div>
                <div className="text-sm text-gray-500 mt-2">
                  {!file ? 'No file data loaded' : 'File ID is missing'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SharedDashboardLayout>
  );
}
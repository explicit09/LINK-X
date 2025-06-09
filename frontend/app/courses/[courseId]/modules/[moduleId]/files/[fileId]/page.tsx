'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { toComponentUser } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Sparkles, Eye, ExternalLink } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { UniversalFileViewer } from './components/UniversalFileViewer';
import { supabase } from '@/lib/supabase';

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
  const { user, profile } = useAuth();
  const currentUser = toComponentUser(profile, user);

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

        // Fetch file from Supabase
        console.log('Fetching file data for fileId:', fileId);
        
        const { data: fileData, error: fetchError } = await supabase
          .from('files')
          .select('*')
          .eq('id', fileId)
          .single();
        
        if (fetchError) {
          throw new Error(`Failed to fetch file: ${fetchError.message}`);
        }
        
        if (!fileData) {
          throw new Error('File not found');
        }
        
        console.log('Fetched file data:', fileData);
        
        // Transform to match FileData interface
        const transformedFile: FileData = {
          id: fileData.id,
          title: fileData.title || fileData.filename,
          filename: fileData.filename,
          file_type: fileData.file_type,
          file_size: fileData.file_size,
          processed: fileData.processing_status === 'completed' || false,
          uploaded_at: fileData.created_at,
          s3_key: fileData.storage_path,
          s3_bucket: fileData.storage_bucket || 'course-files'
        };
        
        setFile(transformedFile);
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

  // ✅ NEW: Real-time subscription to file changes
  useEffect(() => {
    if (!fileId) return;

    const subscription = supabase
      .channel(`file:${fileId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'files', filter: `id=eq.${fileId}` },
        (payload) => {
          console.log('File updated:', payload.new);
          const updatedData = payload.new as any;
          
          setFile(prev => prev ? {
            ...prev,
            processed: updatedData.processing_status === 'completed' || false,
            // Update other fields that might have changed
            title: updatedData.title || updatedData.filename,
            filename: updatedData.filename,
            file_type: updatedData.file_type,
            file_size: updatedData.file_size,
          } : null);
          
          // Show toast notification when processing completes
          if (updatedData.processing_status === 'completed' && file && !file.processed) {
            sonnerToast.success('File processing completed! AI features are now available.');
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fileId, file?.processed]);

  // ✅ NEW: Manual refresh function for debugging
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const { data: fileData, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();
      
      if (error) throw error;
      
      const transformedFile: FileData = {
        id: fileData.id,
        title: fileData.title || fileData.filename,
        filename: fileData.filename,
        file_type: fileData.file_type,
        file_size: fileData.file_size,
        processed: fileData.processing_status === 'completed' || false,
        uploaded_at: fileData.created_at,
        s3_key: fileData.storage_path,
        s3_bucket: fileData.storage_bucket || 'course-files'
      };
      
      setFile(transformedFile);
      sonnerToast.success('File status refreshed');
    } catch (err) {
      console.error('Error refreshing:', err);
      sonnerToast.error('Failed to refresh file status');
    } finally {
      setLoading(false);
    }
  };

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
      if (!file?.s3_key || !file?.s3_bucket) {
        throw new Error('File storage information not available');
      }

      // Get signed URL for download from Supabase Storage
      const { data, error } = await supabase
        .storage
        .from(file.s3_bucket || 'course-files')
        .createSignedUrl(file.s3_key, 300); // 5 minute expiry
      
      if (error) {
        throw new Error(`Failed to get download URL: ${error.message}`);
      }
      
      if (!data?.signedUrl) {
        throw new Error('No download URL received');
      }
      
      // Create download link
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = file?.filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      sonnerToast.success('File downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      sonnerToast.error('Failed to download file');
    }
  };

  // Handle personalize
  const handlePersonalize = () => {
    router.push(`/personalize/${fileId}?courseId=${courseId}&moduleId=${moduleId}`);
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
                variant="outline"
                onClick={handleRefresh}
                className="text-gray-700"
                disabled={loading}
              >
                <Eye className="w-4 h-4 mr-2" />
                Refresh
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
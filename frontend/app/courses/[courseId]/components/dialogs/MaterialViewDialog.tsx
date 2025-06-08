import { Suspense, lazy } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const MaterialViewer = lazy(() => import('@/components/course/MaterialViewer'));

interface MaterialViewDialogProps {
  currentMaterial?: { id: string; title: string; type: any };
  onClose: () => void;
  currentUser: any;
  courseId: string;
}

export function MaterialViewDialog({
  currentMaterial,
  onClose,
  currentUser,
  courseId,
}: MaterialViewDialogProps) {
  const handleDownload = async () => {
    try {
      if (!currentMaterial?.id) {
        toast.error('No file selected for download');
        return;
      }

      if (!currentUser) {
        toast.error('Please log in to download files');
        return;
      }

      toast.info('Starting download...');

      // ✅ NEW: Use direct Supabase operations for file download
      // Get file details from database
      const { data: fileDetails, error } = await supabase
        .from('files')
        .select('storage_path, filename')
        .eq('id', currentMaterial.id)
        .single();

      if (error || !fileDetails) {
        throw new Error('File not found');
      }

      // Get download URL from Supabase Storage
      const { data: downloadData } = await supabase.storage
        .from('course-files')
        .createSignedUrl(fileDetails.storage_path, 3600); // 1 hour expiry

      const downloadUrl = downloadData?.signedUrl;
      if (!downloadUrl) {
        throw new Error('Failed to generate download URL');
      }
      
      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = currentMaterial.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started...');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed. Please try again.');
    }
  };

  return (
    <Dialog
      open={!!currentMaterial}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">
            {currentMaterial?.title || 'Course Material'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and interact with course material. You can download the file or
            ask AI questions about its content.
          </DialogDescription>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 mt-4 overflow-hidden">
          {currentMaterial && (
            <Suspense fallback={<div>Loading viewer...</div>}>
              <MaterialViewer
                materialId={currentMaterial.id}
                materialType={
                  currentMaterial.type as 'pdf' | 'audio' | 'video' | 'document'
                }
                materialTitle={currentMaterial.title}
                userRole={currentUser?.role || 'student'}
                courseId={courseId}
                onClose={onClose}
              />
            </Suspense>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

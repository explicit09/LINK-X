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
import { instructorAPI, studentAPI } from '@/lib/api';

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

      const userRole = currentUser.role || 'student';
      const api = userRole === 'instructor' ? instructorAPI : studentAPI;

      toast.info('Starting download...');

      await api.downloadFile(currentMaterial.id);
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

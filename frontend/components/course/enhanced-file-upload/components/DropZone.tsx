import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { acceptedTypes } from '../utils';

interface DropZoneProps {
  isDragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function DropZone({
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  className,
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
        isDragOver
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-300 hover:border-gray-400',
        className,
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={handleClick}
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Upload your files
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Drag and drop files here, or click to browse
      </p>
      <p className="text-xs text-gray-500">
        Supports PDF, Audio (MP3, WAV), Video (MP4, MOV), and Presentations
        (PPT, PPTX)
      </p>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.values(acceptedTypes).join(',')}
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  );
}

import { useRef } from 'react';
import { Upload, FileText, Film, Music, Presentation, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const supportedFileTypes = [
    { icon: FileText, label: 'Documents', types: 'PDF, DOC, DOCX' },
    { icon: Film, label: 'Videos', types: 'MP4, MOV, AVI' },
    { icon: Music, label: 'Audio', types: 'MP3, WAV, M4A' },
    { icon: Presentation, label: 'Presentations', types: 'PPT, PPTX' },
  ];

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardContent className="p-0">
        {/* Upload Drop Zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer m-6',
            isDragOver
              ? 'border-blue-500 bg-blue-50 text-blue-700 scale-[1.02]'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-25',
          )}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={handleClick}
        >
          <div className={cn(
            'w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors',
            isDragOver ? 'bg-blue-100' : 'bg-gray-100'
          )}>
            <Upload className={cn(
              'h-8 w-8 transition-colors',
              isDragOver ? 'text-blue-600' : 'text-gray-500'
            )} />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isDragOver ? 'Drop files to upload' : 'Upload Learning Materials'}
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {isDragOver 
              ? 'Release to upload your files to this module'
              : 'Drag and drop your files here, or click to browse and select files from your computer'}
          </p>
          
          {!isDragOver && (
            <>
              <Button type="button" className="mb-6">
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
              
              {/* Supported File Types */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {supportedFileTypes.map((fileType, index) => {
                  const IconComponent = fileType.icon;
                  return (
                    <div key={index} className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                      <IconComponent className="w-6 h-6 text-gray-600 mb-2" />
                      <span className="text-xs font-medium text-gray-900">{fileType.label}</span>
                      <span className="text-xs text-gray-500">{fileType.types}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={Object.values(acceptedTypes).join(',')}
            onChange={onFileSelect}
            className="hidden"
          />
        </div>
        
        {/* Upload Guidelines */}
        <div className="px-6 pb-6">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Upload Guidelines:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Maximum file size: 100MB per file</li>
                <li>Files will be automatically processed for AI-powered learning</li>
                <li>PDFs and presentations will be converted to searchable text</li>
                <li>Audio and video files will be transcribed for better accessibility</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

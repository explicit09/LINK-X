import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Package, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fileTypes } from '../utils/fileUtils';
import { UploadType } from '../types';

interface DropZoneProps {
  type: UploadType;
  isDragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onClick: () => void;
  courseId?: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  type,
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  courseId,
  fileInputRef,
  onFileSelect,
}) => {
  const isPackage = type === 'package';
  const Icon = isPackage ? Package : Upload;
  const iconColor = isDragOver
    ? isPackage
      ? 'text-orange-600'
      : 'text-blue-600'
    : 'text-gray-400';
  const borderColor = isDragOver
    ? isPackage
      ? 'border-orange-400 bg-orange-50'
      : 'border-blue-400 bg-blue-50'
    : 'border-gray-300 hover:border-gray-400';

  return (
    <>
      <Card
        className={cn(
          'canvas-card transition-all duration-200 cursor-pointer border-2 border-dashed',
          borderColor,
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
      >
        <CardContent className="p-8 text-center">
          <Icon className={cn('h-12 w-12 mx-auto mb-4', iconColor)} />
          <h3 className="canvas-heading-3 mb-2">
            {isDragOver
              ? `Drop ${isPackage ? 'package' : 'files'} here`
              : `Upload ${isPackage ? 'Course Package' : 'Individual Files'}`}
          </h3>
          <p className="canvas-body text-gray-500 mb-4">
            {isPackage
              ? 'Upload a complete course as a ZIP or archive file'
              : courseId
                ? 'Add files to your course'
                : 'Upload individual course files'}
          </p>
          <p className="canvas-small text-gray-400">
            {isPackage
              ? 'Supports ZIP, TAR, and RAR archives (up to 500MB)'
              : 'Supports PDF, audio, video, images, and documents (up to 100MB each)'}
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant={isPackage ? 'secondary' : 'default'}
          >
            {isPackage ? (
              <Archive className="h-4 w-4 mr-2" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {isPackage ? 'Choose Package' : 'Choose Files'}
          </Button>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple={!isPackage}
        accept={Object.values(fileTypes[type]).flat().join(',')}
        onChange={onFileSelect}
        className="hidden"
      />
    </>
  );
};

import { FileText, Mic, Video } from 'lucide-react';

export const acceptedTypes = {
  'application/pdf': '.pdf',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
};

export const getFileIcon = (file: File) => {
  const type = file.type;
  if (type.includes('pdf') || type.includes('presentation')) return FileText;
  if (type.includes('audio')) return Mic;
  if (type.includes('video')) return Video;
  return FileText;
};

export const getFileColor = (file: File) => {
  const type = file.type;
  if (type.includes('pdf')) return 'text-red-600';
  if (type.includes('audio')) return 'text-green-600';
  if (type.includes('video')) return 'text-blue-600';
  return 'text-gray-600';
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFileType = (file: File): string | null => {
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (file.size > maxSize) {
    return 'File size must be less than 100MB.';
  }

  if (!Object.keys(acceptedTypes).includes(file.type)) {
    return 'File type not supported. Please upload PDF, audio, video, or presentation files.';
  }

  return null;
};

export const getFileTypeFromMime = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('video')) return 'video';
  return 'document';
};

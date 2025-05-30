import { FileText, Mic, Video, FileImage, Archive, BookOpen } from "lucide-react";

export const fileTypes = {
  individual: {
    'application/pdf': ['.pdf'],
    'audio/*': ['.mp3', '.wav', '.m4a', '.aac'],
    'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'text/*': ['.txt', '.md'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  },
  package: {
    'application/zip': ['.zip'],
    'application/x-tar': ['.tar'],
    'application/gzip': ['.gz', '.tar.gz'],
    'application/x-rar-compressed': ['.rar']
  }
};

export const getFileIcon = (file: File) => {
  const type = file.type;
  const name = file.name.toLowerCase();
  
  if (type.includes('pdf')) return FileText;
  if (type.includes('audio')) return Mic;
  if (type.includes('video')) return Video;
  if (type.includes('image')) return FileImage;
  if (type.includes('zip') || name.includes('tar') || name.includes('rar')) return Archive;
  if (type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return BookOpen;
  return FileText;
};

export const getFileColor = (file: File) => {
  const type = file.type;
  if (type.includes('pdf')) return "text-red-600";
  if (type.includes('audio')) return "text-purple-600";
  if (type.includes('video')) return "text-blue-600";
  if (type.includes('image')) return "text-green-600";
  if (type.includes('zip') || type.includes('tar') || type.includes('rar')) return "text-orange-600";
  return "text-gray-600";
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const generateFileId = () => {
  return 'upload-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};
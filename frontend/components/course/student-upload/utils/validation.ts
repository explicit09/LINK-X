import { fileTypes } from './fileUtils';
import { UploadType } from '../types';

export const validateFile = (file: File, uploadType: UploadType): string | null => {
  // Size validation (500MB for packages, 100MB for individual files)
  const maxSize = uploadType === 'package' ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return `File size must be less than ${uploadType === 'package' ? '500MB' : '100MB'}`;
  }

  // Type validation
  const acceptedTypes = fileTypes[uploadType];
  const isValidType = Object.keys(acceptedTypes).some(type => {
    if (type.includes('*')) {
      return file.type.startsWith(type.replace('*', ''));
    }
    return file.type === type;
  });

  if (!isValidType) {
    const typeList = uploadType === 'package' 
      ? "ZIP, TAR, or RAR archives"
      : "PDF, audio, video, image, or document files";
    return `File type not supported. Please upload ${typeList}.`;
  }

  return null;
};
import { Material } from '../hooks/useModuleManager';

// Format file size from bytes to human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format upload time
export function formatUploadTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Get file type icon
export function getFileIcon(fileType: string): string {
  switch (fileType) {
    case 'application/pdf':
      return '📄';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return '📝';
    case 'text/plain':
      return '📄';
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
      return '🖼️';
    case 'audio/mpeg':
    case 'audio/wav':
    case 'audio/mp3':
      return '🎵';
    case 'video/mp4':
    case 'video/avi':
    case 'video/mov':
      return '🎬';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return '📊';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    case 'application/vnd.ms-powerpoint':
      return '📽️';
    case 'application/zip':
    case 'application/x-rar-compressed':
    case 'application/x-zip-compressed':
      return '📦';
    default:
      return '📎';
  }
}

// Get file type color for UI
export function getFileColor(fileType: string): string {
  switch (fileType) {
    case 'application/pdf':
      return 'text-red-600';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return 'text-blue-600';
    case 'text/plain':
      return 'text-gray-600';
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
      return 'text-green-600';
    case 'audio/mpeg':
    case 'audio/wav':
    case 'audio/mp3':
      return 'text-purple-600';
    case 'video/mp4':
    case 'video/avi':
    case 'video/mov':
      return 'text-orange-600';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return 'text-emerald-600';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    case 'application/vnd.ms-powerpoint':
      return 'text-rose-600';
    default:
      return 'text-gray-500';
  }
}

// Get file type name
export function getFileTypeName(fileType: string): string {
  switch (fileType) {
    case 'application/pdf':
      return 'PDF Document';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'Word Document';
    case 'application/msword':
      return 'Word Document (Legacy)';
    case 'text/plain':
      return 'Text File';
    case 'image/jpeg':
      return 'JPEG Image';
    case 'image/png':
      return 'PNG Image';
    case 'image/gif':
      return 'GIF Image';
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'MP3 Audio';
    case 'audio/wav':
      return 'WAV Audio';
    case 'video/mp4':
      return 'MP4 Video';
    case 'video/avi':
      return 'AVI Video';
    case 'video/mov':
      return 'MOV Video';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'Excel Spreadsheet';
    case 'application/vnd.ms-excel':
      return 'Excel Spreadsheet (Legacy)';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'PowerPoint Presentation';
    case 'application/vnd.ms-powerpoint':
      return 'PowerPoint Presentation (Legacy)';
    case 'application/zip':
      return 'ZIP Archive';
    case 'application/x-rar-compressed':
      return 'RAR Archive';
    default:
      return 'Unknown File Type';
  }
}

// Validate file type
export function isValidFileType(fileType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'video/mp4',
    'video/avi',
    'video/mov',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];

  return allowedTypes.includes(fileType);
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

// Generate thumbnail URL for supported file types
export function getThumbnailUrl(material: Material): string | null {
  if (material.thumbnailUrl) {
    return material.thumbnailUrl;
  }

  // For images, use the download URL as thumbnail
  if (material.fileType.startsWith('image/')) {
    return material.downloadUrl || null;
  }

  // For other file types, we might have server-generated thumbnails
  // This would typically be handled by the backend
  return null;
}

// Check if file supports preview
export function supportsPreview(fileType: string): boolean {
  const previewableTypes = [
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  return previewableTypes.includes(fileType);
}

// Check if file supports AI processing
export function supportsAI(fileType: string): boolean {
  const aiSupportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
  ];

  return aiSupportedTypes.includes(fileType);
}

// Sort materials by different criteria
export function sortMaterials(materials: Material[], sortBy: 'name' | 'date' | 'type' | 'size'): Material[] {
  return [...materials].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'date':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      case 'type':
        return a.fileType.localeCompare(b.fileType);
      case 'size':
        return (b.fileSize || 0) - (a.fileSize || 0);
      default:
        return 0;
    }
  });
}

// Filter materials by file type
export function filterMaterialsByType(materials: Material[], fileType?: string): Material[] {
  if (!fileType) return materials;
  
  return materials.filter(material => material.fileType === fileType);
}

// Group materials by file type
export function groupMaterialsByType(materials: Material[]): Record<string, Material[]> {
  return materials.reduce((groups, material) => {
    const type = getFileTypeName(material.fileType);
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(material);
    return groups;
  }, {} as Record<string, Material[]>);
}
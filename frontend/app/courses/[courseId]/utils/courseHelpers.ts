import { courseColors } from '../types/course.types';

export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '—';

  const date = new Date(dateString);
  // Check if date is valid
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatFileSize = (bytes: number | string): string => {
  if (!bytes || bytes === 0) return '—';

  const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (isNaN(numBytes) || numBytes === 0) return '—';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  const size = parseFloat((numBytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${sizes[i]}`;
};

export const getFileType = (
  mimeType: string,
): 'pdf' | 'audio' | 'video' | 'document' => {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('video')) return 'video';
  return 'document';
};

export const getCourseColor = (courseId: string | undefined) => {
  if (!courseId) return courseColors[0];

  const colorIndex =
    Array.from(courseId.toString()).reduce(
      (sum, char) => sum + char.charCodeAt(0),
      0,
    ) % courseColors.length;

  return courseColors[colorIndex];
};

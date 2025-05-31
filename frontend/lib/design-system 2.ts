// Design System for LEARN-X Platform
// Modern, clean design tokens and utilities

export const designTokens = {
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
};

// File type styling utility
export const getFileTypeStyle = (type: string) => {
  const styles: Record<string, {
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = {
    pdf: {
      icon: 'FileText',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    audio: {
      icon: 'Music',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    video: {
      icon: 'Video',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    image: {
      icon: 'Image',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    document: {
      icon: 'File',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
  };
  
  return styles[type] || styles.document;
};

// Create inline progress component
export const createInlineProgress = (progress: number, className?: string) => {
  return {
    className: `h-1 bg-gray-200 rounded-full overflow-hidden ${className || ''}`,
    style: {
      width: '100%',
    },
    progressStyle: {
      width: `${progress}%`,
      height: '100%',
      backgroundColor: '#3b82f6',
      transition: 'width 0.3s ease',
    },
  };
};

// Create file card component configuration
export const createFileCard = (file: any) => {
  const typeStyle = getFileTypeStyle(file.type);
  
  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return null;
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format upload date
  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return null;
    }
  };
  
  return {
    className: `p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer`,
    typeStyle: typeStyle,
    iconStyle: typeStyle,
    titleClassName: 'text-sm font-medium text-gray-900 line-clamp-1',
    metaClassName: 'text-xs text-gray-500',
    badgeVariant: file.processed ? 'secondary' : 'outline',
    badgeClassName: file.processed ? 'bg-green-100 text-green-800' : '',
    name: file.name,
    displayName: file.name,
    size: formatFileSize(file.size),
    uploadedAt: formatUploadDate(file.uploadedAt),
    statusPill: {
      text: file.processed ? 'Processed' : 'Processing'
    }
  };
};

// Module card styling
export const moduleCardStyles = {
  container: 'bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200',
  header: 'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
  content: 'border-t border-gray-100',
  expandedContent: 'max-h-[600px] overflow-y-auto',
  collapsedContent: 'max-h-0 overflow-hidden',
  transition: 'transition-all duration-300 ease-in-out',
};

// Button variants
export const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
  ghost: 'hover:bg-gray-100 text-gray-700',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

// Animation classes
export const animations = {
  fadeIn: 'animate-in fade-in duration-200',
  slideIn: 'animate-in slide-in-from-bottom-2 duration-200',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
};
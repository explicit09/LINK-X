'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFThumbnailProps {
  materialId: string;
  title: string;
  className?: string;
}

export function PDFThumbnail({
  materialId,
  title,
  className,
}: PDFThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement actual PDF thumbnail generation
    // For now, simulate loading and fall back to improved visual
    const timer = setTimeout(() => {
      setLoading(false);
      // Set to null to show fallback design
      setThumbnailUrl(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [materialId]);

  if (loading) {
    return (
      <div className={cn('relative', className)}>
        <div className="absolute inset-0 bg-red-50 animate-pulse rounded" />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText className="h-12 w-12 text-red-300" />
        </div>
      </div>
    );
  }

  if (thumbnailUrl) {
    return (
      <div className={cn('relative overflow-hidden rounded', className)}>
        <img
          src={thumbnailUrl}
          alt={`Preview of ${title}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>
    );
  }

  // Fallback: Micro page preview (80x60px optimized)
  return (
    <div
      className={cn(
        'relative bg-white border-2 border-red-200 shadow-sm rounded-lg overflow-hidden',
        className,
      )}
    >
      {/* Paper texture background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-red-50/30 to-red-100/50" />

      {/* Simulated page content - optimized for small size */}
      <div className="absolute inset-0 p-1.5 flex flex-col">
        {/* Title area */}
        <div className="h-1.5 bg-red-400/50 rounded-sm mb-0.5" />
        <div className="h-0.5 bg-red-300/40 rounded-sm mb-1 w-2/3" />

        {/* Content lines - fewer but more visible */}
        <div className="space-y-0.5 flex-1">
          <div className="h-0.5 bg-red-300/30 rounded-sm" />
          <div className="h-0.5 bg-red-300/30 rounded-sm w-4/5" />
          <div className="h-0.5 bg-red-300/30 rounded-sm w-3/4" />
          <div className="h-0.5 bg-red-300/30 rounded-sm w-5/6" />
        </div>

        {/* Page number */}
        <div className="text-center">
          <div className="h-0.5 w-1.5 bg-red-400/40 rounded-sm mx-auto" />
        </div>
      </div>

      {/* Subtle document icon in corner */}
      <div className="absolute top-0.5 right-0.5">
        <FileText className="h-3 w-3 text-red-500/60" />
      </div>
    </div>
  );
}

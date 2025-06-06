'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, FileText, Calendar, ChevronRight } from 'lucide-react';

interface CanvasCourseCardProps {
  course: {
    id: string;
    title: string;
    code: string;
    instructor: string;
    term?: string;
    credits?: number;
    enrolledCount?: number;
    materialsCount?: number;
    lastActivity?: string;
    color?: string;
    bannerImage?: string;
  };
  className?: string;
}

// Canvas-inspired color palette
const canvasColors = [
  { name: 'blue', bg: '#1A73E8', pattern: 'dots' },
  { name: 'green', bg: '#0F9D58', pattern: 'lines' },
  { name: 'orange', bg: '#EA8600', pattern: 'waves' },
  { name: 'purple', bg: '#9C27B0', pattern: 'zigzag' },
  { name: 'teal', bg: '#00ACC1', pattern: 'circles' },
  { name: 'red', bg: '#D32F2F', pattern: 'squares' },
];

export function CanvasCourseCard({ course, className }: CanvasCourseCardProps) {
  const router = useRouter();
  
  // Get color based on course ID for consistency
  const colorIndex = parseInt(course.id, 10) % canvasColors.length;
  const courseColor = canvasColors[colorIndex];
  
  const handleClick = () => {
    router.push(`/courses/${course.id}`);
  };

  // Generate pattern SVG for banner
  const getPatternSVG = (pattern: string, color: string) => {
    const patterns: Record<string, string> = {
      dots: `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.2)"/></pattern></defs><rect width="60" height="60" fill="url(#dots-${color})"/></svg>`,
      lines: `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="lines-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="20" y2="20" stroke="rgba(255,255,255,0.2)" stroke-width="2"/></pattern></defs><rect width="60" height="60" fill="url(#lines-${color})"/></svg>`,
      waves: `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="waves-${color}" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0,10 Q10,0 20,10 T40,10" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none"/></pattern></defs><rect width="60" height="60" fill="url(#waves-${color})"/></svg>`,
      circles: `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="circles-${color}" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/></pattern></defs><rect width="60" height="60" fill="url(#circles-${color})"/></svg>`,
      zigzag: `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="zigzag-${color}" x="0" y="0" width="20" height="40" patternUnits="userSpaceOnUse"><path d="M0,20 L10,0 L20,20 L10,40 L0,20" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/></pattern></defs><rect width="60" height="60" fill="url(#zigzag-${color})"/></svg>`,
      squares: `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="squares-${color}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><rect x="5" y="5" width="10" height="10" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/></pattern></defs><rect width="60" height="60" fill="url(#squares-${color})"/></svg>`,
    };
    
    return `data:image/svg+xml,${encodeURIComponent(patterns[pattern] || patterns.dots)}`;
  };

  return (
    <div
      className={cn(
        "group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden",
        "border border-gray-200",
        className
      )}
      onClick={handleClick}
    >
      {/* Course Banner - Canvas style with pattern */}
      <div 
        className="relative h-36 w-full overflow-hidden"
        style={{ backgroundColor: courseColor.bg }}
      >
        {/* Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("${getPatternSVG(courseColor.pattern, courseColor.name)}")`,
            backgroundRepeat: 'repeat',
          }}
        />
        
        {/* Course code overlay */}
        <div className="absolute bottom-3 left-4">
          <span className="text-white text-sm font-medium bg-black/20 px-2 py-1 rounded">
            {course.code}
          </span>
        </div>
      </div>

      {/* Course Content */}
      <div className="p-4 space-y-3">
        {/* Course Title */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
            {course.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {course.instructor}
          </p>
        </div>

        {/* Course Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {course.term && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{course.term}</span>
            </div>
          )}
          {course.credits && (
            <span>{course.credits} credits</span>
          )}
        </div>

        {/* Course Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {course.enrolledCount !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{course.enrolledCount}</span>
              </div>
            )}
            {course.materialsCount !== undefined && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{course.materialsCount}</span>
              </div>
            )}
          </div>
          
          {/* Enter course indicator */}
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>
    </div>
  );
}
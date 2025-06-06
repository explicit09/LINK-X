'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronRight, Users, Calendar, Clock, Award } from 'lucide-react';

interface CanvasCourseHeaderProps {
  course: {
    id: string;
    title: string;
    code: string;
    description?: string;
    instructor?: {
      name: string;
      email?: string;
    };
    term?: string;
    credits?: number;
    enrolledCount?: number;
    category?: string;
  };
  className?: string;
}

// Reuse the same color palette from course cards
const canvasColors = [
  { name: 'blue', bg: '#1A73E8', pattern: 'dots' },
  { name: 'green', bg: '#0F9D58', pattern: 'lines' },
  { name: 'orange', bg: '#EA8600', pattern: 'waves' },
  { name: 'purple', bg: '#9C27B0', pattern: 'zigzag' },
  { name: 'teal', bg: '#00ACC1', pattern: 'circles' },
  { name: 'red', bg: '#D32F2F', pattern: 'squares' },
];

export function CanvasCourseHeader({ course, className }: CanvasCourseHeaderProps) {
  // Get consistent color based on course ID
  const colorIndex = isNaN(parseInt(course.id, 10)) ? 0 : parseInt(course.id, 10) % canvasColors.length;
  const courseColor = canvasColors[colorIndex] || canvasColors[0];

  // Generate pattern SVG
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
    <div className={cn("bg-white", className)}>
      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="px-6 py-3">
          <nav className="flex items-center space-x-1 text-sm">
            <Link 
              href="/dashboard" 
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link 
              href="/courses" 
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              Courses
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{course.code}</span>
          </nav>
        </div>
      </div>

      {/* Course Banner */}
      <div 
        className="relative h-56 w-full overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${courseColor?.bg || '#1A73E8'}dd, ${courseColor?.bg || '#1A73E8'}88, ${courseColor?.bg || '#1A73E8'}aa)`
        }}
      >
        {/* Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("${getPatternSVG(courseColor?.pattern || 'dots', courseColor?.name || 'blue')}")`,
            backgroundRepeat: 'repeat',
          }}
        />
        
        {/* Decorative Elements */}
        <div className="absolute top-6 right-6 opacity-20">
          <div className="w-32 h-32 rounded-full border-4 border-white/30 animate-pulse"></div>
        </div>
        <div className="absolute bottom-8 right-16 opacity-15">
          <div className="w-20 h-20 rounded-full bg-white/20"></div>
        </div>
        <div className="absolute top-1/2 left-6 opacity-10">
          <div className="w-16 h-16 rotate-45 bg-white/20"></div>
        </div>
        
        {/* Course Info Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {/* Top section with category badge */}
          <div className="w-full px-6 pt-6">
            <div className="max-w-7xl mx-auto">
              {course.category && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <Award className="w-4 h-4 text-white" />
                  <span className="text-sm font-medium text-white">
                    {course.category}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom section with course info */}
          <div className="w-full px-6 pb-8">
            <div className="max-w-7xl mx-auto">
              <span className="inline-block text-white/90 text-sm font-semibold bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                {course.code}
              </span>
              <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg leading-tight">
                {course.title}
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                {course.instructor && (
                  <span className="text-lg font-medium">
                    with {course.instructor.name}
                  </span>
                )}
                {course.term && (
                  <span className="text-lg">
                    {course.term}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Metadata Bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-6 text-sm text-gray-600">
            {course.term && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{course.term}</span>
              </div>
            )}
            
            {course.credits && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span>{course.credits} Credits</span>
              </div>
            )}
            
            {course.enrolledCount !== undefined && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{course.enrolledCount} Students</span>
              </div>
            )}
            
            {course.category && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                  {course.category}
                </span>
              </div>
            )}

            {/* Course Progress (if applicable) */}
            <div className="ml-auto flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Last updated 2 days ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
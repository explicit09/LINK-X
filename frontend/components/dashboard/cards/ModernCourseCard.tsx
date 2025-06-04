'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, BookOpen, ChevronRight } from 'lucide-react';

interface CourseCardProps {
  id: string;
  title: string;
  description?: string;
  students: number;
  modules: number;
  status: 'active' | 'draft' | 'archived';
  color: string;
  progress?: number;
  index?: number;
}

/**
 * ModernCourseCard - Displays course information with interactive hover effects
 * EXTRACTED from ModernDashboardV2.tsx to enable reuse across dashboard components
 */
export const ModernCourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  description,
  students,
  modules,
  status,
  color,
  progress,
  index = 0,
}) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    active: 'Active',
    draft: 'Draft',
    archived: 'Archived',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="group cursor-pointer"
    >
      <Card className="relative overflow-hidden bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Color accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: color }}
        />

        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-[#2563EB] transition-colors duration-300">
                  {title}
                </h3>
                <Badge className={cn('text-xs', statusColors[status])}>
                  {statusLabels[status]}
                </Badge>
              </div>
              {description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {description}
                </p>
              )}
            </div>
            <motion.div
              whileHover={{ x: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2563EB]" />
            </motion.div>
          </div>

          {/* Progress bar if progress is provided */}
          {progress !== undefined && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{students} students</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                <span>{modules} modules</span>
              </div>
            </div>
          </div>

          {/* Hover overlay */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
            style={{ backgroundColor: color }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};
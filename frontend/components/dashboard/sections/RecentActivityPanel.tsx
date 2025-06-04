'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Activity, MessageSquare, Clock, TrendingUp } from 'lucide-react';

interface ActivityItem {
  icon: React.ComponentType<any>;
  title: string;
  time: string;
  description: string;
  color: string;
}

interface RecentActivityPanelProps {
  className?: string;
}

/**
 * RecentActivityPanel - Displays recent activities with animations
 * EXTRACTED from ModernDashboardV2.tsx sidebar to enable reuse
 */
export const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({
  className,
}) => {
  const activities: ActivityItem[] = [
    {
      icon: MessageSquare,
      title: 'New discussion in CS101',
      time: '5 minutes ago',
      description: 'John Doe started a discussion about recursion',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Clock,
      title: 'Assignment deadline approaching',
      time: '1 hour ago',
      description: 'Data Structures Lab 3 due in 2 days',
      color: 'bg-amber-100 text-amber-600',
    },
    {
      icon: TrendingUp,
      title: 'Course progress update',
      time: '3 hours ago',
      description: '15 students completed Module 4 in WEB101',
      color: 'bg-green-100 text-green-600',
    },
  ];

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-[#2563EB]" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100"
          >
            <div className={cn('p-2.5 rounded-lg', activity.color)}>
              <activity.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{activity.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 mt-2">{activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
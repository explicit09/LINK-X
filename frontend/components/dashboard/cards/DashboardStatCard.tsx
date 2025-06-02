'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}

/**
 * DashboardStatCard - Displays statistical information with trends
 * EXTRACTED from ModernDashboardV2.tsx to reduce file size and enable reuse
 */
export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  value,
  change,
  icon,
  trend = 'neutral',
  delay = 0,
}) => {
  const trendIcons = {
    up: <ArrowUp className="w-4 h-4" />,
    down: <ArrowDown className="w-4 h-4" />,
    neutral: null,
  };

  const trendColors = {
    up: 'text-[#2563EB]',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="group relative overflow-hidden bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                {title}
              </p>
              <p className="text-4xl font-semibold text-gray-900">{value}</p>
              {change && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    trendColors[trend],
                  )}
                >
                  {trendIcons[trend]}
                  <span>{change}</span>
                </div>
              )}
            </div>
            <motion.div
              className="p-3 bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] text-white rounded-xl shadow-md"
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {icon}
            </motion.div>
          </div>

          {/* Decorative Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </CardContent>
      </Card>
    </motion.div>
  );
};
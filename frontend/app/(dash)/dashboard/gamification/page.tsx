'use client';

import React from 'react';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { GamificationDashboard } from '@/components/gamification';
import { useMockAuth as useAuth } from '@/contexts/MockAuth';
import { motion } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';

export default function GamificationPage() {
  const { user, profile } = useAuth();
  const currentUser = { id: user?.id || "default-user", email: user?.email || "user@example.com", name: user?.name || "Default User", role: "student" };

  return (
    <SharedDashboardLayout 
      pageTitle="Achievements & Progress" 
      currentUser={currentUser}
    >
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-8 h-8" />
                Your Learning Journey
              </h1>
              <p className="mt-2 text-yellow-100">
                Track your progress, maintain streaks, and achieve your learning goals!
              </p>
            </div>
            <Sparkles className="w-16 h-16 text-yellow-200 animate-pulse" />
          </div>
        </motion.div>

        {/* Gamification Dashboard */}
        <GamificationDashboard view="full" />
      </div>
    </SharedDashboardLayout>
  );
}
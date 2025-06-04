'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Zap, 
  Target, 
  Award,
  TrendingUp,
  Star,
  Gift,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

interface GamificationPanelProps {
  points: number;
  level: number;
  streak: number;
  sectionsCompleted: number;
  totalSections: number;
  onAchievementUnlock?: (achievement: Achievement) => void;
}

export function GamificationPanel({
  points,
  level,
  streak,
  sectionsCompleted,
  totalSections,
  onAchievementUnlock
}: GamificationPanelProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(level);
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'first-section',
      title: 'First Steps',
      description: 'Complete your first section',
      icon: <Star className="w-4 h-4" />,
      unlocked: sectionsCompleted >= 1,
      progress: Math.min(sectionsCompleted, 1),
      maxProgress: 1
    },
    {
      id: 'halfway',
      title: 'Halfway Hero',
      description: 'Complete 50% of the content',
      icon: <Target className="w-4 h-4" />,
      unlocked: sectionsCompleted >= totalSections / 2,
      progress: sectionsCompleted,
      maxProgress: Math.ceil(totalSections / 2)
    },
    {
      id: 'speed-reader',
      title: 'Speed Reader',
      description: 'Complete 3 sections in 5 minutes',
      icon: <Zap className="w-4 h-4" />,
      unlocked: false,
      progress: 0,
      maxProgress: 3
    },
    {
      id: 'perfectionist',
      title: 'Perfectionist',
      description: 'Complete all sections',
      icon: <Trophy className="w-4 h-4" />,
      unlocked: sectionsCompleted === totalSections && totalSections > 0,
      progress: sectionsCompleted,
      maxProgress: totalSections
    }
  ]);

  // Check for level up
  useEffect(() => {
    if (level > previousLevel) {
      setShowLevelUp(true);
      setPreviousLevel(level);
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => setShowLevelUp(false), 3000);
    }
  }, [level, previousLevel]);

  // Check for new achievements
  useEffect(() => {
    achievements.forEach(achievement => {
      const wasUnlocked = achievement.unlocked;
      const isNowUnlocked = achievement.progress >= achievement.maxProgress;
      
      if (!wasUnlocked && isNowUnlocked) {
        // Trigger achievement unlock animation
        if (onAchievementUnlock) {
          onAchievementUnlock(achievement);
        }
        
        // Mini confetti for achievement
        confetti({
          particleCount: 50,
          angle: 90,
          spread: 45,
          origin: { x: 0.5, y: 0.8 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        });
      }
    });
  }, [sectionsCompleted, achievements, onAchievementUnlock]);

  const nextLevelPoints = (level + 1) * 100;
  const currentLevelProgress = (points % 100);

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <div className="grid grid-cols-3 gap-4">
          {/* Level */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{level}</span>
              </div>
              <AnimatePresence>
                {showLevelUp && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-sm text-gray-600 mt-1">Level</p>
          </div>

          {/* Points */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">{points}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Points</p>
          </div>

          {/* Streak */}
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">{streak}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Day Streak</p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Level {level}</span>
            <span>Level {level + 1}</span>
          </div>
          <Progress value={currentLevelProgress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1 text-center">
            {currentLevelProgress} / 100 points to next level
          </p>
        </div>
      </Card>

      {/* Achievements */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          Achievements
        </h3>
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                achievement.unlocked 
                  ? "bg-yellow-50 border border-yellow-200" 
                  : "bg-gray-50 border border-gray-200"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                achievement.unlocked 
                  ? "bg-yellow-500 text-white" 
                  : "bg-gray-300 text-gray-500"
              )}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-medium",
                  achievement.unlocked ? "text-gray-900" : "text-gray-500"
                )}>
                  {achievement.title}
                </p>
                <p className="text-sm text-gray-600">{achievement.description}</p>
                {!achievement.unlocked && (
                  <div className="mt-1">
                    <Progress 
                      value={(achievement.progress / achievement.maxProgress) * 100} 
                      className="h-1"
                    />
                  </div>
                )}
              </div>
              {achievement.unlocked && (
                <Badge className="bg-yellow-500 text-white">
                  Unlocked!
                </Badge>
              )}
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Daily Challenge */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              Daily Challenge
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Complete 5 sections today
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              {Math.min(sectionsCompleted, 5)}/5
            </p>
            {sectionsCompleted >= 5 && (
              <Badge className="bg-green-500 text-white mt-1">
                +50 bonus points!
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <Card className="p-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Level Up!</h2>
              <p className="text-lg">You've reached Level {level}!</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
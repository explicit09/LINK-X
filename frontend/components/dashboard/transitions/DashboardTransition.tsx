'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  TrendingUp, 
  Crown, 
  ArrowRight,
  CheckCircle,
  Trophy
} from 'lucide-react';
import { DashboardMode } from '@/hooks/useDashboardMode';
import { cn } from '@/lib/utils';

interface DashboardTransitionProps {
  fromMode: DashboardMode;
  toMode: DashboardMode;
  userProgress: {
    totalXP: number;
    courseCount: number;
    weeklyHours: number;
    currentStreak: number;
  };
  onComplete: () => void;
  children: React.ReactNode;
}

export function DashboardTransition({ 
  fromMode, 
  toMode, 
  userProgress, 
  onComplete, 
  children 
}: DashboardTransitionProps) {
  const [showTransition, setShowTransition] = useState(fromMode !== toMode);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (fromMode !== toMode && showTransition) {
      // Start transition animation
      const timer1 = setTimeout(() => setAnimationStep(1), 500);
      const timer2 = setTimeout(() => setAnimationStep(2), 1500);
      const timer3 = setTimeout(() => {
        setShowTransition(false);
        onComplete();
      }, 2500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [fromMode, toMode, showTransition, onComplete]);

  const getTransitionContent = () => {
    const transitions = {
      [DashboardMode.WELCOME]: {
        [DashboardMode.GUIDED]: {
          title: "Welcome Complete! 🎉",
          subtitle: "Entering Guided Learning Mode",
          description: "You've completed setup and are ready for guided learning!",
          icon: <TrendingUp className="w-12 h-12 text-green-500" />,
          color: "from-green-50 to-blue-50",
          achievements: ["Profile Complete", "First Course Added", "Ready to Learn"]
        },
        [DashboardMode.STANDARD]: {
          title: "Fast Learner! 🚀",
          subtitle: "Upgrading to Standard Dashboard",
          description: "Your progress has unlocked the full dashboard experience!",
          icon: <Sparkles className="w-12 h-12 text-blue-500" />,
          color: "from-blue-50 to-purple-50",
          achievements: ["100+ XP Earned", "Multiple Courses", "Consistent Learning"]
        }
      },
      [DashboardMode.GUIDED]: {
        [DashboardMode.STANDARD]: {
          title: "Level Up! ⭐",
          subtitle: "Activating Standard Dashboard",
          description: "You've built great habits and unlocked advanced features!",
          icon: <TrendingUp className="w-12 h-12 text-blue-500" />,
          color: "from-blue-50 to-purple-50",
          achievements: ["Consistent Learner", "Growing XP", "Multiple Milestones"]
        },
        [DashboardMode.ADVANCED]: {
          title: "Expert Status! 👑",
          subtitle: "Unlocking Advanced Dashboard",
          description: "Your dedication has earned you expert-level features!",
          icon: <Crown className="w-12 h-12 text-purple-500" />,
          color: "from-purple-50 to-yellow-50",
          achievements: ["High Performance", "Long Streaks", "Advanced Learner"]
        }
      },
      [DashboardMode.STANDARD]: {
        [DashboardMode.ADVANCED]: {
          title: "Master Level! 🏆",
          subtitle: "Activating Power User Dashboard",
          description: "You've achieved mastery and unlocked all features!",
          icon: <Crown className="w-12 h-12 text-purple-500" />,
          color: "from-purple-50 to-yellow-50",
          achievements: ["Expert Performance", "Master Learner", "All Features Unlocked"]
        }
      }
    };

    return transitions[fromMode]?.[toMode] || {
      title: "Dashboard Updated! ✨",
      subtitle: "Loading New Experience",
      description: "Your dashboard is adapting to your progress!",
      icon: <Sparkles className="w-12 h-12 text-blue-500" />,
      color: "from-blue-50 to-purple-50",
      achievements: ["Progress Made", "Features Unlocked", "Keep Learning!"]
    };
  };

  const transitionContent = getTransitionContent();

  if (!showTransition) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full mx-4"
      >
        <Card className={cn(
          "border-0 shadow-2xl bg-gradient-to-br",
          transitionContent.color
        )}>
          <CardContent className="p-8 text-center">
            {/* Icon Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: animationStep >= 1 ? 1 : 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 20,
                delay: 0.2
              }}
              className="mb-6"
            >
              {transitionContent.icon}
            </motion.div>

            {/* Title Animation */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: animationStep >= 1 ? 1 : 0, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold mb-2"
            >
              {transitionContent.title}
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: animationStep >= 1 ? 1 : 0, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-lg text-muted-foreground mb-4"
            >
              {transitionContent.subtitle}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: animationStep >= 1 ? 1 : 0, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-sm text-muted-foreground mb-6"
            >
              {transitionContent.description}
            </motion.p>

            {/* Progress Animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: animationStep >= 1 ? 1 : 0, y: 0 }}
              transition={{ delay: 1.1 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Upgrading Dashboard...</span>
                <span className="font-medium">
                  {animationStep >= 2 ? '100%' : '45%'}
                </span>
              </div>
              <Progress 
                value={animationStep >= 2 ? 100 : 45} 
                className="h-2"
              />
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: animationStep >= 2 ? 1 : 0, y: 0 }}
              transition={{ delay: 1.5 }}
              className="space-y-3"
            >
              <h3 className="font-semibold mb-3">Achievements Unlocked:</h3>
              <div className="space-y-2">
                {transitionContent.achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.7 + index * 0.1 }}
                    className="flex items-center gap-3 justify-center"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{achievement}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Final Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: animationStep >= 2 ? 1 : 0, 
                scale: animationStep >= 2 ? 1 : 0.8 
              }}
              transition={{ delay: 2.2 }}
              className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Trophy className="w-4 h-4" />
              <span>Loading your enhanced dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Hook for managing dashboard transitions
export function useDashboardTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    fromMode: DashboardMode;
    toMode: DashboardMode;
  } | null>(null);

  const triggerTransition = (fromMode: DashboardMode, toMode: DashboardMode) => {
    if (fromMode !== toMode) {
      setTransitionData({ fromMode, toMode });
      setIsTransitioning(true);
    }
  };

  const completeTransition = () => {
    setIsTransitioning(false);
    setTransitionData(null);
  };

  return {
    isTransitioning,
    transitionData,
    triggerTransition,
    completeTransition
  };
}
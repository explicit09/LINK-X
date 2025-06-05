'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, Zap, Trophy } from 'lucide-react';

interface XPBarProps {
  currentXP: number;
  requiredXP: number;
  level: number;
  previousXP?: number;
  showAnimation?: boolean;
  compact?: boolean;
  className?: string;
  onLevelUp?: () => void;
}

interface XPGain {
  id: string;
  amount: number;
  x: number;
  y: number;
}

export function XPBar({
  currentXP,
  requiredXP,
  level,
  previousXP,
  showAnimation = true,
  compact = false,
  className,
  onLevelUp
}: XPBarProps) {
  const [displayXP, setDisplayXP] = useState(previousXP || currentXP);
  const [xpGains, setXPGains] = useState<XPGain[]>([]);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const progressPercentage = (displayXP / requiredXP) * 100;
  const containerRef = useRef<HTMLDivElement>(null);

  // Animate XP changes
  useEffect(() => {
    if (previousXP !== undefined && previousXP !== currentXP && showAnimation) {
      // Calculate if we're leveling up
      const willLevelUp = currentXP >= requiredXP && previousXP < requiredXP;
      
      // Show XP gain animation
      const gain = currentXP - previousXP;
      if (gain > 0 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newGain: XPGain = {
          id: Date.now().toString(),
          amount: gain,
          x: rect.width * 0.8,
          y: rect.height / 2
        };
        setXPGains(prev => [...prev, newGain]);
        
        // Remove after animation
        setTimeout(() => {
          setXPGains(prev => prev.filter(g => g.id !== newGain.id));
        }, 2000);
      }

      // Animate the XP counter
      const duration = 1000;
      const startTime = Date.now();
      const startXP = previousXP;
      const endXP = currentXP;

      const animateXP = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuad = (t: number) => t * (2 - t);
        const easedProgress = easeOutQuad(progress);
        
        const newXP = Math.floor(startXP + (endXP - startXP) * easedProgress);
        setDisplayXP(newXP);

        if (progress < 1) {
          requestAnimationFrame(animateXP);
        } else if (willLevelUp) {
          setIsLevelingUp(true);
          onLevelUp?.();
          setTimeout(() => setIsLevelingUp(false), 2000);
        }
      };

      requestAnimationFrame(animateXP);
    } else {
      setDisplayXP(currentXP);
    }
  }, [currentXP, previousXP, requiredXP, showAnimation, onLevelUp]);

  if (compact) {
    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Lv.{level}</span>
          </div>
          <div className="relative w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {displayXP}/{requiredXP}
          </span>
        </div>
        
        {/* XP Gain Animations */}
        <AnimatePresence>
          {xpGains.map(gain => (
            <motion.div
              key={gain.id}
              className="absolute pointer-events-none"
              initial={{ x: gain.x, y: gain.y, opacity: 1, scale: 0.5 }}
              animate={{ y: gain.y - 30, opacity: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <span className="text-yellow-500 font-bold text-sm">
                +{gain.amount} XP
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="space-y-2">
        {/* Level and XP Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full",
                "bg-gradient-to-br from-yellow-400 to-yellow-500",
                "shadow-lg transform transition-transform",
                isLevelingUp && "animate-bounce"
              )}>
                <span className="text-white font-bold text-lg">{level}</span>
              </div>
              {isLevelingUp && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1 }}
                >
                  <div className="w-full h-full rounded-full bg-yellow-400" />
                </motion.div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Level {level}
                </h3>
                {currentXP > previousXP && (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {requiredXP - displayXP} XP to Level {level + 1}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {displayXP.toLocaleString()}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                / {requiredXP.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              "bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          
          {/* Progress text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>

        {/* Level up indicator */}
        <AnimatePresence>
          {isLevelingUp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                <span className="font-bold text-lg">LEVEL UP!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* XP Gain Animations */}
      <AnimatePresence>
        {xpGains.map(gain => (
          <motion.div
            key={gain.id}
            className="absolute pointer-events-none z-50"
            initial={{ x: gain.x, y: gain.y, opacity: 1, scale: 0.5 }}
            animate={{ 
              y: gain.y - 50, 
              opacity: 0, 
              scale: 1.2,
              x: gain.x + (Math.random() - 0.5) * 30 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            <div className="bg-yellow-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
              +{gain.amount} XP
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
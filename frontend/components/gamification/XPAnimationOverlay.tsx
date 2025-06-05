'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamification } from '@/contexts/GamificationContext';
import { Sparkles } from 'lucide-react';

export function XPAnimationOverlay() {
  const { pendingAnimations, clearAnimation } = useGamification();

  // Auto-clear animations after duration
  useEffect(() => {
    pendingAnimations.forEach(animation => {
      const timer = setTimeout(() => {
        clearAnimation(animation.id);
      }, 3000);
      
      return () => clearTimeout(timer);
    });
  }, [pendingAnimations, clearAnimation]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence mode="popLayout">
        {pendingAnimations.map((animation, index) => (
          <motion.div
            key={animation.id}
            className="absolute bottom-20 right-4"
            initial={{ 
              opacity: 0, 
              y: 20, 
              scale: 0.8,
              x: 0
            }}
            animate={{ 
              opacity: 1, 
              y: -(index * 60), 
              scale: 1,
              x: 0
            }}
            exit={{ 
              opacity: 0, 
              y: -(index * 60 + 50), 
              scale: 0.8,
              x: 50
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
          >
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
              <div>
                <div className="font-bold text-sm">+{animation.amount} XP</div>
                <div className="text-xs opacity-90">{animation.action}</div>
              </div>
            </div>
            
            {/* Particle effects */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                initial={{ 
                  x: 0, 
                  y: 0,
                  opacity: 1
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 100,
                  y: -Math.random() * 50 - 20,
                  opacity: 0
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
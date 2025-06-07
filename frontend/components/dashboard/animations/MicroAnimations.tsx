'use client';

import React from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';

// Fade in animation for cards and sections
export function FadeInCard({ 
  children, 
  delay = 0, 
  className = "" 
}: { 
  children: React.ReactNode; 
  delay?: number; 
  className?: string; 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ 
        duration: 0.5, 
        delay: delay,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale animation for interactive elements
export function ScaleOnHover({ 
  children, 
  scale = 1.02,
  className = "" 
}: { 
  children: React.ReactNode; 
  scale?: number;
  className?: string; 
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: scale - 0.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger animation for lists
export function StaggerContainer({ 
  children, 
  staggerDelay = 0.1,
  className = "" 
}: { 
  children: React.ReactNode; 
  staggerDelay?: number;
  className?: string; 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Number counter animation
export function AnimatedNumber({ 
  value, 
  duration = 1, 
  className = "" 
}: { 
  value: number; 
  duration?: number;
  className?: string; 
}) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const startTime = Date.now();
      const startValue = displayValue;
      const endValue = value;

      const animate = () => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const currentValue = startValue + (endValue - startValue) * easeOutQuart;
        setDisplayValue(Math.round(currentValue));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }
  }, [value, duration, isInView, displayValue]);

  return (
    <span ref={ref} className={className}>
      {displayValue.toLocaleString()}
    </span>
  );
}

// Progress bar animation
export function AnimatedProgress({ 
  value, 
  maxValue = 100, 
  delay = 0,
  className = "" 
}: { 
  value: number; 
  maxValue?: number;
  delay?: number;
  className?: string; 
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className={`relative bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
        transition={{ 
          duration: 1.5, 
          delay: delay,
          ease: [0.4, 0.0, 0.2, 1]
        }}
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
      />
    </div>
  );
}

// Floating action animation
export function FloatingAction({ 
  children, 
  duration = 2,
  delay = 0,
  className = "" 
}: { 
  children: React.ReactNode; 
  duration?: number;
  delay?: number;
  className?: string; 
}) {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [-2, 2, -2] }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Pulse animation for attention-grabbing elements
export function PulseGlow({ 
  children, 
  color = "blue",
  className = "" 
}: { 
  children: React.ReactNode; 
  color?: string;
  className?: string; 
}) {
  const glowColors = {
    blue: "0 0 20px rgba(59, 130, 246, 0.5)",
    purple: "0 0 20px rgba(147, 51, 234, 0.5)",
    green: "0 0 20px rgba(34, 197, 94, 0.5)",
    yellow: "0 0 20px rgba(234, 179, 8, 0.5)",
    red: "0 0 20px rgba(239, 68, 68, 0.5)"
  };

  return (
    <motion.div
      animate={{
        boxShadow: [
          "0 0 0px rgba(0,0,0,0)",
          glowColors[color as keyof typeof glowColors] || glowColors.blue,
          "0 0 0px rgba(0,0,0,0)"
        ]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={`rounded-lg ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Slide in from direction
export function SlideIn({ 
  children, 
  direction = "left",
  delay = 0,
  className = "" 
}: { 
  children: React.ReactNode; 
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  className?: string; 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const variants = {
    left: { x: -50, opacity: 0 },
    right: { x: 50, opacity: 0 },
    up: { y: -50, opacity: 0 },
    down: { y: 50, opacity: 0 }
  };

  return (
    <motion.div
      ref={ref}
      initial={variants[direction]}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : variants[direction]}
      transition={{ 
        duration: 0.6, 
        delay: delay,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Bounce animation for celebration elements
export function BounceIn({ 
  children, 
  delay = 0,
  className = "" 
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string; 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0, opacity: 0 }}
      animate={isInView ? { 
        scale: [0, 1.1, 1], 
        opacity: [0, 1, 1] 
      } : { 
        scale: 0, 
        opacity: 0 
      }}
      transition={{ 
        duration: 0.6, 
        delay: delay,
        times: [0, 0.7, 1],
        ease: [0.4, 0.0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Typewriter effect for text
export function TypewriterText({ 
  text, 
  delay = 0,
  speed = 50,
  className = "" 
}: { 
  text: string; 
  delay?: number;
  speed?: number;
  className?: string; 
}) {
  const [displayedText, setDisplayedText] = React.useState("");
  const [showCursor, setShowCursor] = React.useState(true);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        let index = 0;
        const interval = setInterval(() => {
          setDisplayedText(text.slice(0, index + 1));
          index++;
          if (index >= text.length) {
            clearInterval(interval);
            setTimeout(() => setShowCursor(false), 1000);
          }
        }, speed);

        return () => clearInterval(interval);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [text, delay, speed, isInView]);

  return (
    <span ref={ref} className={className}>
      {displayedText}
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block ml-1"
        >
          |
        </motion.span>
      )}
    </span>
  );
}
'use client';

import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ToolbarContainerProps } from '../types';
import { TOOLBAR_ANIMATION, TOOLS_BY_BLOCK_KIND } from '../constants';

export const ToolbarContainer = ({
  isToolbarVisible,
  isLoading,
  selectedTool,
  blockKind,
  children,
  onHoverStart,
  onHoverEnd,
  onAnimationStart,
  onAnimationComplete,
  toolbarRef,
}: ToolbarContainerProps) => {
  const getAnimateState = () => {
    if (!isToolbarVisible) {
      return { opacity: 1, y: 0, height: 54, transition: { delay: 0 } };
    }

    if (selectedTool === 'adjust-reading-level') {
      return {
        opacity: 1,
        y: 0,
        height: 6 * 43,
        transition: { delay: 0 },
        scale: 0.95,
      };
    }

    return {
      opacity: 1,
      y: 0,
      height: TOOLS_BY_BLOCK_KIND[blockKind].length * 50,
      transition: { delay: 0 },
      scale: 1,
    };
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className="cursor-pointer absolute right-6 bottom-6 p-1.5 border rounded-full shadow-lg bg-background flex flex-col justify-end"
        initial={TOOLBAR_ANIMATION.initial}
        animate={getAnimateState()}
        exit={TOOLBAR_ANIMATION.exit}
        transition={TOOLBAR_ANIMATION.transition}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
        onAnimationStart={onAnimationStart}
        onAnimationComplete={onAnimationComplete}
        ref={toolbarRef}
      >
        {children}
      </motion.div>
    </TooltipProvider>
  );
};
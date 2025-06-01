/**
 * Block layout component - handles responsive layout and animations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UIBlock } from '../types/block';

interface BlockLayoutProps {
  block: UIBlock;
  isMobile: boolean;
  windowWidth?: number;
  windowHeight?: number;
  children: React.ReactNode;
  messagesPanel?: React.ReactNode;
  isCurrentVersion: boolean;
  className?: string;
}

export function BlockLayout({
  block,
  isMobile,
  windowWidth,
  windowHeight,
  children,
  messagesPanel,
  isCurrentVersion,
  className,
}: BlockLayoutProps) {
  const getInitialProps = () => {
    return {
      opacity: 1,
      x: block.boundingBox.left,
      y: block.boundingBox.top,
      height: block.boundingBox.height,
      width: block.boundingBox.width,
      borderRadius: 50,
    };
  };

  const getAnimateProps = () => {
    if (isMobile) {
      return {
        opacity: 1,
        x: 0,
        y: 0,
        height: windowHeight,
        width: windowWidth ? windowWidth : 'calc(100dvw)',
        borderRadius: 0,
        transition: {
          delay: 0,
          type: 'spring',
          stiffness: 200,
          damping: 30,
          duration: 5000,
        },
      };
    }

    return {
      opacity: 1,
      x: 400,
      y: 0,
      height: windowHeight,
      width: windowWidth ? windowWidth - 400 : 'calc(100dvw-400px)',
      borderRadius: 0,
      transition: {
        delay: 0,
        type: 'spring',
        stiffness: 200,
        damping: 30,
      },
    };
  };

  return (
    <div className="fixed inset-0 z-50">
      <AnimatePresence>
        {messagesPanel && (
          <motion.div
            className="fixed bg-background dark:bg-muted h-dvh flex flex-col border-r dark:border-zinc-700 border-zinc-200"
            initial={{
              opacity: 0,
              x: -400,
              width: 400,
            }}
            animate={{
              opacity: 1,
              x: 0,
              width: 400,
              transition: {
                delay: 0,
                type: 'spring',
                stiffness: 200,
                damping: 30,
              },
            }}
            exit={{
              opacity: 0,
              x: 0,
              scale: 1,
              transition: { duration: 0 },
            }}
          >
            <AnimatePresence>
              {!isCurrentVersion && (
                <motion.div
                  className="left-0 absolute h-dvh w-[400px] top-0 bg-zinc-900/50 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>

            {messagesPanel}
          </motion.div>
        )}

        <motion.div
          className={cn(
            'fixed dark:bg-muted bg-background h-dvh flex flex-col overflow-y-scroll border-l dark:border-zinc-700 border-zinc-200',
            className,
          )}
          initial={getInitialProps()}
          animate={getAnimateProps()}
          exit={{
            opacity: 0,
            scale: 0.5,
            transition: { duration: 0.1 },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

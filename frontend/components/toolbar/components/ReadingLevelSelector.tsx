'use client';

import { motion } from 'framer-motion';
import { nanoid } from 'nanoid';
import cx from 'classnames';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SummarizeIcon, ArrowUpIcon } from '@/components/icons';
import type { ReadingLevelSelectorProps } from '../types';
import { READING_LEVELS, DEFAULT_READING_LEVEL } from '../constants';
import { useReadingLevel } from '../hooks';

const randomArr = [...Array(6)].map(() => nanoid(5));

export const ReadingLevelSelector = ({
  setSelectedTool,
  append,
  isAnimating,
}: ReadingLevelSelectorProps) => {
  const {
    y,
    currentLevel,
    hasUserSelectedLevel,
    setHasUserSelectedLevel,
    dragConstraints,
  } = useReadingLevel();

  const handleDragEnd = () => {
    if (currentLevel === DEFAULT_READING_LEVEL) {
      setSelectedTool(null);
    } else {
      setHasUserSelectedLevel(true);
    }
  };

  const handleClick = () => {
    if (currentLevel !== DEFAULT_READING_LEVEL && hasUserSelectedLevel) {
      append({
        role: 'user',
        content: `Please adjust the reading level to ${READING_LEVELS[currentLevel]} level.`,
      });
      setSelectedTool(null);
    }
  };

  return (
    <div className="relative flex flex-col justify-end items-center">
      {randomArr.map((id) => (
        <motion.div
          key={id}
          className="size-[40px] flex flex-row items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="size-2 rounded-full bg-muted-foreground/40" />
        </motion.div>
      ))}

      <TooltipProvider>
        <Tooltip open={!isAnimating}>
          <TooltipTrigger asChild>
            <motion.div
              className={cx(
                'absolute bg-background p-3 border rounded-full flex flex-row items-center',
                {
                  'bg-primary text-primary-foreground':
                    currentLevel !== DEFAULT_READING_LEVEL,
                  'bg-background text-foreground':
                    currentLevel === DEFAULT_READING_LEVEL,
                },
              )}
              style={{ y }}
              drag="y"
              dragElastic={0}
              dragMomentum={false}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              dragConstraints={dragConstraints}
              onDragStart={() => setHasUserSelectedLevel(false)}
              onDragEnd={handleDragEnd}
              onClick={handleClick}
            >
              {currentLevel === DEFAULT_READING_LEVEL ? (
                <SummarizeIcon />
              ) : (
                <ArrowUpIcon />
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            sideOffset={16}
            className="bg-foreground text-background text-sm rounded-2xl p-3 px-4"
          >
            {READING_LEVELS[currentLevel]}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

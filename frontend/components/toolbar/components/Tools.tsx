'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Tool } from './Tool';
import type { ToolsProps } from '../types';
import { TOOLS_BY_BLOCK_KIND } from '../constants';

export const Tools = ({
  isToolbarVisible,
  selectedTool,
  setSelectedTool,
  append,
  isAnimating,
  setIsToolbarVisible,
  blockKind,
}: ToolsProps) => {
  const [primaryTool, ...secondaryTools] = TOOLS_BY_BLOCK_KIND[blockKind];

  return (
    <motion.div
      className="flex flex-col gap-1.5"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <AnimatePresence>
        {isToolbarVisible &&
          secondaryTools.map((secondaryTool) => (
            <Tool
              key={secondaryTool.type}
              type={secondaryTool.type}
              description={secondaryTool.description}
              icon={secondaryTool.icon}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              append={append}
              isAnimating={isAnimating}
            />
          ))}
      </AnimatePresence>

      <Tool
        type={primaryTool.type}
        description={primaryTool.description}
        icon={primaryTool.icon}
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        isToolbarVisible={isToolbarVisible}
        setIsToolbarVisible={setIsToolbarVisible}
        append={append}
        isAnimating={isAnimating}
      />
    </motion.div>
  );
};

import { useState, useEffect } from 'react';
import { useMotionValue, useTransform } from 'framer-motion';
import { 
  DEFAULT_READING_LEVEL, 
  READING_LEVEL_DRAG_CONSTRAINTS,
  READING_LEVEL_Y_OFFSET 
} from '../constants';

export const useReadingLevel = () => {
  const y = useMotionValue(READING_LEVEL_Y_OFFSET);
  const yToLevel = useTransform(y, [0, -READING_LEVEL_DRAG_CONSTRAINTS], [0, 5]);
  
  const [currentLevel, setCurrentLevel] = useState(DEFAULT_READING_LEVEL);
  const [hasUserSelectedLevel, setHasUserSelectedLevel] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = yToLevel.on('change', (latest) => {
      const level = Math.min(5, Math.max(0, Math.round(Math.abs(latest))));
      setCurrentLevel(level);
    });

    return () => unsubscribe();
  }, [yToLevel]);

  return {
    y,
    currentLevel,
    hasUserSelectedLevel,
    setHasUserSelectedLevel,
    dragConstraints: { top: -READING_LEVEL_DRAG_CONSTRAINTS, bottom: 0 }
  };
};
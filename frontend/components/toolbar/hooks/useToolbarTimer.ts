import { useEffect, useRef } from 'react';
import { TOOLBAR_CLOSE_DELAY } from '../constants';

export const useToolbarTimer = (
  setSelectedTool: (tool: string | null) => void,
  setIsToolbarVisible: (visible: boolean) => void,
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const startCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSelectedTool(null);
      setIsToolbarVisible(false);
    }, TOOLBAR_CLOSE_DELAY);
  };

  const cancelCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { startCloseTimer, cancelCloseTimer };
};

/**
 * Block UI state management hook
 */

import { useState, useCallback } from 'react';
import { useWindowSize } from 'usehooks-ts';
import { useSidebar } from '@/components/ui/sidebar';
import type { ConsoleOutput } from '../types/block';

export function useBlockState() {
  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [consoleOutputs, setConsoleOutputs] = useState<Array<ConsoleOutput>>([]);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  const { open: isSidebarOpen } = useSidebar();
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  // Version navigation handler
  const handleVersionChange = useCallback((
    type: 'next' | 'prev' | 'toggle' | 'latest',
    currentVersionIndex: number,
    documentsLength: number,
    setCurrentVersionIndex: (index: number) => void
  ) => {
    switch (type) {
      case 'next':
        if (currentVersionIndex < documentsLength - 1) {
          setCurrentVersionIndex(currentVersionIndex + 1);
        }
        break;
      case 'prev':
        if (currentVersionIndex > 0) {
          setCurrentVersionIndex(currentVersionIndex - 1);
        }
        break;
      case 'toggle':
        setMode(mode === 'edit' ? 'diff' : 'edit');
        break;
      case 'latest':
        setCurrentVersionIndex(documentsLength - 1);
        break;
    }
  }, [mode]);

  // Compute derived state
  const isCurrentVersion = (currentVersionIndex: number, documentsLength: number) => {
    return currentVersionIndex === documentsLength - 1;
  };

  return {
    // State
    mode,
    consoleOutputs,
    isToolbarVisible,
    isSidebarOpen,
    windowWidth,
    windowHeight,
    isMobile,
    
    // Actions
    setMode,
    setConsoleOutputs,
    setIsToolbarVisible,
    handleVersionChange,
    
    // Derived state
    isCurrentVersion,
  };
}
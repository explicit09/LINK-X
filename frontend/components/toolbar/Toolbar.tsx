'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { useOnClickOutside } from 'usehooks-ts';
import type { ToolbarProps } from './types';
import {
  Tools,
  ReadingLevelSelector,
  ToolbarContainer,
  StopButton,
} from './components';
import { useToolbarTimer } from './hooks';

const PureToolbar = ({
  isToolbarVisible,
  setIsToolbarVisible,
  append,
  isLoading,
  stop,
  setMessages,
  blockKind,
}: ToolbarProps) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const { startCloseTimer, cancelCloseTimer } = useToolbarTimer(
    setSelectedTool,
    setIsToolbarVisible,
  );

  useOnClickOutside(toolbarRef, () => {
    setIsToolbarVisible(false);
    setSelectedTool(null);
  });

  useEffect(() => {
    if (isLoading) {
      setIsToolbarVisible(false);
    }
  }, [isLoading, setIsToolbarVisible]);

  const handleHoverStart = () => {
    if (isLoading) return;
    cancelCloseTimer();
    setIsToolbarVisible(true);
  };

  const handleHoverEnd = () => {
    if (isLoading) return;
    startCloseTimer();
  };

  const renderContent = () => {
    if (isLoading) {
      return <StopButton stop={stop} setMessages={setMessages} />;
    }

    if (selectedTool === 'adjust-reading-level') {
      return (
        <ReadingLevelSelector
          key="reading-level-selector"
          append={append}
          setSelectedTool={setSelectedTool}
          isAnimating={isAnimating}
        />
      );
    }

    return (
      <Tools
        key="tools"
        append={append}
        isAnimating={isAnimating}
        isToolbarVisible={isToolbarVisible}
        selectedTool={selectedTool}
        setIsToolbarVisible={setIsToolbarVisible}
        setSelectedTool={setSelectedTool}
        blockKind={blockKind}
      />
    );
  };

  return (
    <ToolbarContainer
      isToolbarVisible={isToolbarVisible}
      isLoading={isLoading}
      selectedTool={selectedTool}
      blockKind={blockKind}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onAnimationStart={() => setIsAnimating(true)}
      onAnimationComplete={() => setIsAnimating(false)}
      toolbarRef={toolbarRef}
    >
      {renderContent()}
    </ToolbarContainer>
  );
};

export const Toolbar = memo(PureToolbar, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isToolbarVisible !== nextProps.isToolbarVisible) return false;
  if (prevProps.blockKind !== nextProps.blockKind) return false;

  return true;
});

import { useState, useCallback } from 'react';
import type { ToolType, AppendMessage } from '../types';
import { TOOL_MESSAGES } from '../constants';

export const useToolSelection = (
  append: AppendMessage,
  isToolbarVisible?: boolean,
  setIsToolbarVisible?: (visible: boolean) => void
) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleToolSelect = useCallback(
    (type: ToolType) => {
      if (!isToolbarVisible && setIsToolbarVisible) {
        setIsToolbarVisible(true);
        return;
      }

      if (!selectedTool) {
        setSelectedTool(type);
        return;
      }

      if (selectedTool !== type) {
        setSelectedTool(type);
      } else {
        const message = TOOL_MESSAGES[type];
        if (message) {
          append({
            role: 'user',
            content: message,
          });
          setSelectedTool(null);
        }
      }
    },
    [isToolbarVisible, selectedTool, setIsToolbarVisible, append]
  );

  return { selectedTool, setSelectedTool, handleToolSelect };
};
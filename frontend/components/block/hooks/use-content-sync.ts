/**
 * Content synchronization hook
 */

import { useCallback, useEffect } from 'react';
import { useBlock } from '@/hooks/use-block';
import type { Document } from '@/lib/db/schema';

interface UseContentSyncProps {
  document: Document | null;
  currentVersionIndex: number;
  documents: Array<Document> | undefined;
  getDocumentContentById: (index: number) => string;
  debouncedHandleContentChange: (content: string) => void;
  setIsContentDirty: (dirty: boolean) => void;
}

export function useContentSync({
  document,
  currentVersionIndex,
  documents,
  getDocumentContentById,
  debouncedHandleContentChange,
  setIsContentDirty,
}: UseContentSyncProps) {
  const { block, setBlock } = useBlock();

  // Handle content changes from editor
  const handleContentChange = useCallback((updatedContent: string) => {
    if (!block) return;

    // Update block content immediately for UI responsiveness
    setBlock((currentBlock) => ({
      ...currentBlock,
      content: updatedContent,
    }));

    // Mark content as dirty
    setIsContentDirty(true);

    // Debounced save to backend
    debouncedHandleContentChange(updatedContent);
  }, [block, setBlock, setIsContentDirty, debouncedHandleContentChange]);

  // Update block content when version changes
  useEffect(() => {
    if (documents && currentVersionIndex >= 0) {
      const content = getDocumentContentById(currentVersionIndex);
      setBlock((currentBlock) => ({
        ...currentBlock,
        content,
      }));
    }
  }, [currentVersionIndex, documents, getDocumentContentById, setBlock]);

  // Get current content for display
  const getCurrentContent = useCallback(() => {
    if (currentVersionIndex >= 0 && documents) {
      return getDocumentContentById(currentVersionIndex);
    }
    return block.content;
  }, [currentVersionIndex, documents, getDocumentContentById, block.content]);

  return {
    handleContentChange,
    getCurrentContent,
    currentContent: getCurrentContent(),
  };
}
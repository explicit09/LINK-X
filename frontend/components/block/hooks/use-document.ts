/**
 * Document management hook
 */

import { useState, useEffect, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useDebounceCallback } from 'usehooks-ts';
import type { Document, Suggestion } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { useBlock } from '@/hooks/use-block';
import type { UIBlock } from '../types/block';

export function useDocument() {
  const { block, setBlock } = useBlock();
  const { mutate } = useSWRConfig();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [isContentDirty, setIsContentDirty] = useState(false);

  // Fetch documents
  const {
    data: documents,
    isLoading: isDocumentsFetching,
    mutate: mutateDocuments,
  } = useSWR<Array<Document>>(
    block.documentId !== 'init' && block.status !== 'streaming'
      ? `/api/document?id=${block.documentId}`
      : null,
    fetcher,
  );

  // Fetch suggestions
  const { data: suggestions } = useSWR<Array<Suggestion>>(
    documents && block && block.status !== 'streaming'
      ? `/api/suggestions?documentId=${block.documentId}`
      : null,
    fetcher,
    {
      dedupingInterval: 5000,
    },
  );

  // Update document when documents change
  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setBlock((currentBlock) => ({
          ...currentBlock,
          content: mostRecentDocument.content ?? '',
        }));
      }
    }
  }, [documents, setBlock]);

  // Revalidate documents when block status changes
  useEffect(() => {
    mutateDocuments();
  }, [block.status, mutateDocuments]);

  // Handle content changes with optimistic updates
  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!block) return;

      mutate<Array<Document>>(
        `/api/document?id=${block.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) return undefined;

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            await fetch(`/api/document?id=${block.documentId}`, {
              method: 'POST',
              body: JSON.stringify({
                title: block.title,
                content: updatedContent,
                kind: block.kind,
              }),
            });

            setIsContentDirty(false);

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false },
      );
    },
    [block, mutate],
  );

  // Debounced content change handler
  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000,
  );

  // Save content immediately
  const saveContent = useCallback(async () => {
    if (!block || !document) return;

    try {
      await fetch(`/api/document?id=${block.documentId}`, {
        method: 'POST',
        body: JSON.stringify({
          title: block.title,
          content: block.content,
          kind: block.kind,
        }),
      });
      
      setIsContentDirty(false);
      mutateDocuments();
    } catch (error) {
      console.error('Failed to save document:', error);
    }
  }, [block, document, mutateDocuments]);

  // Get document content by index
  const getDocumentContentById = useCallback((index: number): string => {
    if (!documents || index < 0 || index >= documents.length) {
      return '';
    }
    return documents[index]?.content ?? '';
  }, [documents]);

  return {
    // Data
    documents,
    document,
    suggestions,
    currentVersionIndex,
    isContentDirty,
    isDocumentsFetching,
    
    // Actions
    setDocument,
    setCurrentVersionIndex,
    setIsContentDirty,
    handleContentChange,
    debouncedHandleContentChange,
    saveContent,
    getDocumentContentById,
    mutateDocuments,
  };
}
/**
 * Block editor component - handles text and code editing
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Editor } from '@/components/editor';
import { CodeEditor } from '@/components/code-editor';
import { Console } from '@/components/console';
import { DiffView } from '@/components/diffview';
import { DocumentSkeleton } from '@/components/document-skeleton';
import type { UIBlock, ConsoleOutput } from '../types/block';
import type { Document, Suggestion } from '@/lib/db/schema';

interface BlockEditorProps {
  block: UIBlock;
  mode: 'edit' | 'diff';
  document: Document | null;
  currentContent: string;
  currentVersionIndex: number;
  documents: Array<Document> | undefined;
  suggestions: Array<Suggestion> | undefined;
  consoleOutputs: Array<ConsoleOutput>;
  isDocumentsFetching: boolean;
  isCurrentVersion: boolean;
  isReadonly: boolean;
  onContentChange: (content: string) => void;
  getDocumentContentById: (index: number) => string;
  setConsoleOutputs: (outputs: Array<ConsoleOutput>) => void;
}

function BlockEditorComponent({
  block,
  mode,
  document,
  currentContent,
  currentVersionIndex,
  documents,
  suggestions,
  consoleOutputs,
  isDocumentsFetching,
  isCurrentVersion,
  isReadonly,
  onContentChange,
  getDocumentContentById,
  setConsoleOutputs,
}: BlockEditorProps) {
  if (isDocumentsFetching) {
    return <DocumentSkeleton />;
  }

  if (mode === 'diff' && documents) {
    return (
      <DiffView
        oldContent={
          currentVersionIndex > 0
            ? getDocumentContentById(currentVersionIndex - 1)
            : ''
        }
        newContent={currentContent}
        oldTitle={
          currentVersionIndex > 0
            ? `Version ${currentVersionIndex}`
            : 'Previous'
        }
        newTitle={`Version ${currentVersionIndex + 1}`}
      />
    );
  }

  if (block.kind === 'code') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            initialValue={currentContent}
            language="javascript"
            onChange={onContentChange}
            readOnly={isReadonly || !isCurrentVersion}
          />
        </div>

        {consoleOutputs.length > 0 && (
          <div className="h-48 border-t border-gray-200 dark:border-gray-700">
            <Console
              outputs={consoleOutputs}
              onClear={() => setConsoleOutputs([])}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Editor
      content={currentContent}
      onChange={onContentChange}
      suggestions={suggestions}
      isCurrentVersion={isCurrentVersion}
      currentVersionIndex={currentVersionIndex}
      status={block.status}
      saveContent={() => {}} // Handled by parent
      readOnly={isReadonly || !isCurrentVersion}
    />
  );
}

export const BlockEditor = memo(BlockEditorComponent);

/**
 * Block toolbar component wrapper
 */

import { Toolbar } from '@/components/toolbar';
import { VersionFooter } from '@/components/version-footer';
import { BlockActions } from '@/components/block-actions';
import { BlockCloseButton } from '@/components/block-close-button';
import type { Document, Suggestion } from '@/lib/db/schema';
import type { UIBlock } from '../types/block';

interface BlockToolbarProps {
  block: UIBlock;
  document: Document | null;
  documents: Array<Document> | undefined;
  suggestions: Array<Suggestion> | undefined;
  currentVersionIndex: number;
  mode: 'edit' | 'diff';
  isToolbarVisible: boolean;
  isCurrentVersion: boolean;
  isContentDirty: boolean;
  isReadonly: boolean;
  onVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  onSaveContent: () => void;
  setMode: (mode: 'edit' | 'diff') => void;
  setIsToolbarVisible: (visible: boolean) => void;
}

export function BlockToolbar({
  block,
  document,
  documents,
  suggestions,
  currentVersionIndex,
  mode,
  isToolbarVisible,
  isCurrentVersion,
  isContentDirty,
  isReadonly,
  onVersionChange,
  onSaveContent,
  setMode,
  setIsToolbarVisible,
}: BlockToolbarProps) {
  return (
    <>
      {/* Close Button */}
      <BlockCloseButton />

      {/* Main Toolbar */}
      {isToolbarVisible && (
        <Toolbar
          isToolbarVisible={isToolbarVisible}
          setIsToolbarVisible={setIsToolbarVisible}
          saveContent={onSaveContent}
          currentVersionIndex={currentVersionIndex}
          suggestions={suggestions}
          documents={documents}
          mode={mode}
          setMode={setMode}
          block={block}
          isReadonly={isReadonly}
        />
      )}

      {/* Block Actions */}
      <BlockActions
        block={block}
        document={document}
        isToolbarVisible={isToolbarVisible}
        isContentDirty={isContentDirty}
        setIsToolbarVisible={setIsToolbarVisible}
        saveContent={onSaveContent}
      />

      {/* Version Footer */}
      {documents && documents.length > 1 && (
        <VersionFooter
          currentVersionIndex={currentVersionIndex}
          documents={documents}
          onVersionChange={onVersionChange}
          mode={mode}
          isCurrentVersion={isCurrentVersion}
        />
      )}
    </>
  );
}

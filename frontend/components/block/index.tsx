/**
 * Refactored Block Component - Modular and maintainable
 */

import { memo } from 'react';
import { useBlock } from '@/hooks/use-block';
import { useDocument } from './hooks/use-document';
import { useBlockState } from './hooks/use-block-state';
import { useContentSync } from './hooks/use-content-sync';
import {
  BlockEditor,
  BlockLayout,
  BlockMessagesPanel,
  BlockToolbar,
} from './components';
import type { BlockProps } from './types/block';

function PureBlock({
  chatId,
  input,
  setInput,
  handleSubmit,
  isLoading,
  stop,
  attachments,
  setAttachments,
  append,
  messages,
  setMessages,
  votes,
  reload,
  isReadonly,
}: BlockProps) {
  const { block } = useBlock();

  // Document management
  const {
    documents,
    document,
    suggestions,
    currentVersionIndex,
    isContentDirty,
    isDocumentsFetching,
    setDocument,
    setCurrentVersionIndex,
    setIsContentDirty,
    debouncedHandleContentChange,
    saveContent,
    getDocumentContentById,
  } = useDocument();

  // UI state management
  const {
    mode,
    consoleOutputs,
    isToolbarVisible,
    isMobile,
    windowWidth,
    windowHeight,
    setMode,
    setConsoleOutputs,
    setIsToolbarVisible,
    handleVersionChange,
    isCurrentVersion,
  } = useBlockState();

  // Content synchronization
  const { handleContentChange, currentContent } = useContentSync({
    document,
    currentVersionIndex,
    documents,
    getDocumentContentById,
    debouncedHandleContentChange,
    setIsContentDirty,
  });

  // Computed state
  const isCurrentVersionComputed = isCurrentVersion(
    currentVersionIndex,
    documents?.length ?? 0,
  );

  // Version change handler with context
  const handleVersionChangeWithContext = (
    type: 'next' | 'prev' | 'toggle' | 'latest',
  ) => {
    handleVersionChange(
      type,
      currentVersionIndex,
      documents?.length ?? 0,
      setCurrentVersionIndex,
    );
  };

  if (!block.isVisible) {
    return null;
  }

  const messagesPanel = (
    <BlockMessagesPanel
      block={block}
      chatId={chatId}
      input={input}
      setInput={setInput}
      handleSubmit={handleSubmit}
      isLoading={isLoading}
      stop={stop}
      attachments={attachments}
      setAttachments={setAttachments}
      append={append}
      messages={messages}
      setMessages={setMessages}
      votes={votes}
      reload={reload}
      isReadonly={isReadonly}
    />
  );

  return (
    <BlockLayout
      block={block}
      isMobile={isMobile}
      windowWidth={windowWidth}
      windowHeight={windowHeight}
      messagesPanel={messagesPanel}
      isCurrentVersion={isCurrentVersionComputed}
    >
      {/* Toolbar */}
      <BlockToolbar
        block={block}
        document={document}
        documents={documents}
        suggestions={suggestions}
        currentVersionIndex={currentVersionIndex}
        mode={mode}
        isToolbarVisible={isToolbarVisible}
        isCurrentVersion={isCurrentVersionComputed}
        isContentDirty={isContentDirty}
        isReadonly={isReadonly}
        onVersionChange={handleVersionChangeWithContext}
        onSaveContent={saveContent}
        setMode={setMode}
        setIsToolbarVisible={setIsToolbarVisible}
      />

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <BlockEditor
          block={block}
          mode={mode}
          document={document}
          currentContent={currentContent}
          currentVersionIndex={currentVersionIndex}
          documents={documents}
          suggestions={suggestions}
          consoleOutputs={consoleOutputs}
          isDocumentsFetching={isDocumentsFetching}
          isCurrentVersion={isCurrentVersionComputed}
          isReadonly={isReadonly}
          onContentChange={handleContentChange}
          getDocumentContentById={getDocumentContentById}
          setConsoleOutputs={setConsoleOutputs}
        />
      </div>
    </BlockLayout>
  );
}

export const Block = memo(PureBlock, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.input === nextProps.input &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.attachments === nextProps.attachments &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});

// Re-export types for backward compatibility
export type { BlockKind, UIBlock, ConsoleOutput } from './types/block';

'use client';

import { exampleSetup } from 'prosemirror-example-setup';
import { inputRules } from 'prosemirror-inputrules';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { memo, useEffect, useRef } from 'react';

import type { Suggestion } from '../lib/db/schema';
import {
  documentSchema,
  handleTransaction,
  headingRule,
} from '@/lib/editor/config';
import {
  buildContentFromDocument,
  buildDocumentFromContent,
} from '@/lib/editor/functions';
import {
  createSuggestionWidget,
  suggestionsPlugin,
  suggestionsPluginKey,
  type UISuggestion,
} from '@/lib/editor/suggestions';

type EditorProps = {
  content: string;
  saveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
};

function PureEditor({
  content,
  saveContent,
  suggestions,
  status,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const state = EditorState.create({
        doc: buildDocumentFromContent(content),
        plugins: [
          ...exampleSetup({ schema: documentSchema, menuBar: false }),
          inputRules({
            rules: [
              headingRule(1),
              headingRule(2),
              headingRule(3),
              headingRule(4),
              headingRule(5),
              headingRule(6),
            ],
          }),
          suggestionsPlugin,
        ],
      });

      editorRef.current = new EditorView(containerRef.current, {
        state,
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // NOTE: we only want to run this effect once
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setProps({
        dispatchTransaction: (transaction) => {
          handleTransaction({ transaction, editorRef, saveContent });
        },
      });
    }
  }, [saveContent]);

  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = buildContentFromDocument(
        editorRef.current.state.doc,
      );

      if (status === 'streaming') {
        const newDocument = buildDocumentFromContent(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        transaction.setMeta('no-save', true);
        editorRef.current.dispatch(transaction);
        return;
      }

      if (currentContent !== content) {
        const newDocument = buildDocumentFromContent(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        transaction.setMeta('no-save', true);
        editorRef.current.dispatch(transaction);
      }
    }
  }, [content, status]);

  useEffect(() => {
    if (editorRef.current?.state.doc && content && suggestions.length > 0) {
      // Map suggestions to positions within the document
      const projectedSuggestions: UISuggestion[] = suggestions.map((suggestion) => {
        // Find positions for each suggestion's original text in the document
        let positions: { start: number; end: number } | undefined;
        
        editorRef.current!.state.doc.nodesBetween(0, editorRef.current!.state.doc.content.size, (node, pos) => {
          if (node.isText && node.text && !positions) {
            const index = node.text.indexOf(suggestion.originalText);
            if (index !== -1) {
              positions = {
                start: pos + index,
                end: pos + index + suggestion.originalText.length,
              };
              return false; // Stop searching
            }
          }
          return true;
        });

        return {
          id: suggestion.id,
          originalText: suggestion.originalText,
          suggestedText: suggestion.suggestedText,
          selectionStart: positions?.start || 0,
          selectionEnd: positions?.end || 0,
        };
      }).filter(
        (suggestion) => suggestion.selectionStart > 0 && suggestion.selectionEnd > 0,
      );

      // Create decorations from the projected suggestions
      const decorations: any[] = [];

      for (const suggestion of projectedSuggestions) {
        const widget = createSuggestionWidget(suggestion, editorRef.current);
        if (widget?.dom) {
          decorations.push({
            type: 'widget',
            pos: suggestion.selectionStart,
            widget: widget.dom,
            spec: { suggestionId: suggestion.id }
          });
        }
      }

      const transaction = editorRef.current.state.tr;
      transaction.setMeta(suggestionsPluginKey, { decorations });
      editorRef.current.dispatch(transaction);
    }
  }, [suggestions, content]);

  return (
    <div className="relative prose dark:prose-invert" ref={containerRef} />
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  return (
    prevProps.suggestions === nextProps.suggestions &&
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.saveContent === nextProps.saveContent
  );
}

export const Editor = memo(PureEditor, areEqual);

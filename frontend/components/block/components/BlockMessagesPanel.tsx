/**
 * Block messages panel component
 */

import type { Attachment, ChatRequestOptions, CreateMessage, Message } from 'ai';
import { BlockMessages } from '@/components/block-messages';
import { MultimodalInput } from '@/components/multimodal-input';
import type { Vote } from '@/lib/db/schema';
import type { UIBlock } from '../types/block';

interface BlockMessagesPanelProps {
  block: UIBlock;
  chatId: string;
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (
    event?: { preventDefault?: () => void },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  messages: Array<Message>;
  setMessages: React.Dispatch<React.SetStateAction<Array<Message>>>;
  votes: Array<Vote> | undefined;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
}

export function BlockMessagesPanel({
  block,
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
}: BlockMessagesPanelProps) {
  return (
    <div className="flex flex-col h-full justify-between items-center gap-4">
      <BlockMessages
        chatId={chatId}
        isLoading={isLoading}
        votes={votes}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        isReadonly={isReadonly}
        blockStatus={block.status}
      />

      <form className="flex flex-row gap-2 relative items-end w-full px-4 pb-4">
        <MultimodalInput
          chatId={chatId}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          append={append}
          className="bg-background dark:bg-muted"
          setMessages={setMessages}
        />
      </form>
    </div>
  );
}
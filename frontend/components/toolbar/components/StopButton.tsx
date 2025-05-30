'use client';

import { motion } from 'framer-motion';
import type { Message } from 'ai';
import type { Dispatch, SetStateAction } from 'react';
import { StopIcon } from '@/components/icons';
import { sanitizeUIMessages } from '@/lib/utils';

interface StopButtonProps {
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

export const StopButton = ({ stop, setMessages }: StopButtonProps) => {
  const handleStop = () => {
    stop();
    setMessages((messages) => sanitizeUIMessages(messages));
  };

  return (
    <motion.div
      key="stop-icon"
      initial={{ scale: 1 }}
      animate={{ scale: 1.4 }}
      exit={{ scale: 1 }}
      className="p-3"
      onClick={handleStop}
    >
      <StopIcon />
    </motion.div>
  );
};
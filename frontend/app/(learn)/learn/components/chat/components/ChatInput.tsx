'use client';

import { Send, Sparkles, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInputProps } from '../types';

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'Ask me anything about this lesson...',
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50/50 flex-shrink-0">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white canvas-body transition-all duration-200"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !value.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white rounded-md modern-hover"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between canvas-small text-gray-500">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-3 w-3 text-purple-600" />
            <span>Powered by AI • Context-aware</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-green-600" />
              <span className="text-green-600">Instant responses</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-600" />
              <span className="text-yellow-600">Personalized</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

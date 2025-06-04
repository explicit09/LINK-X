import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  suggestions: string[];
  onAddTag: (tag: string) => boolean;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export function TagInput({
  tags,
  suggestions,
  onAddTag,
  onRemoveTag,
  placeholder = 'Type and press Enter',
  maxTags = 10,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions
    .filter(
      (suggestion) =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.includes(suggestion),
    )
    .slice(0, 5);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (onAddTag(inputValue.trim())) {
        setInputValue('');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (onAddTag(suggestion)) {
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="pl-3 pr-1">
              {tag}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-2 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onRemoveTag(tag)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Section */}
      <div className="relative">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={
              tags.length >= maxTags
                ? `Maximum ${maxTags} tags reached`
                : placeholder
            }
            disabled={tags.length >= maxTags}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (inputValue.trim() && onAddTag(inputValue.trim())) {
                setInputValue('');
                setShowSuggestions(false);
              }
            }}
            disabled={!inputValue.trim() || tags.length >= maxTags}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                onClick={() => handleSuggestionClick(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Counter */}
      <div className="text-xs text-muted-foreground">
        {tags.length} / {maxTags} tags
      </div>
    </div>
  );
}

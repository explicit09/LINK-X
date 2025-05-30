/**
 * Reusable tag input component
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TagInputProps } from '../types/onboarding';

export function TagInput({
  type,
  formData,
  updateField,
  suggestions,
  placeholder,
  maxTags,
  label,
  colorScheme
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const currentTags = formData[type];

  const addTag = (value: string) => {
    if (!value.trim() || currentTags.includes(value) || currentTags.length >= maxTags) {
      return;
    }
    
    const newTags = [...currentTags, value.trim()];
    updateField(type, newTags);
    setInputValue('');
  };

  const removeTag = (value: string) => {
    const newTags = currentTags.filter(tag => tag !== value);
    updateField(type, newTags);
  };

  const colorClasses = {
    blue: {
      suggestion: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      tag: 'bg-blue-600 text-white',
      tagButton: 'text-blue-200 hover:text-white'
    },
    green: {
      suggestion: 'bg-green-100 text-green-700 hover:bg-green-200', 
      tag: 'bg-green-600 text-white',
      tagButton: 'text-green-200 hover:text-white'
    }
  };

  const colors = colorClasses[colorScheme];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      
      {/* Input */}
      <div className="flex">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(inputValue);
            }
          }}
          className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
        />
        <Button 
          type="button"
          onClick={() => addTag(inputValue)}
          className="ml-2 h-12 px-4"
          disabled={currentTags.length >= maxTags}
        >
          +
        </Button>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-1 mt-2">
        {suggestions.slice(0, colorScheme === 'blue' ? 6 : 8).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => addTag(suggestion)}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${colors.suggestion}`}
            disabled={currentTags.includes(suggestion) || currentTags.length >= maxTags}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Selected tags */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {currentTags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${colors.tag}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className={`ml-1 ${colors.tagButton}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        {currentTags.length}/{maxTags} tags selected
      </p>
    </div>
  );
}
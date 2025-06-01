import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Check,
  X,
  MoreVertical,
  Trash2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Module } from '../hooks/useModuleManager';

interface ModuleHeaderProps {
  module: Module;
  canModify?: boolean;
  onToggle: (moduleId: string) => void;
  onStartEdit: (moduleId: string) => void;
  onSaveEdit: (moduleId: string) => void;
  onCancelEdit: (moduleId: string) => void;
  onUpdateEditTitle: (moduleId: string, title: string) => void;
  onDelete: (moduleId: string) => void;
  onPersonalize?: (moduleId: string) => void;
  className?: string;
}

export function ModuleHeader({
  module,
  canModify = false,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onUpdateEditTitle,
  onDelete,
  onPersonalize,
  className = '',
}: ModuleHeaderProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveEdit(module.id);
    } else if (e.key === 'Escape') {
      onCancelEdit(module.id);
    }
  };

  return (
    <div className={`p-4 border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onToggle(module.id)}
          >
            {module.isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {/* Module Icon */}
          <div className="flex-shrink-0">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>

          {/* Module Title */}
          <div className="flex-1 min-w-0">
            {module.isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={module.editTitle}
                  onChange={(e) => onUpdateEditTitle(module.id, e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 text-sm"
                  autoFocus
                  onBlur={() => onSaveEdit(module.id)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-green-600"
                  onClick={() => onSaveEdit(module.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600"
                  onClick={() => onCancelEdit(module.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h3
                  className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => onToggle(module.id)}
                >
                  {module.title}
                </h3>
                {canModify && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onStartEdit(module.id)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Material Count Badge */}
          <Badge variant="secondary" className="flex-shrink-0">
            {module.materials.length} file
            {module.materials.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Personalize Button */}
          {onPersonalize && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPersonalize(module.id)}
              className="hidden md:flex items-center space-x-1"
            >
              <Sparkles className="h-4 w-4" />
              <span>Personalize</span>
            </Button>
          )}

          {/* More Actions */}
          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onStartEdit(module.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Title
                </DropdownMenuItem>
                {onPersonalize && (
                  <DropdownMenuItem onClick={() => onPersonalize(module.id)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Personalize
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(module.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Module
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Module Metadata */}
      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
        <span>Created {new Date(module.createdAt).toLocaleDateString()}</span>
        {module.updatedAt !== module.createdAt && (
          <span>
            • Updated {new Date(module.updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

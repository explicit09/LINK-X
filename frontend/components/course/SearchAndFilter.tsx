'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  X,
  FileText,
  Video,
  Music,
  Image,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterState) => void;
  totalFiles: number;
  filteredFiles: number;
  className?: string;
}

interface FilterState {
  fileTypes: string[];
  aiProcessed: 'all' | 'processed' | 'unprocessed';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

const fileTypeOptions = [
  { value: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-600' },
  { value: 'video', label: 'Video', icon: Video, color: 'text-blue-600' },
  { value: 'audio', label: 'Audio', icon: Music, color: 'text-purple-600' },
  {
    value: 'document',
    label: 'Document',
    icon: FileText,
    color: 'text-gray-600',
  },
];

const aiProcessedOptions = [
  { value: 'all', label: 'All Files', icon: null },
  {
    value: 'processed',
    label: 'AI Ready',
    icon: CheckCircle2,
    color: 'text-green-600',
  },
  {
    value: 'unprocessed',
    label: 'Processing',
    icon: Clock,
    color: 'text-yellow-600',
  },
];

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export function SearchAndFilter({
  onSearch,
  onFilterChange,
  totalFiles,
  filteredFiles,
  className,
}: SearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    fileTypes: [],
    aiProcessed: 'all',
    dateRange: 'all',
  });

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterUpdate = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const toggleFileType = (fileType: string) => {
    const newFileTypes = filters.fileTypes.includes(fileType)
      ? filters.fileTypes.filter((t) => t !== fileType)
      : [...filters.fileTypes, fileType];

    handleFilterUpdate({ fileTypes: newFileTypes });
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      fileTypes: [],
      aiProcessed: 'all',
      dateRange: 'all',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
    setSearchQuery('');
    onSearch('');
  };

  const hasActiveFilters =
    searchQuery.length > 0 ||
    filters.fileTypes.length > 0 ||
    filters.aiProcessed !== 'all' ||
    filters.dateRange !== 'all';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files by name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'border-gray-300 text-gray-700 hover:bg-gray-50',
            showFilters && 'bg-gray-100',
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge className="ml-2 bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
              Active
            </Badge>
          )}
        </Button>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredFiles} of {totalFiles} files
          {hasActiveFilters && ' (filtered)'}
        </span>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear all filters
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          {/* File Type Filters */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              File Type
            </h4>
            <div className="flex flex-wrap gap-2">
              {fileTypeOptions.map((option) => {
                const IconComponent = option.icon;
                const isSelected = filters.fileTypes.includes(option.value);

                return (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFileType(option.value)}
                    className={cn(
                      'border-gray-300 text-gray-700 hover:bg-gray-100',
                      isSelected &&
                        'bg-indigo-100 border-indigo-300 text-indigo-700',
                    )}
                  >
                    <IconComponent
                      className={cn('h-4 w-4 mr-2', option.color)}
                    />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* AI Processing Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              AI Status
            </h4>
            <div className="flex flex-wrap gap-2">
              {aiProcessedOptions.map((option) => {
                const IconComponent = option.icon;
                const isSelected = filters.aiProcessed === option.value;

                return (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFilterUpdate({ aiProcessed: option.value as any })
                    }
                    className={cn(
                      'border-gray-300 text-gray-700 hover:bg-gray-100',
                      isSelected &&
                        'bg-indigo-100 border-indigo-300 text-indigo-700',
                    )}
                  >
                    {IconComponent && (
                      <IconComponent
                        className={cn('h-4 w-4 mr-2', option.color)}
                      />
                    )}
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Upload Date
            </h4>
            <div className="flex flex-wrap gap-2">
              {dateRangeOptions.map((option) => {
                const isSelected = filters.dateRange === option.value;

                return (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFilterUpdate({ dateRange: option.value as any })
                    }
                    className={cn(
                      'border-gray-300 text-gray-700 hover:bg-gray-100',
                      isSelected &&
                        'bg-indigo-100 border-indigo-300 text-indigo-700',
                    )}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

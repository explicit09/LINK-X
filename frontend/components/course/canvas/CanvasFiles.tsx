'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Folder, File, Upload, Download, Search, Grid3X3, List, 
  FileText, Image, Video, FileAudio, Archive, MoreHorizontal,
  ChevronRight, ArrowLeft, Plus, Trash2, Edit, Share
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  fileType?: string;
  size?: number;
  modifiedAt: string;
  modifiedBy: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  shared: boolean;
}

interface CanvasFilesProps {
  courseId: string;
  isOwner: boolean;
  userRole: 'student' | 'instructor' | 'admin';
  className?: string;
}

export function CanvasFiles({ courseId, isOwner, userRole, className }: CanvasFilesProps) {
  const [currentPath, setCurrentPath] = useState<string[]>(['Course Files']);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'Lecture Slides',
      type: 'folder',
      modifiedAt: '2024-12-10T10:00:00',
      modifiedBy: 'Professor Smith',
      shared: true,
    },
    {
      id: '2',
      name: 'Assignments',
      type: 'folder',
      modifiedAt: '2024-12-09T15:30:00',
      modifiedBy: 'Professor Smith',
      shared: true,
    },
    {
      id: '3',
      name: 'Course Syllabus.pdf',
      type: 'file',
      fileType: 'pdf',
      size: 2457600, // 2.4 MB
      modifiedAt: '2024-12-01T09:00:00',
      modifiedBy: 'Professor Smith',
      downloadUrl: '/files/syllabus.pdf',
      shared: true,
    },
    {
      id: '4',
      name: 'Reading List.docx',
      type: 'file',
      fileType: 'document',
      size: 45056, // 44 KB
      modifiedAt: '2024-11-28T14:20:00',
      modifiedBy: 'Professor Smith',
      downloadUrl: '/files/reading-list.docx',
      shared: true,
    },
    {
      id: '5',
      name: 'Demo Video - Neural Networks.mp4',
      type: 'file',
      fileType: 'video',
      size: 125829120, // 120 MB
      modifiedAt: '2024-11-25T11:45:00',
      modifiedBy: 'Professor Smith',
      downloadUrl: '/files/neural-networks-demo.mp4',
      thumbnailUrl: '/thumbnails/video-thumb.jpg',
      shared: true,
    },
    {
      id: '6',
      name: 'Dataset.zip',
      type: 'file',
      fileType: 'archive',
      size: 52428800, // 50 MB
      modifiedAt: '2024-11-20T16:10:00',
      modifiedBy: 'Teaching Assistant',
      downloadUrl: '/files/dataset.zip',
      shared: false,
    },
  ]);

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-5 h-5 text-blue-600" />;
    }

    switch (item.fileType) {
      case 'pdf':
      case 'document':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'image':
        return <Image className="w-5 h-5 text-green-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-600" />;
      case 'audio':
        return <FileAudio className="w-5 h-5 text-orange-600" />;
      case 'archive':
        return <Archive className="w-5 h-5 text-yellow-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToFolder = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
    // In a real app, this would fetch the folder contents
  };

  const navigateBack = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  if (filteredFiles.length === 0 && searchQuery) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Files</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* No Results */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600">Try adjusting your search terms or browse the file structure.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Files</h2>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          )}
          {isOwner && (
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          )}
        </div>
      </div>

      {/* Navigation and Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          {currentPath.length > 1 && (
            <Button variant="ghost" size="sm" onClick={navigateBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <nav className="flex items-center space-x-1 text-sm">
            {currentPath.map((path, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                <span className={index === currentPath.length - 1 ? "font-medium text-gray-900" : "text-gray-500"}>
                  {path}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Search and View Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-900">
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-1" />
              Share
            </Button>
            {isOwner && (
              <Button variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* File List */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredFiles.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedItems(new Set(filteredFiles.map(f => f.id)));
                  } else {
                    setSelectedItems(new Set());
                  }
                }}
                className="rounded"
              />
            </div>
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Modified</div>
            <div className="col-span-2">Modified By</div>
            <div className="col-span-1">Size</div>
            <div className="col-span-1"></div>
          </div>

          {/* Files */}
          <div className="divide-y divide-gray-200">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors",
                  selectedItems.has(file.id) && "bg-blue-50"
                )}
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(file.id)}
                    onChange={() => toggleItemSelection(file.id)}
                    className="rounded"
                  />
                </div>
                
                <div className="col-span-5">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => file.type === 'folder' ? navigateToFolder(file.name) : undefined}
                  >
                    {getFileIcon(file)}
                    <span className="font-medium text-gray-900 hover:text-blue-600">
                      {file.name}
                    </span>
                    {file.shared && (
                      <Share className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                
                <div className="col-span-2 text-sm text-gray-600">
                  {formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })}
                </div>
                
                <div className="col-span-2 text-sm text-gray-600">
                  {file.modifiedBy}
                </div>
                
                <div className="col-span-1 text-sm text-gray-600">
                  {file.size ? formatFileSize(file.size) : '--'}
                </div>
                
                <div className="col-span-1">
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredFiles.map((file) => (
            <Card 
              key={file.id}
              className={cn(
                "hover:shadow-md transition-shadow cursor-pointer",
                selectedItems.has(file.id) && "ring-2 ring-blue-500"
              )}
              onClick={() => toggleItemSelection(file.id)}
            >
              <CardContent className="p-4 text-center">
                <div className="mb-3">
                  {file.thumbnailUrl ? (
                    <img 
                      src={file.thumbnailUrl} 
                      alt={file.name}
                      className="w-16 h-16 mx-auto rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 mx-auto flex items-center justify-center">
                      {React.cloneElement(getFileIcon(file), { className: "w-12 h-12" })}
                    </div>
                  )}
                </div>
                
                <h4 className="font-medium text-sm text-gray-900 truncate mb-1">
                  {file.name}
                </h4>
                
                <p className="text-xs text-gray-500">
                  {file.size ? formatFileSize(file.size) : 'Folder'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredFiles.length === 0 && !searchQuery && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Folder className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No files yet</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {isOwner 
                ? 'Upload files to share course materials, assignments, and resources with your students.'
                : 'No files have been shared yet. Check back later for course materials and resources.'}
            </p>
            {isOwner && (
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload First File
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
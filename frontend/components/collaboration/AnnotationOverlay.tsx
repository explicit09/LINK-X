/**
 * AnnotationOverlay component
 * Displays and manages shared annotations on documents
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Heart, 
  HelpCircle, 
  CheckCircle, 
  Trash2, 
  Edit, 
  Reply,
  X 
} from 'lucide-react';
import { SharedAnnotation } from '@/lib/api/collaboration';
import { collaborationAPI } from '@/lib/api/collaboration';
import { useToast } from '@/components/ui/use-toast';
import { useCollaborationWebSocket } from '@/lib/collaboration/websocket-manager';

interface AnnotationOverlayProps {
  fileId: string;
  groupId?: string;
  annotations: SharedAnnotation[];
  onAnnotationCreate: (annotation: Partial<SharedAnnotation>) => void;
  onAnnotationUpdate: (annotationId: string, updates: Partial<SharedAnnotation>) => void;
  onAnnotationDelete: (annotationId: string) => void;
  isEditable?: boolean;
  currentUserId?: string;
}

interface AnnotationPopup {
  annotation: SharedAnnotation;
  position: { x: number; y: number };
}

export function AnnotationOverlay({
  fileId,
  groupId,
  annotations,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  isEditable = true,
  currentUserId
}: AnnotationOverlayProps) {
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationPopup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createPosition, setCreatePosition] = useState<{ x: number; y: number } | null>(null);
  const [newAnnotationContent, setNewAnnotationContent] = useState('');
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { socket } = useCollaborationWebSocket();

  // Listen for real-time annotation updates
  useEffect(() => {
    if (!socket) return;

    const unsubscribeNewAnnotation = socket.addEventListener('new_annotation', (event) => {
      if (event.data.file_id === fileId) {
        // Add optimistic update here if needed
      }
    });

    const unsubscribeAnnotationUpdate = socket.addEventListener('annotation_updated', (event) => {
      // Handle annotation updates
    });

    return () => {
      unsubscribeNewAnnotation();
      unsubscribeAnnotationUpdate();
    };
  }, [socket, fileId]);

  const handleDocumentClick = (e: React.MouseEvent) => {
    if (!isEditable) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on an existing annotation
    const clickedAnnotation = findAnnotationAtPosition(x, y);
    
    if (clickedAnnotation) {
      setSelectedAnnotation({
        annotation: clickedAnnotation,
        position: { x, y }
      });
      setIsCreating(false);
    } else if (e.shiftKey) {
      // Shift+click to create new annotation
      setCreatePosition({ x, y });
      setIsCreating(true);
      setSelectedAnnotation(null);
    } else {
      // Click elsewhere, close popups
      setSelectedAnnotation(null);
      setIsCreating(false);
    }
  };

  const findAnnotationAtPosition = (x: number, y: number): SharedAnnotation | null => {
    // This would typically involve checking the position_data of annotations
    // For now, simplified implementation
    return annotations.find(annotation => {
      const pos = annotation.position_data.coordinates;
      if (!pos) return false;
      
      return (
        x >= pos.x &&
        x <= pos.x + pos.width &&
        y >= pos.y &&
        y <= pos.y + pos.height
      );
    }) || null;
  };

  const handleCreateAnnotation = async () => {
    if (!newAnnotationContent.trim() || !createPosition) return;

    try {
      const annotationData = {
        file_id: fileId,
        annotation_type: 'comment',
        content: newAnnotationContent,
        position_data: {
          coordinates: {
            x: createPosition.x,
            y: createPosition.y,
            width: 200,
            height: 100
          }
        },
        group_id: groupId,
        color: '#fbbf24', // Yellow highlight
        is_public: false
      };

      await collaborationAPI.createAnnotation(annotationData);
      onAnnotationCreate(annotationData);
      
      setNewAnnotationContent('');
      setIsCreating(false);
      setCreatePosition(null);
      
      toast({
        title: 'Annotation Created',
        description: 'Your annotation has been added to the document.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create annotation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAnnotation = async (annotationId: string) => {
    if (!editContent.trim()) return;

    try {
      const updates = { content: editContent };
      // Note: This would be implemented in the backend
      // await collaborationAPI.updateAnnotation(annotationId, updates);
      onAnnotationUpdate(annotationId, updates);
      
      setEditingAnnotation(null);
      setEditContent('');
      
      toast({
        title: 'Annotation Updated',
        description: 'Your annotation has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update annotation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      // Note: This would be implemented in the backend
      // await collaborationAPI.deleteAnnotation(annotationId);
      onAnnotationDelete(annotationId);
      setSelectedAnnotation(null);
      
      toast({
        title: 'Annotation Deleted',
        description: 'The annotation has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete annotation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddReaction = async (annotationId: string, reactionType: string) => {
    try {
      await collaborationAPI.addAnnotationReaction(annotationId, reactionType);
      toast({
        title: 'Reaction Added',
        description: `You reacted with ${reactionType}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add reaction. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getAnnotationTypeIcon = (type: string) => {
    switch (type) {
      case 'question':
        return <HelpCircle className="w-4 h-4" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4" />;
      case 'note':
        return <Edit className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <div 
      ref={overlayRef}
      className="absolute inset-0 pointer-events-auto"
      onClick={handleDocumentClick}
    >
      {/* Render annotation highlights */}
      {annotations.map((annotation) => {
        const pos = annotation.position_data.coordinates;
        if (!pos) return null;

        return (
          <div
            key={annotation.id}
            className="absolute border-2 border-yellow-400 bg-yellow-100 bg-opacity-30 cursor-pointer hover:bg-opacity-50 transition-all"
            style={{
              left: pos.x,
              top: pos.y,
              width: pos.width,
              height: pos.height,
              borderColor: annotation.color,
              backgroundColor: annotation.color + '20'
            }}
            title={annotation.content}
          />
        );
      })}

      {/* Create annotation popup */}
      {isCreating && createPosition && (
        <Card 
          className="absolute z-50 w-80 shadow-lg"
          style={{
            left: createPosition.x,
            top: createPosition.y
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Add Annotation</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Textarea
              placeholder="Write your annotation..."
              value={newAnnotationContent}
              onChange={(e) => setNewAnnotationContent(e.target.value)}
              className="mb-3"
              rows={3}
            />
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleCreateAnnotation}
                disabled={!newAnnotationContent.trim()}
              >
                Add
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annotation details popup */}
      {selectedAnnotation && (
        <Card 
          className="absolute z-50 w-80 shadow-lg"
          style={{
            left: selectedAnnotation.position.x,
            top: selectedAnnotation.position.y
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getAnnotationTypeIcon(selectedAnnotation.annotation.annotation_type)}
                <Badge variant="secondary">
                  {selectedAnnotation.annotation.annotation_type}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAnnotation(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Annotation author */}
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {selectedAnnotation.annotation.created_by.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {new Date(selectedAnnotation.annotation.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Annotation content */}
            {editingAnnotation === selectedAnnotation.annotation.id ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleUpdateAnnotation(selectedAnnotation.annotation.id)}
                  >
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditingAnnotation(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">{selectedAnnotation.annotation.content}</p>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddReaction(selectedAnnotation.annotation.id, 'helpful')}
                  >
                    <Heart className="w-4 h-4 mr-1" />
                    Helpful
                  </Button>
                  
                  {selectedAnnotation.annotation.annotation_type === 'question' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddReaction(selectedAnnotation.annotation.id, 'solved')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Solved
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* Handle reply */}}
                  >
                    <Reply className="w-4 h-4 mr-1" />
                    Reply
                  </Button>
                </div>

                {/* Edit/Delete for own annotations */}
                {currentUserId === selectedAnnotation.annotation.created_by && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAnnotation(selectedAnnotation.annotation.id);
                        setEditContent(selectedAnnotation.annotation.content);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAnnotation(selectedAnnotation.annotation.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions overlay */}
      {isEditable && annotations.length === 0 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm">
          Shift + Click to add annotations
        </div>
      )}
    </div>
  );
}
/**
 * CollaborativeNoteEditor component
 * Real-time collaborative note editor with operational transforms
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save, 
  Users, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Download,
  Share,
  History
} from 'lucide-react';
import { CollaborativeNote } from '@/lib/api/collaboration';
import { collaborationAPI } from '@/lib/api/collaboration';
import { useCollaborationWebSocket } from '@/lib/collaboration/websocket-manager';
import { useToast } from '@/components/ui/use-toast';

interface CollaborativeNoteEditorProps {
  noteId: string;
  initialNote?: CollaborativeNote;
  onSave?: (note: CollaborativeNote) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

interface ActiveEditor {
  user_id: string;
  cursor_position?: number;
  selection_start?: number;
  selection_end?: number;
}

interface NoteOperation {
  id: string;
  type: 'insert' | 'delete' | 'retain' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: any;
  user_id: string;
  timestamp: number;
}

export function CollaborativeNoteEditor({
  noteId,
  initialNote,
  onSave,
  onClose,
  readOnly = false
}: CollaborativeNoteEditorProps) {
  const [note, setNote] = useState<CollaborativeNote | null>(initialNote || null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [operationQueue, setOperationQueue] = useState<NoteOperation[]>([]);
  const [localVersion, setLocalVersion] = useState(1);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { socket } = useCollaborationWebSocket();
  const { toast } = useToast();

  // Load note data
  useEffect(() => {
    if (!initialNote && noteId) {
      loadNote();
    }
  }, [noteId, initialNote]);

  // Join collaborative editing session
  useEffect(() => {
    if (!socket || !noteId) return;

    socket.joinNoteEditing(noteId);

    // Listen for real-time events
    const unsubscribeOperation = socket.addEventListener('note_operation', (event) => {
      if (event.data.note_id === noteId) {
        applyRemoteOperation(event.data.operation);
      }
    });

    const unsubscribeUserJoined = socket.addEventListener('user_joined_note', (event) => {
      if (event.data.note_id === noteId) {
        setActiveEditors(prev => [...prev, { user_id: event.data.user_id }]);
      }
    });

    const unsubscribeNoteState = socket.addEventListener('note_state', (event) => {
      if (event.data.note_id === noteId) {
        setContent(event.data.content.text || '');
        setActiveEditors(event.data.active_editors || []);
        setLocalVersion(event.data.content.version || 1);
      }
    });

    return () => {
      unsubscribeOperation();
      unsubscribeUserJoined();
      unsubscribeNoteState();
      socket.leaveNoteEditing(noteId);
    };
  }, [socket, noteId]);

  // Auto-save functionality
  useEffect(() => {
    if (!note || readOnly) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(true);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, title]);

  const loadNote = async () => {
    try {
      const loadedNote = await collaborationAPI.getCollaborativeNote(noteId);
      setNote(loadedNote);
      setTitle(loadedNote.title);
      setContent(loadedNote.content.text || '');
      setLocalVersion(loadedNote.version);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!note || readOnly || isSaving) return;

    setIsSaving(true);
    try {
      // For now, this would be a simplified save
      // In a real implementation, you'd send the operations to the server
      const savedNote = { ...note, title, content: { text: content, version: localVersion + 1 } };
      
      onSave?.(savedNote);
      setLastSaved(new Date());
      setLocalVersion(prev => prev + 1);
      
      if (!isAutoSave) {
        toast({
          title: 'Note Saved',
          description: 'Your changes have been saved successfully.',
        });
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const selectionStart = e.target.selectionStart;
    const selectionEnd = e.target.selectionEnd;

    // Calculate the operation
    const operation = calculateOperation(content, newContent, selectionStart);
    
    if (operation && socket) {
      // Send operation to other collaborators
      socket.sendNoteOperation(noteId, operation);
      
      // Add to operation queue for conflict resolution
      setOperationQueue(prev => [...prev, operation]);
    }

    setContent(newContent);
  };

  const calculateOperation = (oldContent: string, newContent: string, position: number): NoteOperation | null => {
    // Simplified operation calculation
    // In a real implementation, you'd use a proper operational transform library
    
    if (oldContent.length < newContent.length) {
      // Insert operation
      const insertedText = newContent.substring(position - (newContent.length - oldContent.length), position);
      return {
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'insert',
        position: position - insertedText.length,
        content: insertedText,
        user_id: 'current_user', // Would be actual user ID
        timestamp: Date.now()
      };
    } else if (oldContent.length > newContent.length) {
      // Delete operation
      return {
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'delete',
        position,
        length: oldContent.length - newContent.length,
        user_id: 'current_user',
        timestamp: Date.now()
      };
    }
    
    return null;
  };

  const applyRemoteOperation = (operation: NoteOperation) => {
    // Apply remote operation to local content
    // This is a simplified implementation
    let newContent = content;
    
    switch (operation.type) {
      case 'insert':
        if (operation.content) {
          newContent = 
            content.substring(0, operation.position) +
            operation.content +
            content.substring(operation.position);
        }
        break;
      case 'delete':
        if (operation.length) {
          newContent = 
            content.substring(0, operation.position) +
            content.substring(operation.position + operation.length);
        }
        break;
    }
    
    setContent(newContent);
  };

  const toggleCollaborationMode = () => {
    if (!note) return;
    
    const newMode = note.collaboration_mode === 'open' ? 'locked' : 'open';
    setNote({ ...note, collaboration_mode: newMode });
    
    toast({
      title: 'Collaboration Mode Changed',
      description: `Note is now ${newMode === 'open' ? 'open for editing' : 'locked'} by others.`,
    });
  };

  const shareNote = () => {
    if (navigator.share) {
      navigator.share({
        title: title || 'Collaborative Note',
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Note link has been copied to your clipboard.',
      });
    }
  };

  if (!note) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading note...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="text-lg font-semibold border-none p-0 h-auto bg-transparent"
              disabled={readOnly}
            />
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={note.collaboration_mode === 'open' ? 'default' : 'secondary'}>
                {note.collaboration_mode}
              </Badge>
              {note.is_template && <Badge variant="outline">Template</Badge>}
              {lastSaved && (
                <span className="text-sm text-muted-foreground">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Active editors */}
            {activeEditors.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {activeEditors.slice(0, 3).map((editor, index) => (
                    <Avatar key={editor.user_id} className="w-6 h-6 border-2 border-background">
                      <AvatarFallback className="text-xs">
                        {editor.user_id.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {activeEditors.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        +{activeEditors.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollaborationMode}
              disabled={readOnly}
            >
              {note.collaboration_mode === 'open' ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </Button>
            
            <Button variant="ghost" size="sm" onClick={shareNote}>
              <Share className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="sm">
              <History className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={() => handleSave(false)} 
              disabled={isSaving || readOnly}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Textarea
          ref={contentRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your collaborative note..."
          className="min-h-[400px] text-base leading-relaxed resize-none border-none focus-visible:ring-0"
          disabled={readOnly || note.collaboration_mode === 'locked'}
        />
        
        {/* Status bar */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{content.length} characters</span>
            <span>Version {localVersion}</span>
            {operationQueue.length > 0 && (
              <span>{operationQueue.length} pending operations</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {note.collaboration_mode === 'locked' && (
              <Badge variant="secondary">
                <Lock className="w-3 h-3 mr-1" />
                Read-only
              </Badge>
            )}
            <span>
              Created {new Date(note.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
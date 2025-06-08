/**
 * WebSocket manager for real-time collaboration features
 * Handles real-time events for study groups, annotations, discussions, and collaborative notes
 */

import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  type: string;
  data: any;
  room?: string;
  user_id?: string;
  timestamp?: string;
}

export interface CollaborationEvent {
  type: 'user_joined_group' | 'user_left_group' | 'new_annotation' | 'annotation_updated' | 
        'new_discussion_reply' | 'note_operation' | 'user_joined_note' | 'whiteboard_updated' |
        'user_joined_session' | 'user_left_session';
  data: any;
  timestamp: string;
}

class CollaborationWebSocketManager {
  private socket: Socket | null = null;
  private connectionCallbacks: (() => void)[] = [];
  private eventListeners: Map<string, ((event: CollaborationEvent) => void)[]> = new Map();
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.connect();
  }

  private async connect() {
    if (this.isConnecting || this.socket?.connected) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get auth token for WebSocket authentication
      const token = await this.getAuthToken();
      if (!token) {
        console.warn('No auth token available for WebSocket connection');
        this.isConnecting = false;
        return;
      }

      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      this.socket = io(baseURL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.setupEventHandlers();
      this.isConnecting = false;

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
    }
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      // TODO: Implement Supabase WebSocket authentication
      // When backend WebSocket server supports Supabase auth:
      // 1. Import supabase client: import { supabase } from '@/lib/supabase'
      // 2. Get the session token:
      //    const { data: { session } } = await supabase.auth.getSession()
      //    return session?.access_token || null
      // 3. Backend should validate the JWT token using Supabase's JWT secret
      console.warn('WebSocket authentication pending backend support for Supabase tokens');
      return null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to collaboration WebSocket');
      this.reconnectAttempts = 0;
      this.connectionCallbacks.forEach(callback => callback());
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from collaboration WebSocket:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Study Group Events
    this.socket.on('user_joined_group', (data) => {
      this.emitEvent('user_joined_group', data);
    });

    this.socket.on('user_left_group', (data) => {
      this.emitEvent('user_left_group', data);
    });

    // Annotation Events
    this.socket.on('new_annotation', (data) => {
      this.emitEvent('new_annotation', data);
    });

    this.socket.on('annotation_updated', (data) => {
      this.emitEvent('annotation_updated', data);
    });

    // Discussion Events
    this.socket.on('new_discussion_reply', (data) => {
      this.emitEvent('new_discussion_reply', data);
    });

    // Collaborative Note Events
    this.socket.on('note_operation', (data) => {
      this.emitEvent('note_operation', data);
    });

    this.socket.on('user_joined_note', (data) => {
      this.emitEvent('user_joined_note', data);
    });

    this.socket.on('note_state', (data) => {
      this.emitEvent('note_state', data);
    });

    // Study Session Events
    this.socket.on('user_joined_session', (data) => {
      this.emitEvent('user_joined_session', data);
    });

    this.socket.on('user_left_session', (data) => {
      this.emitEvent('user_left_session', data);
    });

    this.socket.on('whiteboard_updated', (data) => {
      this.emitEvent('whiteboard_updated', data);
    });

    this.socket.on('session_state', (data) => {
      this.emitEvent('session_state', data);
    });

    // Error handling
    this.socket.on('error', (data) => {
      console.error('WebSocket error:', data);
    });
  }

  private emitEvent(type: string, data: any) {
    const listeners = this.eventListeners.get(type) || [];
    const event: CollaborationEvent = {
      type: type as any,
      data,
      timestamp: new Date().toISOString()
    };

    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // Public methods for joining/leaving rooms

  joinStudyGroup(groupId: string) {
    if (!this.socket?.connected) {
      this.onConnection(() => this.joinStudyGroup(groupId));
      return;
    }

    this.socket.emit('join_study_group', { group_id: groupId });
  }

  leaveStudyGroup(groupId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('leave_study_group', { group_id: groupId });
  }

  joinNoteEditing(noteId: string) {
    if (!this.socket?.connected) {
      this.onConnection(() => this.joinNoteEditing(noteId));
      return;
    }

    this.socket.emit('join_note_editing', { note_id: noteId });
  }

  leaveNoteEditing(noteId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('leave_note_editing', { note_id: noteId });
  }

  sendNoteOperation(noteId: string, operation: any) {
    if (!this.socket?.connected) return;
    this.socket.emit('note_operation', { note_id: noteId, operation });
  }

  joinStudySession(sessionId: string) {
    if (!this.socket?.connected) {
      this.onConnection(() => this.joinStudySession(sessionId));
      return;
    }

    this.socket.emit('join_study_session', { session_id: sessionId });
  }

  leaveStudySession(sessionId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('leave_study_session', { session_id: sessionId });
  }

  updateWhiteboard(sessionId: string, whiteboardData: any) {
    if (!this.socket?.connected) return;
    this.socket.emit('session_whiteboard_update', {
      session_id: sessionId,
      whiteboard_data: whiteboardData
    });
  }

  // Event subscription methods

  addEventListener(eventType: string, listener: (event: CollaborationEvent) => void) {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);

    // Return unsubscribe function
    return () => {
      const currentListeners = this.eventListeners.get(eventType) || [];
      const index = currentListeners.indexOf(listener);
      if (index > -1) {
        currentListeners.splice(index, 1);
        this.eventListeners.set(eventType, currentListeners);
      }
    };
  }

  removeEventListener(eventType: string, listener: (event: CollaborationEvent) => void) {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  onConnection(callback: () => void) {
    if (this.socket?.connected) {
      callback();
    } else {
      this.connectionCallbacks.push(callback);
    }
  }

  // Connection management

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionCallbacks = [];
    this.eventListeners.clear();
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): 'connected' | 'disconnected' | 'connecting' {
    if (this.isConnecting) return 'connecting';
    if (this.socket?.connected) return 'connected';
    return 'disconnected';
  }
}

// Global instance
export const collaborationWebSocket = new CollaborationWebSocketManager();

// React hook for easy integration
export function useCollaborationWebSocket() {
  return {
    socket: collaborationWebSocket,
    isConnected: collaborationWebSocket.isConnected(),
    connectionState: collaborationWebSocket.getConnectionState(),
  };
}
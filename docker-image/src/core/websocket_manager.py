"""
WebSocket Manager for Real-time Collaborative Features
Handles WebSocket connections, rooms, and real-time events for study groups,
annotations, discussions, and collaborative note-taking.
"""

try:
    from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
    SOCKETIO_AVAILABLE = True
except ImportError:
    SOCKETIO_AVAILABLE = False
    SocketIO = None
from flask import request, g
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None
from core.exceptions import ValueError, ValidationError

logger = logging.getLogger(__name__)

@dataclass
class WebSocketMessage:
    """Standard WebSocket message format"""
    type: str
    data: Dict[str, Any]
    room: Optional[str] = None
    user_id: Optional[str] = None
    timestamp: Optional[datetime] = None

class CollaborationWebSocketManager:
    """Manages WebSocket connections for collaborative features"""
    
    def __init__(self, socketio: SocketIO, redis_client: redis.Redis):
        self.socketio = socketio
        self.redis = redis_client
        self.active_sessions = {}  # session_id -> session_info
        self.user_connections = {}  # user_id -> {socket_id, rooms}
        
        # Register WebSocket event handlers
        self._register_handlers()
    
    def _register_handlers(self):
        """Register all WebSocket event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect(auth):
            """Handle new WebSocket connection"""
            try:
                # Authenticate user (similar to HTTP auth)
                if not auth or 'token' not in auth:
                    disconnect()
                    return False
                
                # Verify Firebase token (simplified - would use actual auth service)
                user_id = self._verify_token(auth['token'])
                if not user_id:
                    disconnect()
                    return False
                
                # Store user connection
                self.user_connections[user_id] = {
                    'socket_id': request.sid,
                    'rooms': set(),
                    'connected_at': datetime.utcnow()
                }
                
                logger.info(f"User {user_id} connected with socket {request.sid}")
                emit('connected', {'status': 'success', 'user_id': user_id})
                
            except Exception as e:
                logger.error(f"Connection error: {e}")
                disconnect()
                return False
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Handle WebSocket disconnection"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                if user_id:
                    # Leave all rooms
                    user_info = self.user_connections.get(user_id, {})
                    for room in user_info.get('rooms', set()):
                        leave_room(room)
                        self._notify_room_leave(room, user_id)
                    
                    # Remove user connection
                    del self.user_connections[user_id]
                    logger.info(f"User {user_id} disconnected")
                    
            except Exception as e:
                logger.error(f"Disconnect error: {e}")
        
        # Study Group Events
        @self.socketio.on('join_study_group')
        def handle_join_study_group(data):
            """Join a study group room for real-time collaboration"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                group_id = data.get('group_id')
                
                if not user_id or not group_id:
                    emit('error', {'message': 'Invalid request'})
                    return
                
                # Verify user is member of study group
                if not self._verify_group_membership(user_id, group_id):
                    emit('error', {'message': 'Not authorized for this group'})
                    return
                
                room = f"study_group_{group_id}"
                join_room(room)
                
                # Update user connections
                if user_id in self.user_connections:
                    self.user_connections[user_id]['rooms'].add(room)
                
                # Notify other group members
                emit('user_joined_group', {
                    'user_id': user_id,
                    'group_id': group_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=room, include_self=False)
                
                emit('joined_study_group', {'group_id': group_id, 'room': room})
                logger.info(f"User {user_id} joined study group {group_id}")
                
            except Exception as e:
                logger.error(f"Join study group error: {e}")
                emit('error', {'message': 'Failed to join study group'})
        
        @self.socketio.on('leave_study_group')
        def handle_leave_study_group(data):
            """Leave a study group room"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                group_id = data.get('group_id')
                
                if not user_id or not group_id:
                    return
                
                room = f"study_group_{group_id}"
                leave_room(room)
                
                # Update user connections
                if user_id in self.user_connections:
                    self.user_connections[user_id]['rooms'].discard(room)
                
                # Notify other group members
                emit('user_left_group', {
                    'user_id': user_id,
                    'group_id': group_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=room)
                
                logger.info(f"User {user_id} left study group {group_id}")
                
            except Exception as e:
                logger.error(f"Leave study group error: {e}")
        
        # Real-time Annotation Events
        @self.socketio.on('annotation_created')
        def handle_annotation_created(data):
            """Handle new annotation creation"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                annotation_data = data.get('annotation')
                file_id = data.get('file_id')
                group_id = data.get('group_id')
                
                if not self._verify_annotation_access(user_id, file_id, group_id):
                    emit('error', {'message': 'Not authorized for this annotation'})
                    return
                
                # Determine rooms to notify
                rooms = []
                if group_id:
                    rooms.append(f"study_group_{group_id}")
                rooms.append(f"file_{file_id}")
                
                # Broadcast to relevant rooms
                for room in rooms:
                    emit('new_annotation', {
                        'annotation': annotation_data,
                        'created_by': user_id,
                        'file_id': file_id,
                        'group_id': group_id,
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=room, include_self=False)
                
                logger.info(f"Annotation created by {user_id} on file {file_id}")
                
            except Exception as e:
                logger.error(f"Annotation creation error: {e}")
                emit('error', {'message': 'Failed to create annotation'})
        
        @self.socketio.on('annotation_updated')
        def handle_annotation_updated(data):
            """Handle annotation updates"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                annotation_id = data.get('annotation_id')
                updates = data.get('updates')
                
                # Verify permission to update annotation
                if not self._verify_annotation_update_permission(user_id, annotation_id):
                    emit('error', {'message': 'Not authorized to update this annotation'})
                    return
                
                # Get annotation details for room targeting
                annotation_info = self._get_annotation_info(annotation_id)
                if not annotation_info:
                    emit('error', {'message': 'Annotation not found'})
                    return
                
                # Broadcast update
                rooms = self._get_annotation_broadcast_rooms(annotation_info)
                for room in rooms:
                    emit('annotation_updated', {
                        'annotation_id': annotation_id,
                        'updates': updates,
                        'updated_by': user_id,
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=room, include_self=False)
                
            except Exception as e:
                logger.error(f"Annotation update error: {e}")
                emit('error', {'message': 'Failed to update annotation'})
        
        # Collaborative Note Events
        @self.socketio.on('note_operation')
        def handle_note_operation(data):
            """Handle real-time note editing operations"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                note_id = data.get('note_id')
                operation = data.get('operation')
                
                if not self._verify_note_edit_permission(user_id, note_id):
                    emit('error', {'message': 'Not authorized to edit this note'})
                    return
                
                # Process operational transform
                processed_operation = self._process_note_operation(note_id, operation, user_id)
                
                # Broadcast to note collaborators
                room = f"note_{note_id}"
                emit('note_operation', {
                    'note_id': note_id,
                    'operation': processed_operation,
                    'user_id': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=room, include_self=False)
                
                # Confirm operation to sender
                emit('operation_applied', {
                    'note_id': note_id,
                    'operation_id': operation.get('id'),
                    'status': 'success'
                })
                
            except Exception as e:
                logger.error(f"Note operation error: {e}")
                emit('error', {'message': 'Failed to apply note operation'})
        
        @self.socketio.on('join_note_editing')
        def handle_join_note_editing(data):
            """Join collaborative note editing session"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                note_id = data.get('note_id')
                
                if not self._verify_note_access(user_id, note_id):
                    emit('error', {'message': 'Not authorized for this note'})
                    return
                
                room = f"note_{note_id}"
                join_room(room)
                
                # Update user connections
                if user_id in self.user_connections:
                    self.user_connections[user_id]['rooms'].add(room)
                
                # Notify other editors
                emit('user_joined_note', {
                    'user_id': user_id,
                    'note_id': note_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=room, include_self=False)
                
                # Send current note state to new editor
                note_state = self._get_note_current_state(note_id)
                emit('note_state', {
                    'note_id': note_id,
                    'content': note_state,
                    'active_editors': self._get_active_note_editors(note_id)
                })
                
            except Exception as e:
                logger.error(f"Join note editing error: {e}")
                emit('error', {'message': 'Failed to join note editing'})
        
        # Discussion Events
        @self.socketio.on('discussion_reply')
        def handle_discussion_reply(data):
            """Handle new discussion replies"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                discussion_id = data.get('discussion_id')
                reply_data = data.get('reply')
                
                if not self._verify_discussion_access(user_id, discussion_id):
                    emit('error', {'message': 'Not authorized for this discussion'})
                    return
                
                # Get discussion info for room targeting
                discussion_info = self._get_discussion_info(discussion_id)
                rooms = self._get_discussion_broadcast_rooms(discussion_info)
                
                # Broadcast new reply
                for room in rooms:
                    emit('new_discussion_reply', {
                        'discussion_id': discussion_id,
                        'reply': reply_data,
                        'created_by': user_id,
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=room)
                
            except Exception as e:
                logger.error(f"Discussion reply error: {e}")
                emit('error', {'message': 'Failed to post reply'})
        
        # Study Session Events
        @self.socketio.on('join_study_session')
        def handle_join_study_session(data):
            """Join a live study session"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                session_id = data.get('session_id')
                
                if not self._verify_session_access(user_id, session_id):
                    emit('error', {'message': 'Not authorized for this session'})
                    return
                
                room = f"study_session_{session_id}"
                join_room(room)
                
                # Update user connections
                if user_id in self.user_connections:
                    self.user_connections[user_id]['rooms'].add(room)
                
                # Store session participation
                self.active_sessions[session_id] = self.active_sessions.get(session_id, {
                    'participants': set(),
                    'started_at': datetime.utcnow()
                })
                self.active_sessions[session_id]['participants'].add(user_id)
                
                # Notify other participants
                emit('user_joined_session', {
                    'user_id': user_id,
                    'session_id': session_id,
                    'participant_count': len(self.active_sessions[session_id]['participants']),
                    'timestamp': datetime.utcnow().isoformat()
                }, room=room, include_self=False)
                
                # Send session state to new participant
                session_state = self._get_session_state(session_id)
                emit('session_state', session_state)
                
            except Exception as e:
                logger.error(f"Join study session error: {e}")
                emit('error', {'message': 'Failed to join study session'})
        
        @self.socketio.on('session_whiteboard_update')
        def handle_whiteboard_update(data):
            """Handle shared whiteboard updates"""
            try:
                user_id = self._get_user_from_socket(request.sid)
                session_id = data.get('session_id')
                whiteboard_data = data.get('whiteboard_data')
                
                if not self._verify_session_access(user_id, session_id):
                    emit('error', {'message': 'Not authorized for this session'})
                    return
                
                room = f"study_session_{session_id}"
                
                # Broadcast whiteboard update
                emit('whiteboard_updated', {
                    'session_id': session_id,
                    'whiteboard_data': whiteboard_data,
                    'updated_by': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=room, include_self=False)
                
                # Store whiteboard state in Redis for persistence
                self._store_whiteboard_state(session_id, whiteboard_data)
                
            except Exception as e:
                logger.error(f"Whiteboard update error: {e}")
                emit('error', {'message': 'Failed to update whiteboard'})
    
    # Helper methods
    def _verify_token(self, token: str) -> Optional[str]:
        """Verify Supabase token and return user ID"""
        # Simplified - would use actual Supabase auth verification
        # For now, return dummy user ID
        return "dummy_user_id" if token else None
    
    def _get_user_from_socket(self, socket_id: str) -> Optional[str]:
        """Get user ID from socket ID"""
        for user_id, conn_info in self.user_connections.items():
            if conn_info['socket_id'] == socket_id:
                return user_id
        return None
    
    def _verify_group_membership(self, user_id: str, group_id: str) -> bool:
        """Verify user is member of study group"""
        # Would check database for group membership
        return True  # Simplified for demo
    
    def _verify_annotation_access(self, user_id: str, file_id: str, group_id: Optional[str]) -> bool:
        """Verify user can access annotations for file/group"""
        # Would check file access permissions and group membership
        return True  # Simplified for demo
    
    def _verify_annotation_update_permission(self, user_id: str, annotation_id: str) -> bool:
        """Verify user can update specific annotation"""
        # Would check if user created annotation or has permission
        return True  # Simplified for demo
    
    def _verify_note_edit_permission(self, user_id: str, note_id: str) -> bool:
        """Verify user can edit collaborative note"""
        # Would check note permissions and collaboration mode
        return True  # Simplified for demo
    
    def _verify_note_access(self, user_id: str, note_id: str) -> bool:
        """Verify user can access collaborative note"""
        return True  # Simplified for demo
    
    def _verify_discussion_access(self, user_id: str, discussion_id: str) -> bool:
        """Verify user can access discussion"""
        return True  # Simplified for demo
    
    def _verify_session_access(self, user_id: str, session_id: str) -> bool:
        """Verify user can access study session"""
        return True  # Simplified for demo
    
    def _get_annotation_info(self, annotation_id: str) -> Optional[Dict]:
        """Get annotation information for room targeting"""
        # Would query database for annotation details
        return {'file_id': 'file1', 'group_id': 'group1'}  # Simplified
    
    def _get_annotation_broadcast_rooms(self, annotation_info: Dict) -> List[str]:
        """Get rooms to broadcast annotation updates"""
        rooms = []
        if annotation_info.get('file_id'):
            rooms.append(f"file_{annotation_info['file_id']}")
        if annotation_info.get('group_id'):
            rooms.append(f"study_group_{annotation_info['group_id']}")
        return rooms
    
    def _process_note_operation(self, note_id: str, operation: Dict, user_id: str) -> Dict:
        """Process operational transform for collaborative editing"""
        # Would implement operational transform algorithm
        # For now, return operation as-is with metadata
        operation['processed_at'] = datetime.utcnow().isoformat()
        operation['user_id'] = user_id
        return operation
    
    def _get_note_current_state(self, note_id: str) -> Dict:
        """Get current state of collaborative note"""
        # Would query database for current note content
        return {'content': '', 'version': 1}  # Simplified
    
    def _get_active_note_editors(self, note_id: str) -> List[str]:
        """Get list of users currently editing note"""
        room = f"note_{note_id}"
        editors = []
        for user_id, conn_info in self.user_connections.items():
            if room in conn_info.get('rooms', set()):
                editors.append(user_id)
        return editors
    
    def _get_discussion_info(self, discussion_id: str) -> Dict:
        """Get discussion information"""
        return {'group_id': 'group1', 'course_id': 'course1'}  # Simplified
    
    def _get_discussion_broadcast_rooms(self, discussion_info: Dict) -> List[str]:
        """Get rooms to broadcast discussion updates"""
        rooms = []
        if discussion_info.get('group_id'):
            rooms.append(f"study_group_{discussion_info['group_id']}")
        if discussion_info.get('course_id'):
            rooms.append(f"course_{discussion_info['course_id']}")
        return rooms
    
    def _get_session_state(self, session_id: str) -> Dict:
        """Get current study session state"""
        session_info = self.active_sessions.get(session_id, {})
        return {
            'session_id': session_id,
            'participant_count': len(session_info.get('participants', set())),
            'whiteboard_data': self._get_whiteboard_state(session_id),
            'started_at': session_info.get('started_at', datetime.utcnow()).isoformat()
        }
    
    def _store_whiteboard_state(self, session_id: str, whiteboard_data: Dict):
        """Store whiteboard state in Redis"""
        try:
            key = f"whiteboard:{session_id}"
            self.redis.setex(key, 3600, json.dumps(whiteboard_data))  # 1 hour TTL
        except Exception as e:
            logger.error(f"Failed to store whiteboard state: {e}")
    
    def _get_whiteboard_state(self, session_id: str) -> Dict:
        """Get whiteboard state from Redis"""
        try:
            key = f"whiteboard:{session_id}"
            data = self.redis.get(key)
            return json.loads(data) if data else {}
        except Exception as e:
            logger.error(f"Failed to get whiteboard state: {e}")
            return {}
    
    def _notify_room_leave(self, room: str, user_id: str):
        """Notify room that user has left"""
        if room.startswith('study_group_'):
            group_id = room.split('_')[2]
            emit('user_left_group', {
                'user_id': user_id,
                'group_id': group_id,
                'timestamp': datetime.utcnow().isoformat()
            }, room=room)
        elif room.startswith('study_session_'):
            session_id = room.split('_')[2]
            if session_id in self.active_sessions:
                self.active_sessions[session_id]['participants'].discard(user_id)
            emit('user_left_session', {
                'user_id': user_id,
                'session_id': session_id,
                'timestamp': datetime.utcnow().isoformat()
            }, room=room)

# Global instance to be initialized in app.py
collaboration_ws_manager = None

def init_websocket_manager(socketio: SocketIO, redis_client: redis.Redis):
    """Initialize the WebSocket manager"""
    global collaboration_ws_manager
    collaboration_ws_manager = CollaborationWebSocketManager(socketio, redis_client)
    return collaboration_ws_manager
"""
Service layer for collaborative learning features
Implements business logic for study groups, annotations, discussions, and collaborative notes.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from repositories.collaboration_repository import CollaborationRepository
from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from repositories.file_repository import FileRepository
from db.connection import get_db_session
from core.exceptions import ValidationError, NotFoundError, PermissionError
# Try to import websocket manager - may not be available
try:
    from core.websocket_manager import collaboration_ws_manager
except ImportError:
    collaboration_ws_manager = None

class CollaborationService:
    """Service for collaborative learning features"""
    
    def __init__(self):
        self.collab_repo = CollaborationRepository()
        self.user_repo = UserRepository()
        self.course_repo = CourseRepository()
        self.file_repo = FileRepository()
    
    # Study Group Management
    
    def create_study_group(self, user_id: UUID, course_id: UUID, name: str, 
                          description: Optional[str] = None, is_public: bool = True,
                          max_members: int = 10, **kwargs) -> Dict[str, Any]:
        """Create a new study group"""
        with get_db_session() as session:
            # Verify user is enrolled in course
            if not self._verify_course_access(session, user_id, course_id):
                raise PermissionError("Not enrolled in this course")
            
            # Check if course allows collaboration
            course = self.course_repo.get_course_by_id(session, course_id)
            if not course or not course.allow_collaboration:
                raise ValidationError("Collaboration not allowed for this course")
            
            # Create study group
            study_group = self.collab_repo.create_study_group(
                session=session,
                name=name,
                description=description,
                course_id=course_id,
                created_by=user_id,
                is_public=is_public,
                max_members=max_members,
                **kwargs
            )
            
            return self._format_study_group(study_group, include_members=True)
    
    def get_study_group(self, user_id: UUID, group_id: UUID) -> Dict[str, Any]:
        """Get study group details"""
        with get_db_session() as session:
            study_group = self.collab_repo.get_study_group(session, group_id, include_members=True)
            if not study_group:
                raise NotFoundError("Study group not found")
            
            # Check if user has access
            if not self._verify_group_access(session, user_id, group_id):
                raise PermissionError("Not authorized to view this group")
            
            return self._format_study_group(study_group, include_members=True)
    
    def get_user_study_groups(self, user_id: UUID, course_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        """Get all study groups for a user"""
        with get_db_session() as session:
            study_groups = self.collab_repo.get_user_study_groups(session, user_id, course_id)
            return [self._format_study_group(group, include_members=True) for group in study_groups]
    
    def get_course_study_groups(self, user_id: UUID, course_id: UUID) -> List[Dict[str, Any]]:
        """Get public study groups for a course"""
        with get_db_session() as session:
            # Verify user has access to course
            if not self._verify_course_access(session, user_id, course_id):
                raise PermissionError("Not enrolled in this course")
            
            study_groups = self.collab_repo.get_course_study_groups(session, course_id, is_public_only=True)
            return [self._format_study_group(group) for group in study_groups]
    
    def join_study_group(self, user_id: UUID, group_id: Optional[UUID] = None, 
                        invite_code: Optional[str] = None) -> Dict[str, Any]:
        """Join a study group by ID or invite code"""
        with get_db_session() as session:
            if invite_code:
                study_group = self.collab_repo.find_study_group_by_invite_code(session, invite_code)
                if not study_group:
                    raise NotFoundError("Invalid invite code")
                group_id = study_group.id
            elif group_id:
                study_group = self.collab_repo.get_study_group(session, group_id)
                if not study_group:
                    raise NotFoundError("Study group not found")
            else:
                raise ValidationError("Either group_id or invite_code is required")
            
            # Verify user is enrolled in the course
            if not self._verify_course_access(session, user_id, study_group.course_id):
                raise PermissionError("Not enrolled in this course")
            
            # Check if group is public or user has access
            if not study_group.is_public:
                raise PermissionError("This is a private group")
            
            # Add user as member
            member = self.collab_repo.add_group_member(session, group_id, user_id)
            
            # Notify WebSocket subscribers
            if collaboration_ws_manager:
                collaboration_ws_manager.socketio.emit('user_joined_group', {
                    'user_id': str(user_id),
                    'group_id': str(group_id),
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"study_group_{group_id}")
            
            return self._format_group_member(member)
    
    def leave_study_group(self, user_id: UUID, group_id: UUID):
        """Leave a study group"""
        with get_db_session() as session:
            self.collab_repo.remove_group_member(session, group_id, user_id, user_id)
            
            # Notify WebSocket subscribers
            if collaboration_ws_manager:
                collaboration_ws_manager.socketio.emit('user_left_group', {
                    'user_id': str(user_id),
                    'group_id': str(group_id),
                    'timestamp': datetime.utcnow().isoformat()
                }, room=f"study_group_{group_id}")
    
    def update_study_group(self, user_id: UUID, group_id: UUID, **updates) -> Dict[str, Any]:
        """Update study group (admin only)"""
        with get_db_session() as session:
            # Verify user is admin of group
            member = self.collab_repo.get_group_member(session, group_id, user_id)
            if not member or member.role != 'admin':
                raise PermissionError("Not authorized to update this group")
            
            study_group = self.collab_repo.update_study_group(session, group_id, **updates)
            return self._format_study_group(study_group)
    
    # Shared Annotations
    
    def create_annotation(self, user_id: UUID, file_id: UUID, annotation_type: str,
                         content: str, position_data: Dict, group_id: Optional[UUID] = None,
                         color: str = '#ffff00', is_public: bool = False) -> Dict[str, Any]:
        """Create a shared annotation"""
        with get_db_session() as session:
            # Verify file access
            if not self._verify_file_access(session, user_id, file_id):
                raise PermissionError("Not authorized to annotate this file")
            
            # If group_id provided, verify group membership
            if group_id and not self._verify_group_access(session, user_id, group_id):
                raise PermissionError("Not a member of this group")
            
            # Create annotation
            annotation = self.collab_repo.create_annotation(
                session=session,
                file_id=file_id,
                group_id=group_id,
                created_by=user_id,
                annotation_type=annotation_type,
                content=content,
                position_data=position_data,
                color=color,
                is_public=is_public
            )
            
            # Notify WebSocket subscribers
            if collaboration_ws_manager:
                rooms = [f"file_{file_id}"]
                if group_id:
                    rooms.append(f"study_group_{group_id}")
                
                for room in rooms:
                    collaboration_ws_manager.socketio.emit('new_annotation', {
                        'annotation': self._format_annotation(annotation),
                        'created_by': str(user_id),
                        'file_id': str(file_id),
                        'group_id': str(group_id) if group_id else None,
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=room)
            
            return self._format_annotation(annotation)
    
    def get_file_annotations(self, user_id: UUID, file_id: UUID, 
                           group_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        """Get annotations for a file"""
        with get_db_session() as session:
            # Verify file access
            if not self._verify_file_access(session, user_id, file_id):
                raise PermissionError("Not authorized to view annotations for this file")
            
            annotations = self.collab_repo.get_file_annotations(
                session, file_id, user_id, group_id, include_public=True
            )
            return [self._format_annotation(annotation) for annotation in annotations]
    
    def add_annotation_reaction(self, user_id: UUID, annotation_id: UUID, reaction_type: str) -> Dict[str, Any]:
        """Add reaction to annotation"""
        with get_db_session() as session:
            # Verify annotation access (simplified - would check file/group access)
            annotation = session.query(self.collab_repo.model_class.SharedAnnotation).filter_by(id=annotation_id).first()
            if not annotation:
                raise NotFoundError("Annotation not found")
            
            reaction = self.collab_repo.add_annotation_reaction(session, annotation_id, user_id, reaction_type)
            return self._format_annotation_reaction(reaction)
    
    # Peer Discussions
    
    def create_discussion(self, user_id: UUID, course_id: UUID, title: str, content: str,
                         discussion_type: str = 'question', file_id: Optional[UUID] = None,
                         annotation_id: Optional[UUID] = None, group_id: Optional[UUID] = None,
                         tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Create a peer discussion"""
        with get_db_session() as session:
            # Verify course access
            if not self._verify_course_access(session, user_id, course_id):
                raise PermissionError("Not enrolled in this course")
            
            # If group_id provided, verify group membership
            if group_id and not self._verify_group_access(session, user_id, group_id):
                raise PermissionError("Not a member of this group")
            
            discussion = self.collab_repo.create_discussion(
                session=session,
                title=title,
                content=content,
                file_id=file_id,
                annotation_id=annotation_id,
                group_id=group_id,
                course_id=course_id,
                created_by=user_id,
                discussion_type=discussion_type,
                tags=tags
            )
            
            return self._format_discussion(discussion)
    
    def get_course_discussions(self, user_id: UUID, course_id: UUID,
                             discussion_type: Optional[str] = None,
                             group_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        """Get discussions for a course"""
        with get_db_session() as session:
            # Verify course access
            if not self._verify_course_access(session, user_id, course_id):
                raise PermissionError("Not enrolled in this course")
            
            discussions = self.collab_repo.get_course_discussions(
                session, course_id, discussion_type, group_id
            )
            return [self._format_discussion(discussion) for discussion in discussions]
    
    def add_discussion_reply(self, user_id: UUID, discussion_id: UUID, content: str,
                           parent_reply_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Add reply to discussion"""
        with get_db_session() as session:
            # Verify discussion access (simplified)
            discussion = self.collab_repo.get_discussion(session, discussion_id, include_replies=False)
            if not discussion:
                raise NotFoundError("Discussion not found")
            
            # Verify course access
            if not self._verify_course_access(session, user_id, discussion.course_id):
                raise PermissionError("Not enrolled in this course")
            
            reply = self.collab_repo.add_discussion_reply(
                session=session,
                discussion_id=discussion_id,
                parent_reply_id=parent_reply_id,
                content=content,
                created_by=user_id
            )
            
            # Notify WebSocket subscribers
            if collaboration_ws_manager:
                rooms = [f"course_{discussion.course_id}"]
                if discussion.group_id:
                    rooms.append(f"study_group_{discussion.group_id}")
                
                for room in rooms:
                    collaboration_ws_manager.socketio.emit('new_discussion_reply', {
                        'discussion_id': str(discussion_id),
                        'reply': self._format_discussion_reply(reply),
                        'created_by': str(user_id),
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=room)
            
            return self._format_discussion_reply(reply)
    
    def vote_on_discussion(self, user_id: UUID, discussion_id: UUID, vote_type: str) -> Dict[str, Any]:
        """Vote on discussion"""
        with get_db_session() as session:
            vote = self.collab_repo.vote_on_discussion(session, discussion_id, user_id, vote_type)
            return self._format_discussion_vote(vote)
    
    # Collaborative Notes
    
    def create_collaborative_note(self, user_id: UUID, course_id: UUID, title: str,
                                 content: Dict, file_id: Optional[UUID] = None,
                                 group_id: Optional[UUID] = None,
                                 is_template: bool = False) -> Dict[str, Any]:
        """Create a collaborative note"""
        with get_db_session() as session:
            # Verify course access
            if not self._verify_course_access(session, user_id, course_id):
                raise PermissionError("Not enrolled in this course")
            
            # If group_id provided, verify group membership
            if group_id and not self._verify_group_access(session, user_id, group_id):
                raise PermissionError("Not a member of this group")
            
            note = self.collab_repo.create_collaborative_note(
                session=session,
                title=title,
                content=content,
                file_id=file_id,
                group_id=group_id,
                course_id=course_id,
                created_by=user_id,
                is_template=is_template
            )
            
            return self._format_collaborative_note(note)
    
    def get_collaborative_note(self, user_id: UUID, note_id: UUID) -> Dict[str, Any]:
        """Get collaborative note"""
        with get_db_session() as session:
            note = self.collab_repo.get_collaborative_note(session, note_id)
            if not note:
                raise NotFoundError("Note not found")
            
            # Verify access (simplified - would check course/group access)
            if not self._verify_course_access(session, user_id, note.course_id):
                raise PermissionError("Not authorized to view this note")
            
            return self._format_collaborative_note(note)
    
    def get_file_notes(self, user_id: UUID, file_id: UUID) -> List[Dict[str, Any]]:
        """Get collaborative notes for a file"""
        with get_db_session() as session:
            # Verify file access
            if not self._verify_file_access(session, user_id, file_id):
                raise PermissionError("Not authorized to view notes for this file")
            
            notes = self.collab_repo.get_file_notes(session, file_id, user_id)
            return [self._format_collaborative_note(note) for note in notes]
    
    # User Preferences
    
    def get_collaboration_preferences(self, user_id: UUID) -> Dict[str, Any]:
        """Get user's collaboration preferences"""
        with get_db_session() as session:
            prefs = self.collab_repo.get_user_collaboration_preferences(session, user_id)
            if not prefs:
                # Return defaults
                return {
                    'allow_public_annotations': False,
                    'allow_study_group_invites': True,
                    'allow_peer_discussions': True,
                    'default_annotation_privacy': 'private',
                    'collaboration_level': 'selective',
                    'notification_preferences': {
                        'group_invites': True,
                        'annotation_replies': True,
                        'discussion_mentions': True
                    }
                }
            return self._format_collaboration_preferences(prefs)
    
    def update_collaboration_preferences(self, user_id: UUID, **preferences) -> Dict[str, Any]:
        """Update user's collaboration preferences"""
        with get_db_session() as session:
            prefs = self.collab_repo.update_collaboration_preferences(session, user_id, **preferences)
            return self._format_collaboration_preferences(prefs)
    
    def get_collaboration_stats(self, user_id: UUID) -> Dict[str, Any]:
        """Get collaboration statistics for user"""
        with get_db_session() as session:
            return self.collab_repo.get_user_collaboration_stats(session, user_id)
    
    # Helper methods
    
    def _verify_course_access(self, session: Session, user_id: UUID, course_id: UUID) -> bool:
        """Verify user has access to course"""
        # Simplified - would check enrollment or instructor status
        return True
    
    def _verify_group_access(self, session: Session, user_id: UUID, group_id: UUID) -> bool:
        """Verify user has access to study group"""
        member = self.collab_repo.get_group_member(session, group_id, user_id)
        return member is not None
    
    def _verify_file_access(self, session: Session, user_id: UUID, file_id: UUID) -> bool:
        """Verify user has access to file"""
        # Simplified - would check course enrollment and file permissions
        return True
    
    # Formatting methods
    
    def _format_study_group(self, study_group, include_members: bool = False) -> Dict[str, Any]:
        """Format study group for response"""
        result = {
            'id': str(study_group.id),
            'name': study_group.name,
            'description': study_group.description,
            'course_id': str(study_group.course_id),
            'created_by': str(study_group.created_by),
            'is_public': study_group.is_public,
            'max_members': study_group.max_members,
            'invite_code': study_group.invite_code,
            'study_schedule': study_group.study_schedule,
            'collaboration_settings': study_group.collaboration_settings,
            'created_at': study_group.created_at.isoformat(),
            'updated_at': study_group.updated_at.isoformat()
        }
        
        if include_members and hasattr(study_group, 'members'):
            result['members'] = [self._format_group_member(member) for member in study_group.members]
            result['member_count'] = len(study_group.members)
        
        return result
    
    def _format_group_member(self, member) -> Dict[str, Any]:
        """Format group member for response"""
        return {
            'id': str(member.id),
            'user_id': str(member.user_id),
            'role': member.role,
            'collaboration_preferences': member.collaboration_preferences,
            'joined_at': member.joined_at.isoformat(),
            'last_active': member.last_active.isoformat()
        }
    
    def _format_annotation(self, annotation) -> Dict[str, Any]:
        """Format annotation for response"""
        return {
            'id': str(annotation.id),
            'file_id': str(annotation.file_id),
            'group_id': str(annotation.group_id) if annotation.group_id else None,
            'created_by': str(annotation.created_by),
            'annotation_type': annotation.annotation_type,
            'content': annotation.content,
            'position_data': annotation.position_data,
            'color': annotation.color,
            'is_public': annotation.is_public,
            'is_resolved': annotation.is_resolved,
            'metadata': annotation.metadata,
            'created_at': annotation.created_at.isoformat(),
            'updated_at': annotation.updated_at.isoformat()
        }
    
    def _format_annotation_reaction(self, reaction) -> Dict[str, Any]:
        """Format annotation reaction for response"""
        return {
            'id': str(reaction.id),
            'annotation_id': str(reaction.annotation_id),
            'user_id': str(reaction.user_id),
            'reaction_type': reaction.reaction_type,
            'created_at': reaction.created_at.isoformat()
        }
    
    def _format_discussion(self, discussion) -> Dict[str, Any]:
        """Format discussion for response"""
        return {
            'id': str(discussion.id),
            'title': discussion.title,
            'content': discussion.content,
            'file_id': str(discussion.file_id) if discussion.file_id else None,
            'annotation_id': str(discussion.annotation_id) if discussion.annotation_id else None,
            'group_id': str(discussion.group_id) if discussion.group_id else None,
            'course_id': str(discussion.course_id),
            'created_by': str(discussion.created_by),
            'discussion_type': discussion.discussion_type,
            'is_pinned': discussion.is_pinned,
            'is_resolved': discussion.is_resolved,
            'tags': discussion.tags,
            'metadata': discussion.metadata,
            'created_at': discussion.created_at.isoformat(),
            'updated_at': discussion.updated_at.isoformat()
        }
    
    def _format_discussion_reply(self, reply) -> Dict[str, Any]:
        """Format discussion reply for response"""
        return {
            'id': str(reply.id),
            'discussion_id': str(reply.discussion_id),
            'parent_reply_id': str(reply.parent_reply_id) if reply.parent_reply_id else None,
            'content': reply.content,
            'created_by': str(reply.created_by),
            'is_solution': reply.is_solution,
            'upvotes': reply.upvotes,
            'metadata': reply.metadata,
            'created_at': reply.created_at.isoformat(),
            'updated_at': reply.updated_at.isoformat()
        }
    
    def _format_discussion_vote(self, vote) -> Dict[str, Any]:
        """Format discussion vote for response"""
        return {
            'id': str(vote.id),
            'discussion_id': str(vote.discussion_id) if vote.discussion_id else None,
            'reply_id': str(vote.reply_id) if vote.reply_id else None,
            'user_id': str(vote.user_id),
            'vote_type': vote.vote_type,
            'created_at': vote.created_at.isoformat()
        }
    
    def _format_collaborative_note(self, note) -> Dict[str, Any]:
        """Format collaborative note for response"""
        return {
            'id': str(note.id),
            'title': note.title,
            'content': note.content,
            'file_id': str(note.file_id) if note.file_id else None,
            'group_id': str(note.group_id) if note.group_id else None,
            'course_id': str(note.course_id),
            'created_by': str(note.created_by),
            'last_edited_by': str(note.last_edited_by) if note.last_edited_by else None,
            'is_template': note.is_template,
            'collaboration_mode': note.collaboration_mode,
            'version': note.version,
            'edit_history': note.edit_history,
            'metadata': note.metadata,
            'created_at': note.created_at.isoformat(),
            'updated_at': note.updated_at.isoformat()
        }
    
    def _format_collaboration_preferences(self, prefs) -> Dict[str, Any]:
        """Format collaboration preferences for response"""
        return {
            'user_id': str(prefs.user_id),
            'allow_public_annotations': prefs.allow_public_annotations,
            'allow_study_group_invites': prefs.allow_study_group_invites,
            'allow_peer_discussions': prefs.allow_peer_discussions,
            'default_annotation_privacy': prefs.default_annotation_privacy,
            'notification_preferences': prefs.notification_preferences,
            'collaboration_level': prefs.collaboration_level,
            'timezone': prefs.timezone,
            'study_availability': prefs.study_availability,
            'privacy_settings': prefs.privacy_settings,
            'created_at': prefs.created_at.isoformat(),
            'updated_at': prefs.updated_at.isoformat()
        }
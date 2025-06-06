"""
Repository layer for collaborative learning features
Handles database operations for study groups, annotations, discussions, and collaborative notes.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc
from sqlalchemy.exc import IntegrityError

from db.schema import (
    StudyGroup, StudyGroupMember, SharedAnnotation, PeerDiscussion,
    DiscussionReply, CollaborativeNote, NoteEditOperation,
    CollaborativeStudySession, StudySessionParticipant,
    UserCollaborationPreferences, AnnotationReaction, DiscussionVote,
    User, Course, File
)
from repositories.base_repository import BaseRepository
from core.exceptions import ValidationError, NotFoundError

class CollaborationRepository(BaseRepository):
    """Repository for collaborative learning features"""
    
    def __init__(self, session_factory=None):
        """Initialize CollaborationRepository with StudyGroup as primary model"""
        from core.database_supabase import db_manager
        if session_factory is None:
            session_factory = db_manager.session_factory
        super().__init__(StudyGroup, session_factory)
    
    # Study Group Management
    
    def create_study_group(self, session: Session, **kwargs) -> StudyGroup:
        """Create a new study group"""
        try:
            # Generate unique invite code
            invite_code = self._generate_invite_code()
            
            study_group = StudyGroup(
                invite_code=invite_code,
                **kwargs
            )
            session.add(study_group)
            session.flush()
            
            # Add creator as admin member
            self.add_group_member(
                session=session,
                group_id=study_group.id,
                user_id=study_group.created_by,
                role='admin'
            )
            
            session.commit()
            return study_group
            
        except IntegrityError as e:
            session.rollback()
            raise ValidationError("Failed to create study group") from e
    
    def get_study_group(self, session: Session, group_id: UUID, include_members: bool = False) -> Optional[StudyGroup]:
        """Get study group by ID"""
        query = session.query(StudyGroup).filter(StudyGroup.id == group_id)
        
        if include_members:
            query = query.options(joinedload(StudyGroup.members).joinedload(StudyGroupMember.user))
        
        return query.first()
    
    def get_user_study_groups(self, session: Session, user_id: UUID, course_id: Optional[UUID] = None) -> List[StudyGroup]:
        """Get all study groups for a user"""
        query = session.query(StudyGroup).join(StudyGroupMember).filter(
            StudyGroupMember.user_id == user_id
        )
        
        if course_id:
            query = query.filter(StudyGroup.course_id == course_id)
        
        return query.options(joinedload(StudyGroup.members)).all()
    
    def get_course_study_groups(self, session: Session, course_id: UUID, is_public_only: bool = True) -> List[StudyGroup]:
        """Get all study groups for a course"""
        query = session.query(StudyGroup).filter(StudyGroup.course_id == course_id)
        
        if is_public_only:
            query = query.filter(StudyGroup.is_public == True)
        
        return query.options(joinedload(StudyGroup.members)).all()
    
    def find_study_group_by_invite_code(self, session: Session, invite_code: str) -> Optional[StudyGroup]:
        """Find study group by invite code"""
        return session.query(StudyGroup).filter(StudyGroup.invite_code == invite_code).first()
    
    def update_study_group(self, session: Session, group_id: UUID, **updates) -> StudyGroup:
        """Update study group"""
        study_group = self.get_study_group(session, group_id)
        if not study_group:
            raise NotFoundError("Study group not found")
        
        for key, value in updates.items():
            if hasattr(study_group, key):
                setattr(study_group, key, value)
        
        study_group.updated_at = datetime.utcnow()
        session.commit()
        return study_group
    
    def delete_study_group(self, session: Session, group_id: UUID, user_id: UUID):
        """Delete study group (only by creator or admin)"""
        study_group = self.get_study_group(session, group_id)
        if not study_group:
            raise NotFoundError("Study group not found")
        
        # Check if user is creator or admin
        if study_group.created_by != user_id:
            member = self.get_group_member(session, group_id, user_id)
            if not member or member.role != 'admin':
                raise ValidationError("Not authorized to delete study group")
        
        session.delete(study_group)
        session.commit()
    
    # Study Group Member Management
    
    def add_group_member(self, session: Session, group_id: UUID, user_id: UUID, role: str = 'member') -> StudyGroupMember:
        """Add member to study group"""
        try:
            # Check if group is at capacity
            study_group = self.get_study_group(session, group_id)
            if not study_group:
                raise NotFoundError("Study group not found")
            
            current_member_count = session.query(StudyGroupMember).filter(
                StudyGroupMember.group_id == group_id
            ).count()
            
            if current_member_count >= study_group.max_members:
                raise ValidationError("Study group is at maximum capacity")
            
            member = StudyGroupMember(
                group_id=group_id,
                user_id=user_id,
                role=role
            )
            session.add(member)
            session.commit()
            return member
            
        except IntegrityError:
            session.rollback()
            raise ValidationError("User is already a member of this group")
    
    def get_group_member(self, session: Session, group_id: UUID, user_id: UUID) -> Optional[StudyGroupMember]:
        """Get specific group member"""
        return session.query(StudyGroupMember).filter(
            and_(
                StudyGroupMember.group_id == group_id,
                StudyGroupMember.user_id == user_id
            )
        ).first()
    
    def get_group_members(self, session: Session, group_id: UUID) -> List[StudyGroupMember]:
        """Get all members of a study group"""
        return session.query(StudyGroupMember).filter(
            StudyGroupMember.group_id == group_id
        ).options(joinedload(StudyGroupMember.user)).all()
    
    def update_member_role(self, session: Session, group_id: UUID, user_id: UUID, new_role: str, updated_by: UUID):
        """Update member role in study group"""
        # Check if updater has permission
        updater_member = self.get_group_member(session, group_id, updated_by)
        if not updater_member or updater_member.role not in ['admin']:
            raise ValidationError("Not authorized to update member roles")
        
        member = self.get_group_member(session, group_id, user_id)
        if not member:
            raise NotFoundError("Member not found")
        
        member.role = new_role
        session.commit()
        return member
    
    def remove_group_member(self, session: Session, group_id: UUID, user_id: UUID, removed_by: UUID):
        """Remove member from study group"""
        # Check if remover has permission (admin or self)
        if removed_by != user_id:
            remover_member = self.get_group_member(session, group_id, removed_by)
            if not remover_member or remover_member.role not in ['admin']:
                raise ValidationError("Not authorized to remove members")
        
        member = self.get_group_member(session, group_id, user_id)
        if not member:
            raise NotFoundError("Member not found")
        
        session.delete(member)
        session.commit()
    
    # Shared Annotations
    
    def create_annotation(self, session: Session, **kwargs) -> SharedAnnotation:
        """Create a shared annotation"""
        annotation = SharedAnnotation(**kwargs)
        session.add(annotation)
        session.commit()
        return annotation
    
    def get_file_annotations(self, session: Session, file_id: UUID, user_id: UUID, 
                           group_id: Optional[UUID] = None, include_public: bool = True) -> List[SharedAnnotation]:
        """Get annotations for a file"""
        query = session.query(SharedAnnotation).filter(SharedAnnotation.file_id == file_id)
        
        # Filter based on visibility
        visibility_filters = [SharedAnnotation.created_by == user_id]  # User's own annotations
        
        if group_id:
            visibility_filters.append(SharedAnnotation.group_id == group_id)  # Group annotations
        
        if include_public:
            visibility_filters.append(SharedAnnotation.is_public == True)  # Public annotations
        
        query = query.filter(or_(*visibility_filters))
        
        return query.options(
            joinedload(SharedAnnotation.creator),
            joinedload(SharedAnnotation.reactions)
        ).order_by(SharedAnnotation.created_at).all()
    
    def get_group_annotations(self, session: Session, group_id: UUID) -> List[SharedAnnotation]:
        """Get all annotations for a study group"""
        return session.query(SharedAnnotation).filter(
            SharedAnnotation.group_id == group_id
        ).options(
            joinedload(SharedAnnotation.creator),
            joinedload(SharedAnnotation.file),
            joinedload(SharedAnnotation.reactions)
        ).order_by(desc(SharedAnnotation.created_at)).all()
    
    def update_annotation(self, session: Session, annotation_id: UUID, user_id: UUID, **updates) -> SharedAnnotation:
        """Update annotation (only by creator)"""
        annotation = session.query(SharedAnnotation).filter(SharedAnnotation.id == annotation_id).first()
        if not annotation:
            raise NotFoundError("Annotation not found")
        
        if annotation.created_by != user_id:
            raise ValidationError("Not authorized to update this annotation")
        
        for key, value in updates.items():
            if hasattr(annotation, key):
                setattr(annotation, key, value)
        
        annotation.updated_at = datetime.utcnow()
        session.commit()
        return annotation
    
    def delete_annotation(self, session: Session, annotation_id: UUID, user_id: UUID):
        """Delete annotation (only by creator)"""
        annotation = session.query(SharedAnnotation).filter(SharedAnnotation.id == annotation_id).first()
        if not annotation:
            raise NotFoundError("Annotation not found")
        
        if annotation.created_by != user_id:
            raise ValidationError("Not authorized to delete this annotation")
        
        session.delete(annotation)
        session.commit()
    
    def add_annotation_reaction(self, session: Session, annotation_id: UUID, user_id: UUID, reaction_type: str) -> AnnotationReaction:
        """Add reaction to annotation"""
        try:
            reaction = AnnotationReaction(
                annotation_id=annotation_id,
                user_id=user_id,
                reaction_type=reaction_type
            )
            session.add(reaction)
            session.commit()
            return reaction
        except IntegrityError:
            session.rollback()
            raise ValidationError("Reaction already exists")
    
    def remove_annotation_reaction(self, session: Session, annotation_id: UUID, user_id: UUID, reaction_type: str):
        """Remove reaction from annotation"""
        reaction = session.query(AnnotationReaction).filter(
            and_(
                AnnotationReaction.annotation_id == annotation_id,
                AnnotationReaction.user_id == user_id,
                AnnotationReaction.reaction_type == reaction_type
            )
        ).first()
        
        if reaction:
            session.delete(reaction)
            session.commit()
    
    # Peer Discussions
    
    def create_discussion(self, session: Session, **kwargs) -> PeerDiscussion:
        """Create a peer discussion"""
        discussion = PeerDiscussion(**kwargs)
        session.add(discussion)
        session.commit()
        return discussion
    
    def get_discussion(self, session: Session, discussion_id: UUID, include_replies: bool = True) -> Optional[PeerDiscussion]:
        """Get discussion by ID"""
        query = session.query(PeerDiscussion).filter(PeerDiscussion.id == discussion_id)
        
        if include_replies:
            query = query.options(
                joinedload(PeerDiscussion.replies).joinedload(DiscussionReply.creator),
                joinedload(PeerDiscussion.creator)
            )
        
        return query.first()
    
    def get_course_discussions(self, session: Session, course_id: UUID, 
                             discussion_type: Optional[str] = None, group_id: Optional[UUID] = None) -> List[PeerDiscussion]:
        """Get discussions for a course"""
        query = session.query(PeerDiscussion).filter(PeerDiscussion.course_id == course_id)
        
        if discussion_type:
            query = query.filter(PeerDiscussion.discussion_type == discussion_type)
        
        if group_id:
            query = query.filter(PeerDiscussion.group_id == group_id)
        
        return query.options(
            joinedload(PeerDiscussion.creator),
            joinedload(PeerDiscussion.replies)
        ).order_by(desc(PeerDiscussion.is_pinned), desc(PeerDiscussion.created_at)).all()
    
    def get_file_discussions(self, session: Session, file_id: UUID) -> List[PeerDiscussion]:
        """Get discussions tied to a specific file"""
        return session.query(PeerDiscussion).filter(
            PeerDiscussion.file_id == file_id
        ).options(
            joinedload(PeerDiscussion.creator),
            joinedload(PeerDiscussion.replies)
        ).order_by(desc(PeerDiscussion.created_at)).all()
    
    def add_discussion_reply(self, session: Session, **kwargs) -> DiscussionReply:
        """Add reply to discussion"""
        reply = DiscussionReply(**kwargs)
        session.add(reply)
        session.commit()
        return reply
    
    def vote_on_discussion(self, session: Session, discussion_id: UUID, user_id: UUID, vote_type: str) -> DiscussionVote:
        """Vote on discussion"""
        try:
            # Remove existing vote if any
            existing_vote = session.query(DiscussionVote).filter(
                and_(
                    DiscussionVote.discussion_id == discussion_id,
                    DiscussionVote.user_id == user_id
                )
            ).first()
            
            if existing_vote:
                session.delete(existing_vote)
            
            # Add new vote
            vote = DiscussionVote(
                discussion_id=discussion_id,
                user_id=user_id,
                vote_type=vote_type
            )
            session.add(vote)
            session.commit()
            return vote
            
        except IntegrityError:
            session.rollback()
            raise ValidationError("Failed to record vote")
    
    def vote_on_reply(self, session: Session, reply_id: UUID, user_id: UUID, vote_type: str) -> DiscussionVote:
        """Vote on discussion reply"""
        try:
            # Remove existing vote if any
            existing_vote = session.query(DiscussionVote).filter(
                and_(
                    DiscussionVote.reply_id == reply_id,
                    DiscussionVote.user_id == user_id
                )
            ).first()
            
            if existing_vote:
                session.delete(existing_vote)
            
            # Add new vote
            vote = DiscussionVote(
                reply_id=reply_id,
                user_id=user_id,
                vote_type=vote_type
            )
            session.add(vote)
            session.commit()
            return vote
            
        except IntegrityError:
            session.rollback()
            raise ValidationError("Failed to record vote")
    
    # Collaborative Notes
    
    def create_collaborative_note(self, session: Session, **kwargs) -> CollaborativeNote:
        """Create a collaborative note"""
        note = CollaborativeNote(**kwargs)
        session.add(note)
        session.commit()
        return note
    
    def get_collaborative_note(self, session: Session, note_id: UUID) -> Optional[CollaborativeNote]:
        """Get collaborative note by ID"""
        return session.query(CollaborativeNote).filter(
            CollaborativeNote.id == note_id
        ).options(
            joinedload(CollaborativeNote.creator),
            joinedload(CollaborativeNote.last_editor)
        ).first()
    
    def get_group_notes(self, session: Session, group_id: UUID) -> List[CollaborativeNote]:
        """Get all notes for a study group"""
        return session.query(CollaborativeNote).filter(
            CollaborativeNote.group_id == group_id
        ).options(
            joinedload(CollaborativeNote.creator)
        ).order_by(desc(CollaborativeNote.updated_at)).all()
    
    def get_file_notes(self, session: Session, file_id: UUID, user_id: UUID) -> List[CollaborativeNote]:
        """Get notes tied to a specific file (only those user has access to)"""
        # This would include user's own notes and group notes they have access to
        return session.query(CollaborativeNote).filter(
            and_(
                CollaborativeNote.file_id == file_id,
                or_(
                    CollaborativeNote.created_by == user_id,
                    CollaborativeNote.group_id.in_(
                        session.query(StudyGroupMember.group_id).filter(
                            StudyGroupMember.user_id == user_id
                        )
                    )
                )
            )
        ).options(
            joinedload(CollaborativeNote.creator),
            joinedload(CollaborativeNote.group)
        ).order_by(desc(CollaborativeNote.updated_at)).all()
    
    def add_note_operation(self, session: Session, **kwargs) -> NoteEditOperation:
        """Add edit operation to collaborative note"""
        operation = NoteEditOperation(**kwargs)
        session.add(operation)
        session.commit()
        return operation
    
    def get_note_operations(self, session: Session, note_id: UUID, since_version: Optional[int] = None) -> List[NoteEditOperation]:
        """Get edit operations for a note"""
        query = session.query(NoteEditOperation).filter(NoteEditOperation.note_id == note_id)
        
        if since_version:
            query = query.filter(NoteEditOperation.version > since_version)
        
        return query.order_by(NoteEditOperation.timestamp_ms).all()
    
    # User Collaboration Preferences
    
    def get_user_collaboration_preferences(self, session: Session, user_id: UUID) -> Optional[UserCollaborationPreferences]:
        """Get user's collaboration preferences"""
        return session.query(UserCollaborationPreferences).filter(
            UserCollaborationPreferences.user_id == user_id
        ).first()
    
    def update_collaboration_preferences(self, session: Session, user_id: UUID, **preferences) -> UserCollaborationPreferences:
        """Update user's collaboration preferences"""
        existing = self.get_user_collaboration_preferences(session, user_id)
        
        if existing:
            for key, value in preferences.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            prefs = existing
        else:
            prefs = UserCollaborationPreferences(user_id=user_id, **preferences)
            session.add(prefs)
        
        session.commit()
        return prefs
    
    # Utility methods
    
    def _generate_invite_code(self, length: int = 8) -> str:
        """Generate unique invite code for study groups"""
        import string
        import secrets
        
        characters = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    def get_user_collaboration_stats(self, session: Session, user_id: UUID) -> Dict[str, Any]:
        """Get collaboration statistics for user"""
        stats = {}
        
        # Study groups count
        stats['study_groups_count'] = session.query(StudyGroupMember).filter(
            StudyGroupMember.user_id == user_id
        ).count()
        
        # Annotations count
        stats['annotations_count'] = session.query(SharedAnnotation).filter(
            SharedAnnotation.created_by == user_id
        ).count()
        
        # Discussions count
        stats['discussions_started'] = session.query(PeerDiscussion).filter(
            PeerDiscussion.created_by == user_id
        ).count()
        
        # Discussion replies count
        stats['discussion_replies'] = session.query(DiscussionReply).filter(
            DiscussionReply.created_by == user_id
        ).count()
        
        # Collaborative notes count
        stats['collaborative_notes'] = session.query(CollaborativeNote).filter(
            CollaborativeNote.created_by == user_id
        ).count()
        
        return stats
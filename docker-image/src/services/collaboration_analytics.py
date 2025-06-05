"""
Analytics integration for collaborative learning features
Tracks collaboration metrics and provides insights for Phase 4 analytics system
"""

from typing import Dict, List, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from repositories.collaboration_repository import CollaborationRepository
from db.schema import (
    StudyGroup, StudyGroupMember, SharedAnnotation, PeerDiscussion,
    DiscussionReply, CollaborativeNote, AnnotationReaction, DiscussionVote,
    UserActivity, UserStats
)
from db.connection import get_db_session


class CollaborationAnalyticsService:
    """Service for tracking and analyzing collaboration metrics"""
    
    def __init__(self):
        self.collab_repo = CollaborationRepository()
    
    def track_collaboration_activity(self, user_id: UUID, activity_type: str, 
                                   metadata: Dict[str, Any], xp_earned: int = 0):
        """Track collaborative activity for analytics"""
        with get_db_session() as session:
            # Create user activity record
            activity = UserActivity(
                user_id=user_id,
                activity_type=activity_type,
                xp_earned=xp_earned,
                description=self._get_activity_description(activity_type, metadata),
                activity_metadata=metadata
            )
            session.add(activity)
            
            # Update user stats if XP earned
            if xp_earned > 0:
                self._update_user_xp(session, user_id, xp_earned)
            
            session.commit()
    
    def _get_activity_description(self, activity_type: str, metadata: Dict) -> str:
        """Generate human-readable description for activity"""
        descriptions = {
            'study_group_created': f"Created study group '{metadata.get('group_name', 'Unknown')}'",
            'study_group_joined': f"Joined study group '{metadata.get('group_name', 'Unknown')}'",
            'annotation_created': f"Added {metadata.get('annotation_type', 'annotation')} annotation",
            'annotation_reaction': f"Reacted to annotation with {metadata.get('reaction_type', 'reaction')}",
            'discussion_created': f"Started discussion: '{metadata.get('title', 'Unknown')}'",
            'discussion_reply': "Replied to a discussion",
            'discussion_vote': f"Voted {metadata.get('vote_type', 'on')} a discussion",
            'collaborative_note_created': f"Created collaborative note: '{metadata.get('title', 'Unknown')}'",
            'collaborative_note_edited': f"Edited collaborative note: '{metadata.get('title', 'Unknown')}'",
            'study_session_joined': "Joined a collaborative study session",
            'peer_help_given': "Helped a peer with a question",
            'peer_help_received': "Received help from a peer"
        }
        return descriptions.get(activity_type, f"Performed {activity_type}")
    
    def _update_user_xp(self, session: Session, user_id: UUID, xp_earned: int):
        """Update user XP and level from collaborative activities"""
        user_stats = session.query(UserStats).filter(UserStats.user_id == user_id).first()
        
        if not user_stats:
            user_stats = UserStats(
                user_id=user_id,
                current_xp=0,
                current_level=1,
                total_xp=0
            )
            session.add(user_stats)
        
        # Add XP
        user_stats.current_xp += xp_earned
        user_stats.total_xp += xp_earned
        
        # Check for level up
        new_level = self._calculate_level(user_stats.total_xp)
        if new_level > user_stats.current_level:
            user_stats.current_level = new_level
            # Reset current XP for new level
            user_stats.current_xp = user_stats.total_xp - self._get_xp_for_level(new_level - 1)
    
    def _calculate_level(self, total_xp: int) -> int:
        """Calculate user level based on total XP"""
        # Simple level calculation: 100 XP per level
        return min(max(1, total_xp // 100 + 1), 50)  # Cap at level 50
    
    def _get_xp_for_level(self, level: int) -> int:
        """Get total XP required to reach a level"""
        return (level - 1) * 100
    
    def get_collaboration_insights(self, user_id: UUID, days: int = 30) -> Dict[str, Any]:
        """Get comprehensive collaboration insights for a user"""
        with get_db_session() as session:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            insights = {
                'overview': self._get_collaboration_overview(session, user_id, start_date, end_date),
                'study_groups': self._get_study_group_insights(session, user_id, start_date, end_date),
                'annotations': self._get_annotation_insights(session, user_id, start_date, end_date),
                'discussions': self._get_discussion_insights(session, user_id, start_date, end_date),
                'collaborative_notes': self._get_note_insights(session, user_id, start_date, end_date),
                'peer_interactions': self._get_peer_interaction_insights(session, user_id, start_date, end_date),
                'recommendations': self._generate_collaboration_recommendations(session, user_id, start_date, end_date)
            }
            
            return insights
    
    def _get_collaboration_overview(self, session: Session, user_id: UUID, 
                                  start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get overall collaboration metrics"""
        # Count activities in period
        activities = session.query(UserActivity).filter(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.created_at >= start_date,
                UserActivity.created_at <= end_date,
                UserActivity.activity_type.like('study_group_%') |
                UserActivity.activity_type.like('annotation_%') |
                UserActivity.activity_type.like('discussion_%') |
                UserActivity.activity_type.like('collaborative_note_%')
            )
        ).all()
        
        total_xp = sum(activity.xp_earned for activity in activities)
        
        # Calculate collaboration score
        collaboration_score = self._calculate_collaboration_score(session, user_id, start_date, end_date)
        
        return {
            'total_activities': len(activities),
            'total_collaboration_xp': total_xp,
            'collaboration_score': collaboration_score,
            'active_days': len(set(activity.created_at.date() for activity in activities)),
            'most_active_day': self._get_most_active_collaboration_day(activities),
            'streak_days': self._calculate_collaboration_streak(session, user_id)
        }
    
    def _get_study_group_insights(self, session: Session, user_id: UUID,
                                start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get study group participation insights"""
        # Current memberships
        current_groups = session.query(StudyGroupMember).filter(
            StudyGroupMember.user_id == user_id
        ).count()
        
        # Groups joined in period
        groups_joined = session.query(StudyGroupMember).filter(
            and_(
                StudyGroupMember.user_id == user_id,
                StudyGroupMember.joined_at >= start_date,
                StudyGroupMember.joined_at <= end_date
            )
        ).count()
        
        # Groups created in period
        groups_created = session.query(StudyGroup).filter(
            and_(
                StudyGroup.created_by == user_id,
                StudyGroup.created_at >= start_date,
                StudyGroup.created_at <= end_date
            )
        ).count()
        
        # Average group size user participates in
        avg_group_size = session.query(func.avg(
            session.query(StudyGroupMember).filter(
                StudyGroupMember.group_id == StudyGroupMember.group_id
            ).count()
        )).filter(StudyGroupMember.user_id == user_id).scalar() or 0
        
        return {
            'current_groups': current_groups,
            'groups_joined_period': groups_joined,
            'groups_created_period': groups_created,
            'average_group_size': round(float(avg_group_size), 1),
            'leadership_ratio': groups_created / max(current_groups, 1)
        }
    
    def _get_annotation_insights(self, session: Session, user_id: UUID,
                               start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get annotation usage insights"""
        # Annotations created in period
        annotations_created = session.query(SharedAnnotation).filter(
            and_(
                SharedAnnotation.created_by == user_id,
                SharedAnnotation.created_at >= start_date,
                SharedAnnotation.created_at <= end_date
            )
        ).count()
        
        # Annotation types breakdown
        annotation_types = session.query(
            SharedAnnotation.annotation_type,
            func.count(SharedAnnotation.id)
        ).filter(
            and_(
                SharedAnnotation.created_by == user_id,
                SharedAnnotation.created_at >= start_date,
                SharedAnnotation.created_at <= end_date
            )
        ).group_by(SharedAnnotation.annotation_type).all()
        
        # Reactions received
        reactions_received = session.query(AnnotationReaction).join(
            SharedAnnotation, AnnotationReaction.annotation_id == SharedAnnotation.id
        ).filter(
            and_(
                SharedAnnotation.created_by == user_id,
                AnnotationReaction.created_at >= start_date,
                AnnotationReaction.created_at <= end_date
            )
        ).count()
        
        # Public vs private annotations
        public_annotations = session.query(SharedAnnotation).filter(
            and_(
                SharedAnnotation.created_by == user_id,
                SharedAnnotation.is_public == True,
                SharedAnnotation.created_at >= start_date,
                SharedAnnotation.created_at <= end_date
            )
        ).count()
        
        return {
            'annotations_created': annotations_created,
            'annotation_types': dict(annotation_types),
            'reactions_received': reactions_received,
            'public_annotations': public_annotations,
            'private_annotations': annotations_created - public_annotations,
            'engagement_rate': reactions_received / max(annotations_created, 1)
        }
    
    def _get_discussion_insights(self, session: Session, user_id: UUID,
                               start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get discussion participation insights"""
        # Discussions started
        discussions_started = session.query(PeerDiscussion).filter(
            and_(
                PeerDiscussion.created_by == user_id,
                PeerDiscussion.created_at >= start_date,
                PeerDiscussion.created_at <= end_date
            )
        ).count()
        
        # Replies made
        replies_made = session.query(DiscussionReply).filter(
            and_(
                DiscussionReply.created_by == user_id,
                DiscussionReply.created_at >= start_date,
                DiscussionReply.created_at <= end_date
            )
        ).count()
        
        # Votes cast
        votes_cast = session.query(DiscussionVote).filter(
            and_(
                DiscussionVote.user_id == user_id,
                DiscussionVote.created_at >= start_date,
                DiscussionVote.created_at <= end_date
            )
        ).count()
        
        # Solutions provided (marked as solution)
        solutions_provided = session.query(DiscussionReply).filter(
            and_(
                DiscussionReply.created_by == user_id,
                DiscussionReply.is_solution == True,
                DiscussionReply.created_at >= start_date,
                DiscussionReply.created_at <= end_date
            )
        ).count()
        
        return {
            'discussions_started': discussions_started,
            'replies_made': replies_made,
            'votes_cast': votes_cast,
            'solutions_provided': solutions_provided,
            'help_ratio': solutions_provided / max(replies_made, 1),
            'participation_score': discussions_started * 3 + replies_made * 2 + votes_cast
        }
    
    def _get_note_insights(self, session: Session, user_id: UUID,
                         start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get collaborative note insights"""
        # Notes created
        notes_created = session.query(CollaborativeNote).filter(
            and_(
                CollaborativeNote.created_by == user_id,
                CollaborativeNote.created_at >= start_date,
                CollaborativeNote.created_at <= end_date
            )
        ).count()
        
        # Notes edited (where last_edited_by is user)
        notes_edited = session.query(CollaborativeNote).filter(
            and_(
                CollaborativeNote.last_edited_by == user_id,
                CollaborativeNote.updated_at >= start_date,
                CollaborativeNote.updated_at <= end_date,
                CollaborativeNote.created_by != user_id  # Exclude own notes
            )
        ).count()
        
        # Templates created
        templates_created = session.query(CollaborativeNote).filter(
            and_(
                CollaborativeNote.created_by == user_id,
                CollaborativeNote.is_template == True,
                CollaborativeNote.created_at >= start_date,
                CollaborativeNote.created_at <= end_date
            )
        ).count()
        
        return {
            'notes_created': notes_created,
            'notes_contributed_to': notes_edited,
            'templates_created': templates_created,
            'collaboration_ratio': notes_edited / max(notes_created, 1)
        }
    
    def _get_peer_interaction_insights(self, session: Session, user_id: UUID,
                                     start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get insights about peer interactions"""
        # Unique peers interacted with (through groups, discussions, etc.)
        peer_interactions = set()
        
        # From study groups
        group_members = session.query(StudyGroupMember.user_id).join(
            StudyGroupMember, and_(
                StudyGroupMember.group_id == StudyGroupMember.group_id,
                StudyGroupMember.user_id == user_id
            )
        ).filter(StudyGroupMember.user_id != user_id).all()
        peer_interactions.update(member.user_id for member in group_members)
        
        # From discussion replies
        discussion_peers = session.query(DiscussionReply.created_by).join(
            PeerDiscussion, DiscussionReply.discussion_id == PeerDiscussion.id
        ).filter(
            and_(
                PeerDiscussion.created_by == user_id,
                DiscussionReply.created_by != user_id,
                DiscussionReply.created_at >= start_date,
                DiscussionReply.created_at <= end_date
            )
        ).all()
        peer_interactions.update(peer.created_by for peer in discussion_peers)
        
        # Help given vs received
        help_given = session.query(UserActivity).filter(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.activity_type == 'peer_help_given',
                UserActivity.created_at >= start_date,
                UserActivity.created_at <= end_date
            )
        ).count()
        
        help_received = session.query(UserActivity).filter(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.activity_type == 'peer_help_received',
                UserActivity.created_at >= start_date,
                UserActivity.created_at <= end_date
            )
        ).count()
        
        return {
            'unique_peers_interacted': len(peer_interactions),
            'help_given': help_given,
            'help_received': help_received,
            'reciprocity_ratio': help_given / max(help_received, 1),
            'social_learning_score': len(peer_interactions) * 2 + help_given * 3 + help_received
        }
    
    def _generate_collaboration_recommendations(self, session: Session, user_id: UUID,
                                              start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Generate personalized collaboration recommendations"""
        recommendations = []
        
        # Get user's collaboration patterns
        study_groups_count = session.query(StudyGroupMember).filter(
            StudyGroupMember.user_id == user_id
        ).count()
        
        annotations_count = session.query(SharedAnnotation).filter(
            SharedAnnotation.created_by == user_id
        ).count()
        
        discussions_count = session.query(PeerDiscussion).filter(
            PeerDiscussion.created_by == user_id
        ).count()
        
        # Generate recommendations based on activity patterns
        if study_groups_count == 0:
            recommendations.append({
                'type': 'join_study_group',
                'title': 'Join a Study Group',
                'description': 'Connect with peers by joining a study group in your courses.',
                'priority': 'high',
                'xp_potential': 50
            })
        
        if annotations_count < 5:
            recommendations.append({
                'type': 'create_annotations',
                'title': 'Start Annotating',
                'description': 'Share insights by adding annotations to course materials.',
                'priority': 'medium',
                'xp_potential': 25
            })
        
        if discussions_count == 0:
            recommendations.append({
                'type': 'start_discussion',
                'title': 'Start a Discussion',
                'description': 'Ask questions or share insights to engage with classmates.',
                'priority': 'medium',
                'xp_potential': 30
            })
        
        # Advanced recommendations for active users
        if study_groups_count > 0 and annotations_count > 10:
            recommendations.append({
                'type': 'create_study_group',
                'title': 'Create Your Own Study Group',
                'description': 'Lead a study group and help organize collaborative learning.',
                'priority': 'low',
                'xp_potential': 100
            })
        
        if discussions_count > 5:
            recommendations.append({
                'type': 'mentor_peers',
                'title': 'Help Other Students',
                'description': 'Share your knowledge by answering questions in discussions.',
                'priority': 'low',
                'xp_potential': 75
            })
        
        return recommendations
    
    def _calculate_collaboration_score(self, session: Session, user_id: UUID,
                                     start_date: datetime, end_date: datetime) -> int:
        """Calculate overall collaboration score"""
        # Weighted scoring system
        weights = {
            'study_group_created': 50,
            'study_group_joined': 25,
            'annotation_created': 10,
            'annotation_reaction': 5,
            'discussion_created': 30,
            'discussion_reply': 15,
            'discussion_vote': 5,
            'collaborative_note_created': 40,
            'collaborative_note_edited': 20,
            'peer_help_given': 25,
            'peer_help_received': 10
        }
        
        total_score = 0
        activities = session.query(UserActivity).filter(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.created_at >= start_date,
                UserActivity.created_at <= end_date
            )
        ).all()
        
        for activity in activities:
            weight = weights.get(activity.activity_type, 5)  # Default weight
            total_score += weight
        
        return total_score
    
    def _get_most_active_collaboration_day(self, activities: List[UserActivity]) -> Optional[str]:
        """Get the day of week with most collaboration activity"""
        if not activities:
            return None
        
        day_counts = {}
        for activity in activities:
            day = activity.created_at.strftime('%A')
            day_counts[day] = day_counts.get(day, 0) + 1
        
        return max(day_counts.items(), key=lambda x: x[1])[0] if day_counts else None
    
    def _calculate_collaboration_streak(self, session: Session, user_id: UUID) -> int:
        """Calculate current collaboration streak in days"""
        # Get recent collaboration activities
        recent_activities = session.query(UserActivity).filter(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.activity_type.like('%collaboration%') |
                UserActivity.activity_type.like('study_group_%') |
                UserActivity.activity_type.like('annotation_%') |
                UserActivity.activity_type.like('discussion_%')
            )
        ).order_by(UserActivity.created_at.desc()).limit(30).all()
        
        if not recent_activities:
            return 0
        
        # Calculate consecutive days with activity
        streak = 0
        current_date = datetime.utcnow().date()
        activity_dates = set(activity.created_at.date() for activity in recent_activities)
        
        while current_date in activity_dates:
            streak += 1
            current_date -= timedelta(days=1)
        
        return streak
    
    def get_course_collaboration_metrics(self, course_id: UUID, days: int = 30) -> Dict[str, Any]:
        """Get collaboration metrics for an entire course"""
        with get_db_session() as session:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Study groups in course
            study_groups = session.query(StudyGroup).filter(
                StudyGroup.course_id == course_id
            ).all()
            
            # Active participants
            active_participants = set()
            for group in study_groups:
                members = session.query(StudyGroupMember).filter(
                    StudyGroupMember.group_id == group.id
                ).all()
                active_participants.update(member.user_id for member in members)
            
            # Discussions in course
            discussions = session.query(PeerDiscussion).filter(
                and_(
                    PeerDiscussion.course_id == course_id,
                    PeerDiscussion.created_at >= start_date,
                    PeerDiscussion.created_at <= end_date
                )
            ).count()
            
            # Notes in course
            notes = session.query(CollaborativeNote).filter(
                and_(
                    CollaborativeNote.course_id == course_id,
                    CollaborativeNote.created_at >= start_date,
                    CollaborativeNote.created_at <= end_date
                )
            ).count()
            
            return {
                'total_study_groups': len(study_groups),
                'active_collaborators': len(active_participants),
                'discussions_started': discussions,
                'collaborative_notes': notes,
                'collaboration_rate': len(active_participants) / max(self._get_course_enrollment_count(session, course_id), 1),
                'most_active_groups': self._get_most_active_study_groups(session, course_id, start_date, end_date)
            }
    
    def _get_course_enrollment_count(self, session: Session, course_id: UUID) -> int:
        """Get total enrollment count for a course"""
        # This would need to be implemented based on your enrollment system
        # For now, return a placeholder
        return 50
    
    def _get_most_active_study_groups(self, session: Session, course_id: UUID,
                                    start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get most active study groups in a course"""
        groups = session.query(StudyGroup).filter(
            StudyGroup.course_id == course_id
        ).all()
        
        group_activity = []
        for group in groups:
            # Count activities (annotations, discussions, notes) from group members
            member_ids = [member.user_id for member in group.members]
            
            activity_count = session.query(UserActivity).filter(
                and_(
                    UserActivity.user_id.in_(member_ids),
                    UserActivity.created_at >= start_date,
                    UserActivity.created_at <= end_date,
                    UserActivity.activity_type.like('%collaboration%')
                )
            ).count()
            
            group_activity.append({
                'group_id': str(group.id),
                'group_name': group.name,
                'member_count': len(group.members),
                'activity_count': activity_count,
                'activity_per_member': activity_count / max(len(group.members), 1)
            })
        
        return sorted(group_activity, key=lambda x: x['activity_count'], reverse=True)[:5]
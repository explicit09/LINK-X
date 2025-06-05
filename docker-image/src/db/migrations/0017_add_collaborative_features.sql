-- Migration: Add Collaborative Learning Features
-- Description: Add tables for study groups, shared annotations, discussions, and collaborative notes

-- Study Groups Table
CREATE TABLE study_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    course_id UUID NOT NULL REFERENCES Course(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT TRUE,
    max_members INTEGER DEFAULT 10,
    invite_code VARCHAR(32) UNIQUE,
    study_schedule JSONB, -- JSON structure for meeting times
    collaboration_settings JSONB DEFAULT '{"allow_annotations": true, "allow_discussions": true, "allow_notes": true}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Study Group Members
CREATE TABLE study_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'moderator', 'member'
    collaboration_preferences JSONB DEFAULT '{"share_annotations": true, "share_notes": true, "show_progress": true}'::jsonb,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Shared Annotations (highlights, comments on course materials)
CREATE TABLE shared_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES File(id) ON DELETE CASCADE,
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE, -- NULL for individual annotations
    created_by UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    annotation_type VARCHAR(20) DEFAULT 'highlight', -- 'highlight', 'comment', 'question', 'note'
    content TEXT NOT NULL,
    position_data JSONB NOT NULL, -- Page number, coordinates, text selection info
    color VARCHAR(7) DEFAULT '#ffff00', -- Hex color for highlights
    is_public BOOLEAN DEFAULT FALSE, -- Whether visible to all course members
    is_resolved BOOLEAN DEFAULT FALSE, -- For questions/discussions
    metadata JSONB, -- Additional annotation data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Peer Discussion Threads (tied to content sections or annotations)
CREATE TABLE peer_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    file_id UUID REFERENCES File(id) ON DELETE CASCADE,
    annotation_id UUID REFERENCES shared_annotations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES Course(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    discussion_type VARCHAR(20) DEFAULT 'question', -- 'question', 'discussion', 'study_note', 'clarification'
    is_pinned BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    tags JSONB, -- Discussion tags for categorization
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discussion Replies
CREATE TABLE discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES peer_discussions(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    is_solution BOOLEAN DEFAULT FALSE, -- Mark as solution to question
    upvotes INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collaborative Notes (real-time shared note-taking)
CREATE TABLE collaborative_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL, -- Rich text content with operational transforms
    file_id UUID REFERENCES File(id) ON DELETE CASCADE,
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES Course(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    last_edited_by UUID REFERENCES "User"(id),
    is_template BOOLEAN DEFAULT FALSE,
    collaboration_mode VARCHAR(20) DEFAULT 'open', -- 'open', 'locked', 'review'
    version INTEGER DEFAULT 1,
    edit_history JSONB DEFAULT '[]'::jsonb,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note Edit Operations (for real-time collaborative editing)
CREATE TABLE note_edit_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES collaborative_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    operation_type VARCHAR(20) NOT NULL, -- 'insert', 'delete', 'retain', 'format'
    operation_data JSONB NOT NULL, -- Operational transform data
    position_index INTEGER NOT NULL,
    version INTEGER NOT NULL,
    timestamp_ms BIGINT NOT NULL, -- Millisecond timestamp for ordering
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time Study Sessions
CREATE TABLE collaborative_study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    session_name VARCHAR(255) NOT NULL,
    description TEXT,
    file_id UUID REFERENCES File(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    session_type VARCHAR(20) DEFAULT 'study', -- 'study', 'review', 'project', 'discussion'
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    max_participants INTEGER DEFAULT 10,
    session_status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
    whiteboard_data JSONB, -- Shared whiteboard content
    session_notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Study Session Participants
CREATE TABLE study_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaborative_study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'participant', -- 'host', 'moderator', 'participant'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    participation_score NUMERIC(3,2), -- 0.0 to 1.0 engagement score
    contribution_data JSONB, -- Chat messages, notes shared, etc.
    UNIQUE(session_id, user_id)
);

-- User Collaboration Preferences
CREATE TABLE user_collaboration_preferences (
    user_id UUID PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
    allow_public_annotations BOOLEAN DEFAULT FALSE,
    allow_study_group_invites BOOLEAN DEFAULT TRUE,
    allow_peer_discussions BOOLEAN DEFAULT TRUE,
    default_annotation_privacy VARCHAR(20) DEFAULT 'private', -- 'private', 'group', 'public'
    notification_preferences JSONB DEFAULT '{"group_invites": true, "annotation_replies": true, "discussion_mentions": true}'::jsonb,
    collaboration_level VARCHAR(20) DEFAULT 'selective', -- 'minimal', 'selective', 'active', 'collaborative'
    timezone VARCHAR(50) DEFAULT 'UTC',
    study_availability JSONB, -- Available hours for study sessions
    privacy_settings JSONB DEFAULT '{"show_online_status": false, "show_study_progress": false}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Annotation Reactions (likes, helpful, etc.)
CREATE TABLE annotation_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES shared_annotations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL, -- 'helpful', 'like', 'important', 'question'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(annotation_id, user_id, reaction_type)
);

-- Discussion Votes (upvotes/downvotes for discussions and replies)
CREATE TABLE discussion_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID REFERENCES peer_discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, discussion_id, reply_id)
);

-- Indexes for performance
CREATE INDEX idx_study_groups_course_id ON study_groups(course_id);
CREATE INDEX idx_study_groups_created_by ON study_groups(created_by);
CREATE INDEX idx_study_groups_invite_code ON study_groups(invite_code);

CREATE INDEX idx_study_group_members_group_id ON study_group_members(group_id);
CREATE INDEX idx_study_group_members_user_id ON study_group_members(user_id);

CREATE INDEX idx_shared_annotations_file_id ON shared_annotations(file_id);
CREATE INDEX idx_shared_annotations_group_id ON shared_annotations(group_id);
CREATE INDEX idx_shared_annotations_created_by ON shared_annotations(created_by);
CREATE INDEX idx_shared_annotations_type ON shared_annotations(annotation_type);
CREATE INDEX idx_shared_annotations_public ON shared_annotations(is_public) WHERE is_public = true;

CREATE INDEX idx_peer_discussions_file_id ON peer_discussions(file_id);
CREATE INDEX idx_peer_discussions_group_id ON peer_discussions(group_id);
CREATE INDEX idx_peer_discussions_course_id ON peer_discussions(course_id);
CREATE INDEX idx_peer_discussions_created_by ON peer_discussions(created_by);
CREATE INDEX idx_peer_discussions_type ON peer_discussions(discussion_type);

CREATE INDEX idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX idx_discussion_replies_parent_id ON discussion_replies(parent_reply_id);
CREATE INDEX idx_discussion_replies_created_by ON discussion_replies(created_by);

CREATE INDEX idx_collaborative_notes_file_id ON collaborative_notes(file_id);
CREATE INDEX idx_collaborative_notes_group_id ON collaborative_notes(group_id);
CREATE INDEX idx_collaborative_notes_course_id ON collaborative_notes(course_id);
CREATE INDEX idx_collaborative_notes_created_by ON collaborative_notes(created_by);

CREATE INDEX idx_note_operations_note_id ON note_edit_operations(note_id);
CREATE INDEX idx_note_operations_version ON note_edit_operations(note_id, version);
CREATE INDEX idx_note_operations_timestamp ON note_edit_operations(timestamp_ms);

CREATE INDEX idx_study_sessions_group_id ON collaborative_study_sessions(group_id);
CREATE INDEX idx_study_sessions_file_id ON collaborative_study_sessions(file_id);
CREATE INDEX idx_study_sessions_status ON collaborative_study_sessions(session_status);
CREATE INDEX idx_study_sessions_scheduled ON collaborative_study_sessions(scheduled_start);

CREATE INDEX idx_session_participants_session_id ON study_session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON study_session_participants(user_id);

CREATE INDEX idx_annotation_reactions_annotation_id ON annotation_reactions(annotation_id);
CREATE INDEX idx_annotation_reactions_user_id ON annotation_reactions(user_id);

CREATE INDEX idx_discussion_votes_discussion_id ON discussion_votes(discussion_id);
CREATE INDEX idx_discussion_votes_reply_id ON discussion_votes(reply_id);
CREATE INDEX idx_discussion_votes_user_id ON discussion_votes(user_id);

-- Add collaboration-related columns to existing tables
ALTER TABLE "User" ADD COLUMN collaboration_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE Course ADD COLUMN allow_collaboration BOOLEAN DEFAULT TRUE;
ALTER TABLE Course ADD COLUMN collaboration_settings JSONB DEFAULT '{"allow_study_groups": true, "allow_public_annotations": false, "max_group_size": 10}'::jsonb;

-- Comments
COMMENT ON TABLE study_groups IS 'Study groups within courses for collaborative learning';
COMMENT ON TABLE study_group_members IS 'Members of study groups with roles and preferences';
COMMENT ON TABLE shared_annotations IS 'Shared highlights, comments, and notes on course materials';
COMMENT ON TABLE peer_discussions IS 'Discussion threads tied to content or study groups';
COMMENT ON TABLE discussion_replies IS 'Replies to peer discussions with voting support';
COMMENT ON TABLE collaborative_notes IS 'Shared note-taking with real-time collaboration';
COMMENT ON TABLE note_edit_operations IS 'Operational transforms for real-time note editing';
COMMENT ON TABLE collaborative_study_sessions IS 'Real-time study sessions for groups';
COMMENT ON TABLE study_session_participants IS 'Participants in collaborative study sessions';
COMMENT ON TABLE user_collaboration_preferences IS 'User preferences for collaborative features';
COMMENT ON TABLE annotation_reactions IS 'Reactions to annotations (helpful, like, etc.)';
COMMENT ON TABLE discussion_votes IS 'Voting system for discussions and replies';
/**
 * API client for collaborative learning features
 * Handles study groups, annotations, discussions, and collaborative notes
 */

import { apiClient } from './client';

// Types
export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  course_id: string;
  created_by: string;
  is_public: boolean;
  max_members: number;
  invite_code: string;
  study_schedule?: any;
  collaboration_settings: {
    allow_annotations: boolean;
    allow_discussions: boolean;
    allow_notes: boolean;
  };
  created_at: string;
  updated_at: string;
  members?: StudyGroupMember[];
  member_count?: number;
}

export interface StudyGroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  collaboration_preferences: {
    share_annotations: boolean;
    share_notes: boolean;
    show_progress: boolean;
  };
  joined_at: string;
  last_active: string;
}

export interface SharedAnnotation {
  id: string;
  file_id: string;
  group_id?: string;
  created_by: string;
  annotation_type: 'highlight' | 'comment' | 'question' | 'note';
  content: string;
  position_data: {
    page?: number;
    coordinates?: { x: number; y: number; width: number; height: number };
    text_selection?: { start: number; end: number };
  };
  color: string;
  is_public: boolean;
  is_resolved: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PeerDiscussion {
  id: string;
  title: string;
  content: string;
  file_id?: string;
  annotation_id?: string;
  group_id?: string;
  course_id: string;
  created_by: string;
  discussion_type: 'question' | 'discussion' | 'study_note' | 'clarification';
  is_pinned: boolean;
  is_resolved: boolean;
  tags?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  replies?: DiscussionReply[];
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  parent_reply_id?: string;
  content: string;
  created_by: string;
  is_solution: boolean;
  upvotes: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CollaborativeNote {
  id: string;
  title: string;
  content: any; // Rich text content
  file_id?: string;
  group_id?: string;
  course_id: string;
  created_by: string;
  last_edited_by?: string;
  is_template: boolean;
  collaboration_mode: 'open' | 'locked' | 'review';
  version: number;
  edit_history: any[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CollaborationPreferences {
  user_id: string;
  allow_public_annotations: boolean;
  allow_study_group_invites: boolean;
  allow_peer_discussions: boolean;
  default_annotation_privacy: 'private' | 'group' | 'public';
  notification_preferences: {
    group_invites: boolean;
    annotation_replies: boolean;
    discussion_mentions: boolean;
  };
  collaboration_level: 'minimal' | 'selective' | 'active' | 'collaborative';
  timezone: string;
  study_availability?: any;
  privacy_settings: {
    show_online_status: boolean;
    show_study_progress: boolean;
  };
  created_at: string;
  updated_at: string;
}

class CollaborationAPI {
  private baseUrl = '/api/v2/collaboration';

  // Study Groups
  async createStudyGroup(data: {
    course_id: string;
    name: string;
    description?: string;
    is_public?: boolean;
    max_members?: number;
  }): Promise<StudyGroup> {
    return apiClient.post<StudyGroup>(`${this.baseUrl}/study-groups`, data);
  }

  async getStudyGroup(groupId: string): Promise<StudyGroup> {
    return apiClient.get<StudyGroup>(`${this.baseUrl}/study-groups/${groupId}`);
  }

  async getUserStudyGroups(courseId?: string): Promise<StudyGroup[]> {
    const params = courseId ? { course_id: courseId } : {};
    return apiClient.get<StudyGroup[]>(`${this.baseUrl}/study-groups`, { params });
  }

  async getCourseStudyGroups(courseId: string): Promise<StudyGroup[]> {
    return apiClient.get<StudyGroup[]>(`${this.baseUrl}/courses/${courseId}/study-groups`);
  }

  async joinStudyGroup(data: { group_id?: string; invite_code?: string }): Promise<StudyGroupMember> {
    return apiClient.post<StudyGroupMember>(`${this.baseUrl}/study-groups/join`, data);
  }

  async leaveStudyGroup(groupId: string): Promise<void> {
    return apiClient.post(`${this.baseUrl}/study-groups/${groupId}/leave`);
  }

  async updateStudyGroup(groupId: string, data: Partial<StudyGroup>): Promise<StudyGroup> {
    return apiClient.put<StudyGroup>(`${this.baseUrl}/study-groups/${groupId}`, data);
  }

  // Annotations
  async createAnnotation(data: {
    file_id: string;
    annotation_type: string;
    content: string;
    position_data: any;
    group_id?: string;
    color?: string;
    is_public?: boolean;
  }): Promise<SharedAnnotation> {
    return apiClient.post<SharedAnnotation>(`${this.baseUrl}/annotations`, data);
  }

  async getFileAnnotations(fileId: string, groupId?: string): Promise<SharedAnnotation[]> {
    const params = groupId ? { group_id: groupId } : {};
    return apiClient.get<SharedAnnotation[]>(`${this.baseUrl}/files/${fileId}/annotations`, { params });
  }

  async addAnnotationReaction(annotationId: string, reactionType: string): Promise<any> {
    return apiClient.post(`${this.baseUrl}/annotations/${annotationId}/reactions`, {
      reaction_type: reactionType
    });
  }

  // Discussions
  async createDiscussion(data: {
    course_id: string;
    title: string;
    content: string;
    discussion_type?: string;
    file_id?: string;
    annotation_id?: string;
    group_id?: string;
    tags?: string[];
  }): Promise<PeerDiscussion> {
    return apiClient.post<PeerDiscussion>(`${this.baseUrl}/discussions`, data);
  }

  async getCourseDiscussions(courseId: string, params?: {
    type?: string;
    group_id?: string;
  }): Promise<PeerDiscussion[]> {
    return apiClient.get<PeerDiscussion[]>(`${this.baseUrl}/courses/${courseId}/discussions`, { params });
  }

  async addDiscussionReply(discussionId: string, data: {
    content: string;
    parent_reply_id?: string;
  }): Promise<DiscussionReply> {
    return apiClient.post<DiscussionReply>(`${this.baseUrl}/discussions/${discussionId}/replies`, data);
  }

  async voteOnDiscussion(discussionId: string, voteType: 'upvote' | 'downvote'): Promise<any> {
    return apiClient.post(`${this.baseUrl}/discussions/${discussionId}/vote`, {
      vote_type: voteType
    });
  }

  // Collaborative Notes
  async createCollaborativeNote(data: {
    course_id: string;
    title: string;
    content: any;
    file_id?: string;
    group_id?: string;
    is_template?: boolean;
  }): Promise<CollaborativeNote> {
    return apiClient.post<CollaborativeNote>(`${this.baseUrl}/collaborative-notes`, data);
  }

  async getCollaborativeNote(noteId: string): Promise<CollaborativeNote> {
    return apiClient.get<CollaborativeNote>(`${this.baseUrl}/collaborative-notes/${noteId}`);
  }

  async getFileCollaborativeNotes(fileId: string): Promise<CollaborativeNote[]> {
    return apiClient.get<CollaborativeNote[]>(`${this.baseUrl}/files/${fileId}/collaborative-notes`);
  }

  // User Preferences
  async getCollaborationPreferences(): Promise<CollaborationPreferences> {
    return apiClient.get<CollaborationPreferences>(`${this.baseUrl}/preferences`);
  }

  async updateCollaborationPreferences(data: Partial<CollaborationPreferences>): Promise<CollaborationPreferences> {
    return apiClient.put<CollaborationPreferences>(`${this.baseUrl}/preferences`, data);
  }

  async getCollaborationStats(): Promise<any> {
    return apiClient.get(`${this.baseUrl}/stats`);
  }
}

export const collaborationAPI = new CollaborationAPI();
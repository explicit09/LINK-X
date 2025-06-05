/**
 * CollaborationDashboard component
 * Main dashboard for collaborative learning features
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MessageCircle, 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Settings,
  Zap,
  TrendingUp
} from 'lucide-react';
import { StudyGroupCard } from './StudyGroupCard';
import { collaborationAPI, StudyGroup, PeerDiscussion, CollaborativeNote } from '@/lib/api/collaboration';
import { useCollaborationWebSocket } from '@/lib/collaboration/websocket-manager';
import { useToast } from '@/components/ui/use-toast';

interface CollaborationDashboardProps {
  courseId?: string;
  userId: string;
}

export function CollaborationDashboard({ courseId, userId }: CollaborationDashboardProps) {
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [discussions, setDiscussions] = useState<PeerDiscussion[]>([]);
  const [collaborativeNotes, setCollaborativeNotes] = useState<CollaborativeNote[]>([]);
  const [collaborationStats, setCollaborationStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const { socket, isConnected } = useCollaborationWebSocket();
  const { toast } = useToast();

  useEffect(() => {
    loadCollaborationData();
  }, [courseId]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const unsubscribeGroupJoined = socket.addEventListener('user_joined_group', (event) => {
      toast({
        title: 'New Member',
        description: `Someone joined a study group you're in.`,
      });
      loadStudyGroups(); // Refresh study groups
    });

    const unsubscribeNewDiscussion = socket.addEventListener('new_discussion_reply', (event) => {
      toast({
        title: 'New Discussion Reply',
        description: 'Someone replied to a discussion you follow.',
      });
      loadDiscussions(); // Refresh discussions
    });

    return () => {
      unsubscribeGroupJoined();
      unsubscribeNewDiscussion();
    };
  }, [socket]);

  const loadCollaborationData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadStudyGroups(),
        loadDiscussions(),
        loadCollaborativeNotes(),
        loadCollaborationStats()
      ]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load collaboration data. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudyGroups = async () => {
    try {
      const groups = await collaborationAPI.getUserStudyGroups(courseId);
      setStudyGroups(groups);
    } catch (error) {
      console.error('Failed to load study groups:', error);
    }
  };

  const loadDiscussions = async () => {
    try {
      if (courseId) {
        const courseDiscussions = await collaborationAPI.getCourseDiscussions(courseId);
        setDiscussions(courseDiscussions);
      }
    } catch (error) {
      console.error('Failed to load discussions:', error);
    }
  };

  const loadCollaborativeNotes = async () => {
    try {
      // This would need to be implemented in the API
      // For now, set empty array
      setCollaborativeNotes([]);
    } catch (error) {
      console.error('Failed to load collaborative notes:', error);
    }
  };

  const loadCollaborationStats = async () => {
    try {
      const stats = await collaborationAPI.getCollaborationStats();
      setCollaborationStats(stats);
    } catch (error) {
      console.error('Failed to load collaboration stats:', error);
    }
  };

  const handleJoinGroup = (groupId: string) => {
    if (socket) {
      socket.joinStudyGroup(groupId);
    }
    loadStudyGroups();
  };

  const handleLeaveGroup = (groupId: string) => {
    if (socket) {
      socket.leaveStudyGroup(groupId);
    }
    loadStudyGroups();
  };

  const filteredStudyGroups = studyGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDiscussions = discussions.filter(discussion =>
    discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    discussion.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">Loading collaboration features...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collaboration Hub</h1>
          <p className="text-muted-foreground">
            Connect with peers, share insights, and learn together
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Offline'}
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Groups</p>
                <p className="text-2xl font-bold">{collaborationStats.study_groups_count || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Annotations</p>
                <p className="text-2xl font-bold">{collaborationStats.annotations_count || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Discussions</p>
                <p className="text-2xl font-bold">{collaborationStats.discussions_started || 0}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collaboration Score</p>
                <p className="text-2xl font-bold">
                  {Math.round((collaborationStats.study_groups_count || 0) * 10 + 
                            (collaborationStats.annotations_count || 0) * 2 +
                            (collaborationStats.discussions_started || 0) * 5)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups, discussions, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Study Groups</TabsTrigger>
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
          <TabsTrigger value="notes">Collaborative Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Get started with collaborative learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-auto p-4 flex flex-col items-center gap-2">
                  <Plus className="w-6 h-6" />
                  <span>Create Study Group</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <MessageCircle className="w-6 h-6" />
                  <span>Start Discussion</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <FileText className="w-6 h-6" />
                  <span>Create Note</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Study Groups</CardTitle>
              </CardHeader>
              <CardContent>
                {studyGroups.slice(0, 3).map((group) => (
                  <StudyGroupCard
                    key={group.id}
                    studyGroup={group}
                    isJoined={true}
                    onJoin={handleJoinGroup}
                    onLeave={handleLeaveGroup}
                    onUpdate={loadStudyGroups}
                    showActions={false}
                  />
                ))}
                {studyGroups.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No study groups yet. Create one to get started!
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Discussions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {discussions.slice(0, 5).map((discussion) => (
                    <div key={discussion.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{discussion.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {discussion.content}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {discussion.discussion_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                        {discussion.replies && (
                          <span>• {discussion.replies.length} replies</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {discussions.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No discussions yet. Start one to engage with your peers!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Study Groups</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudyGroups.map((group) => (
              <StudyGroupCard
                key={group.id}
                studyGroup={group}
                isJoined={true}
                onJoin={handleJoinGroup}
                onLeave={handleLeaveGroup}
                onUpdate={loadStudyGroups}
              />
            ))}
          </div>
          
          {filteredStudyGroups.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Study Groups Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Create or join a study group to get started with collaborative learning.'}
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Group
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discussions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Course Discussions</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Start Discussion
            </Button>
          </div>
          
          <div className="space-y-4">
            {filteredDiscussions.map((discussion) => (
              <Card key={discussion.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{discussion.title}</h4>
                        <Badge variant="secondary">{discussion.discussion_type}</Badge>
                        {discussion.is_pinned && <Badge variant="outline">Pinned</Badge>}
                        {discussion.is_resolved && <Badge variant="default">Resolved</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {discussion.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                        {discussion.replies && (
                          <span>{discussion.replies.length} replies</span>
                        )}
                        {discussion.tags && discussion.tags.length > 0 && (
                          <div className="flex gap-1">
                            {discussion.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredDiscussions.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Discussions Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Start a discussion to engage with your classmates.'}
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Start Your First Discussion
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Collaborative Notes</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Note
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collaborativeNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">{note.title}</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={note.collaboration_mode === 'open' ? 'default' : 'secondary'}>
                      {note.collaboration_mode}
                    </Badge>
                    {note.is_template && <Badge variant="outline">Template</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last edited {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {collaborativeNotes.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Collaborative Notes Found</h3>
                <p className="text-muted-foreground mb-4">
                  Create collaborative notes to work together on course content.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Note
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
/**
 * StudyGroupCard component
 * Displays study group information with join/leave functionality
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Calendar, MessageCircle, FileText, Settings } from 'lucide-react';
import { StudyGroup } from '@/lib/api/collaboration';
import { collaborationAPI } from '@/lib/api/collaboration';
import { useToast } from '@/components/ui/use-toast';

interface StudyGroupCardProps {
  studyGroup: StudyGroup;
  isJoined?: boolean;
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
  onUpdate?: () => void;
  showActions?: boolean;
}

export function StudyGroupCard({ 
  studyGroup, 
  isJoined = false, 
  onJoin, 
  onLeave, 
  onUpdate,
  showActions = true 
}: StudyGroupCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      await collaborationAPI.joinStudyGroup({ group_id: studyGroup.id });
      onJoin?.(studyGroup.id);
      onUpdate?.();
      toast({
        title: 'Joined Study Group',
        description: `You've successfully joined "${studyGroup.name}"`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join study group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await collaborationAPI.leaveStudyGroup(studyGroup.id);
      onLeave?.(studyGroup.id);
      onUpdate?.();
      toast({
        title: 'Left Study Group',
        description: `You've left "${studyGroup.name}"`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to leave study group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const memberCount = studyGroup.member_count || studyGroup.members?.length || 0;
  const isAtCapacity = memberCount >= studyGroup.max_members;

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{studyGroup.name}</CardTitle>
            <CardDescription className="mt-1">
              {studyGroup.description || 'No description provided'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {studyGroup.is_public ? (
              <Badge variant="secondary">Public</Badge>
            ) : (
              <Badge variant="outline">Private</Badge>
            )}
            {isAtCapacity && <Badge variant="destructive">Full</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Member Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{memberCount}/{studyGroup.max_members} members</span>
        </div>

        {/* Members Avatars */}
        {studyGroup.members && studyGroup.members.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Members:</span>
            <div className="flex -space-x-2">
              {studyGroup.members.slice(0, 5).map((member, index) => (
                <Avatar key={member.id} className="w-6 h-6 border-2 border-background">
                  <AvatarFallback className="text-xs">
                    {member.user_id.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {studyGroup.members.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    +{studyGroup.members.length - 5}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collaboration Features */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {studyGroup.collaboration_settings.allow_annotations && (
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>Annotations</span>
            </div>
          )}
          {studyGroup.collaboration_settings.allow_discussions && (
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>Discussions</span>
            </div>
          )}
          {studyGroup.collaboration_settings.allow_notes && (
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>Notes</span>
            </div>
          )}
        </div>

        {/* Study Schedule */}
        {studyGroup.study_schedule && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Regular study sessions scheduled</span>
          </div>
        )}

        {/* Invite Code */}
        {isJoined && studyGroup.invite_code && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Invite Code</p>
                <p className="text-sm text-muted-foreground">Share this with others to invite them</p>
              </div>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                {studyGroup.invite_code}
              </code>
            </div>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="flex gap-2">
          {isJoined ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleLeave}
                disabled={isLoading}
                className="flex-1"
              >
                Leave Group
              </Button>
              <Button variant="default" className="flex-1">
                <MessageCircle className="w-4 h-4 mr-2" />
                Open Chat
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleJoin}
              disabled={isLoading || isAtCapacity}
              className="flex-1"
            >
              {isLoading ? 'Joining...' : isAtCapacity ? 'Group Full' : 'Join Group'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, Plus, Pin, ThumbsUp, Reply, MoreHorizontal,
  Lock, Users, Calendar, Search, Filter, Bookmark
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DiscussionPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: 'student' | 'instructor' | 'ta';
  };
  createdAt: string;
  updatedAt?: string;
  pinned: boolean;
  locked: boolean;
  replies: DiscussionReply[];
  likes: number;
  userHasLiked: boolean;
  tags: string[];
  graded: boolean;
  points?: number;
}

interface DiscussionReply {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: 'student' | 'instructor' | 'ta';
  };
  createdAt: string;
  likes: number;
  userHasLiked: boolean;
  parentId?: string; // For nested replies
}

interface CanvasDiscussionsProps {
  courseId: string;
  isOwner: boolean;
  userRole: 'student' | 'instructor' | 'admin';
  className?: string;
}

export function CanvasDiscussions({ courseId, isOwner, userRole, className }: CanvasDiscussionsProps) {
  const [discussions, setDiscussions] = useState<DiscussionPost[]>([
    {
      id: '1',
      title: 'Welcome to the Course! Introduce Yourself',
      content: 'Please introduce yourself to the class! Share your background, interests, and what you hope to learn from this course.',
      author: {
        id: 'prof1',
        name: 'Professor Smith',
        role: 'instructor',
      },
      createdAt: '2024-11-01T09:00:00',
      pinned: true,
      locked: false,
      replies: [
        {
          id: 'r1',
          content: 'Hi everyone! I\'m excited to be here. I have a background in computer science and I\'m particularly interested in machine learning applications.',
          author: {
            id: 'student1',
            name: 'Alice Johnson',
            role: 'student',
          },
          createdAt: '2024-11-01T14:30:00',
          likes: 3,
          userHasLiked: false,
        },
        {
          id: 'r2',
          content: 'Welcome Alice! Great to have you in the class. Looking forward to your contributions!',
          author: {
            id: 'prof1',
            name: 'Professor Smith',
            role: 'instructor',
          },
          createdAt: '2024-11-01T15:00:00',
          likes: 1,
          userHasLiked: true,
        },
      ],
      likes: 12,
      userHasLiked: true,
      tags: ['introduction', 'welcome'],
      graded: false,
    },
    {
      id: '2',
      title: 'Discussion: Ethics in AI Development',
      content: 'What are the most important ethical considerations when developing AI systems? Please provide specific examples and discuss potential solutions.',
      author: {
        id: 'prof1',
        name: 'Professor Smith',
        role: 'instructor',
      },
      createdAt: '2024-12-01T10:00:00',
      pinned: false,
      locked: false,
      replies: [
        {
          id: 'r3',
          content: 'I think bias in training data is one of the biggest issues. For example, facial recognition systems that work poorly for certain ethnic groups.',
          author: {
            id: 'student2',
            name: 'Bob Chen',
            role: 'student',
          },
          createdAt: '2024-12-01T11:15:00',
          likes: 8,
          userHasLiked: true,
        },
        {
          id: 'r4',
          content: 'Great point Bob! This ties into the broader issue of representation in datasets. How might we address this systematically?',
          author: {
            id: 'ta1',
            name: 'Sarah Kim (TA)',
            role: 'ta',
          },
          createdAt: '2024-12-01T12:00:00',
          likes: 5,
          userHasLiked: false,
        },
      ],
      likes: 15,
      userHasLiked: false,
      tags: ['ethics', 'ai', 'discussion'],
      graded: true,
      points: 10,
    },
    {
      id: '3',
      title: 'Q&A: Assignment 2 Clarifications',
      content: 'Post your questions about Assignment 2 here. I\'ll be monitoring this thread regularly.',
      author: {
        id: 'ta1',
        name: 'Sarah Kim (TA)',
        role: 'ta',
      },
      createdAt: '2024-12-05T09:00:00',
      pinned: false,
      locked: false,
      replies: [
        {
          id: 'r5',
          content: 'For the neural network implementation, should we use TensorFlow or PyTorch?',
          author: {
            id: 'student3',
            name: 'Charlie Davis',
            role: 'student',
          },
          createdAt: '2024-12-05T10:30:00',
          likes: 2,
          userHasLiked: false,
        },
        {
          id: 'r6',
          content: 'Either framework is fine! Choose the one you\'re more comfortable with. Both will work for the assignment requirements.',
          author: {
            id: 'ta1',
            name: 'Sarah Kim (TA)',
            role: 'ta',
          },
          createdAt: '2024-12-05T11:00:00',
          likes: 4,
          userHasLiked: true,
        },
      ],
      likes: 8,
      userHasLiked: false,
      tags: ['assignment', 'q&a', 'clarification'],
      graded: false,
    },
  ]);

  const [selectedDiscussion, setSelectedDiscussion] = useState<DiscussionPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ta': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'student': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'instructor': return 'Instructor';
      case 'ta': return 'TA';
      case 'student': return 'Student';
      default: return 'Student';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredDiscussions = discussions.filter(discussion => {
    const matchesSearch = discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         discussion.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterTag === 'all' || discussion.tags.includes(filterTag);
    return matchesSearch && matchesFilter;
  });

  const allTags = Array.from(new Set(discussions.flatMap(d => d.tags)));

  if (selectedDiscussion) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Back to discussions */}
        <Button variant="ghost" onClick={() => setSelectedDiscussion(null)}>
          ← Back to Discussions
        </Button>

        {/* Discussion Thread */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {selectedDiscussion.pinned && (
                    <Pin className="w-4 h-4 text-orange-600" />
                  )}
                  {selectedDiscussion.locked && (
                    <Lock className="w-4 h-4 text-red-600" />
                  )}
                  {selectedDiscussion.graded && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedDiscussion.points} pts
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{selectedDiscussion.title}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(selectedDiscussion.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedDiscussion.author.name}</span>
                    <Badge className={cn("text-xs border", getRoleColor(selectedDiscussion.author.role))}>
                      {getRoleBadge(selectedDiscussion.author.role)}
                    </Badge>
                  </div>
                  <span>{formatDistanceToNow(new Date(selectedDiscussion.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{selectedDiscussion.content}</p>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                className={selectedDiscussion.userHasLiked ? "text-blue-600" : ""}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                {selectedDiscussion.likes}
              </Button>
              <Button variant="ghost" size="sm">
                <Reply className="w-4 h-4 mr-1" />
                Reply
              </Button>
              <Button variant="ghost" size="sm">
                <Bookmark className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-4">
          {selectedDiscussion.replies.map((reply) => (
            <Card key={reply.id} className="ml-6">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-sm">
                        {getInitials(reply.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{reply.author.name}</span>
                        <Badge className={cn("text-xs border", getRoleColor(reply.author.role))}>
                          {getRoleBadge(reply.author.role)}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-gray-700 mb-3">{reply.content}</p>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={reply.userHasLiked ? "text-blue-600" : ""}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    {reply.likes}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Reply className="w-4 h-4 mr-1" />
                    Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply Form */}
        {!selectedDiscussion.locked && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-sm">YU</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <textarea
                    placeholder="Write your reply..."
                    className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button>Post Reply</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Discussions</h2>
        {isOwner && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Discussion
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Topics</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {/* Discussion Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{discussions.length}</div>
            <div className="text-sm text-gray-600">Total Discussions</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {discussions.reduce((sum, d) => sum + d.replies.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Replies</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Pin className="w-8 h-8 mx-auto text-orange-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {discussions.filter(d => d.pinned).length}
            </div>
            <div className="text-sm text-gray-600">Pinned Topics</div>
          </CardContent>
        </Card>
      </div>

      {/* Discussion List */}
      <div className="space-y-4">
        {filteredDiscussions.map((discussion) => (
          <Card 
            key={discussion.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedDiscussion(discussion)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.pinned && (
                      <Pin className="w-4 h-4 text-orange-600" />
                    )}
                    {discussion.locked && (
                      <Lock className="w-4 h-4 text-red-600" />
                    )}
                    {discussion.graded && (
                      <Badge variant="secondary" className="text-xs">
                        {discussion.points} pts
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      {discussion.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {discussion.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {discussion.content}
                  </p>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(discussion.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{discussion.author.name}</span>
                      <Badge className={cn("text-xs border", getRoleColor(discussion.author.role))}>
                        {getRoleBadge(discussion.author.role)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{discussion.replies.length} replies</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{discussion.likes} likes</span>
                    </div>
                    
                    <span>{formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                
                {isOwner && (
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredDiscussions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No discussions found' : 'No discussions yet'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {searchQuery 
                ? 'Try adjusting your search terms or browse all discussions.'
                : isOwner 
                  ? 'Create your first discussion to engage with students and facilitate learning.'
                  : 'No discussions have been started yet. Check back later for course discussions.'}
            </p>
            {isOwner && !searchQuery && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Start First Discussion
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
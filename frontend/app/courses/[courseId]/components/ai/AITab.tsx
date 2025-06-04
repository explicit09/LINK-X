'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, MessageSquare, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useCourseContext } from '../../context/CourseContext';
import { getCourseColor } from '../../utils/courseHelpers';

interface AITabProps {
  courseId: string;
  courseName: string;
}

export default function AITab({ courseId, courseName }: AITabProps) {
  const { state } = useCourseContext();
  const { conversations } = state;
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);

  const colors = getCourseColor(courseId);

  const handleStartAIChat = () => {
    try {
      if (!state.currentUser) {
        toast.error('Please log in to use AI tutor');
        return;
      }

      setSelectedConversation(null);
      setAiChatOpen(true);
    } catch (error) {
      console.error('Error starting AI chat:', error);
      toast.error('Failed to start AI chat');
    }
  };

  const handleOpenConversation = (conversationId: string) => {
    try {
      if (!conversationId) {
        toast.error('Invalid conversation selected');
        return;
      }

      if (!state.currentUser) {
        toast.error('Please log in to view conversations');
        return;
      }

      setSelectedConversation(conversationId);
      setAiChatOpen(true);
    } catch (error) {
      console.error('Error opening conversation:', error);
      toast.error('Failed to open conversation');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-2 h-8 rounded-full bg-gradient-to-b',
              colors.gradient,
            )}
          />
          <h2 className="text-2xl font-semibold text-gray-900">AI Tutor</h2>
        </div>
        <Button
          onClick={handleStartAIChat}
          className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white shadow-sm hover:shadow-md transition-all duration-200"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {aiChatOpen ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    {selectedConversation
                      ? conversations.find((c) => c.id === selectedConversation)
                          ?.title || 'AI Tutor Chat'
                      : 'New AI Conversation'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAiChatOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                      <p className="text-sm">
                        Hello! I'm your AI tutor for {courseName}. How can I
                        help you today?
                      </p>
                    </div>
                  </div>

                  {selectedConversation && (
                    <>
                      <div className="flex justify-end">
                        <div className="bg-blue-600 text-white rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">
                            Can you explain the key concepts from today's
                            reading?
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                          <p className="text-sm">
                            Of course! The main concepts covered in today's
                            reading include...
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask me anything about the course materials..."
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          toast.success('Message sent to AI tutor!');
                        }
                      }}
                    />
                    <Button>Send</Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Tip: Ask about specific materials, request explanations,
                    or get practice problems
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-96">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Start a conversation with your AI tutor
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Ask questions about course materials, get explanations, or
                    request practice problems.
                  </p>
                  <div className="space-y-2">
                    <Button onClick={handleStartAIChat}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Start Chatting
                    </Button>
                    <p className="text-xs text-gray-400">
                      💡 Tip: Highlight any text on this page and ask AI about
                      it!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border"
                    onClick={() => handleOpenConversation(conversation.id)}
                  >
                    <p className="text-sm font-medium line-clamp-1">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {conversation.lastMessage}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {conversation.messageCount} messages •{' '}
                      {conversation.timestamp}
                    </p>
                  </div>
                ))}

                {conversations.length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 mb-4">
                      No conversations yet
                    </p>
                    <Button size="sm" onClick={handleStartAIChat}>
                      Start Your First Chat
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Zap className="h-5 w-5" />
                AI Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm text-purple-700">
                <p>💡 Ask specific questions about course materials</p>
                <p>📝 Request practice problems and explanations</p>
                <p>🎯 Get personalized study recommendations</p>
                <p>✨ Upload materials and chat about them instantly</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

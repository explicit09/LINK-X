"use client";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  MessageSquare, 
  FileText, 
  Lightbulb, 
  HelpCircle,
  CheckCircle,
  BookOpen,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from 'sonner';

interface LessonContentProps {
  title: string | null;
  content: string | null;
  isLoading: boolean;
}

const LessonContent = ({
  title,
  content,
  isLoading
}: LessonContentProps) => {

  const handleAIAction = (action: string, actionText: string) => {
    sonnerToast.success(`AI ${action} requested!`, {
      description: `Processing "${actionText}" for this lesson...`
    });
    // The FloatingAIAssistant will handle the actual AI interaction
  };

  const aiActions = [
    {
      id: "explain",
      text: "Explain Concepts",
      icon: Lightbulb,
      action: () => handleAIAction("explain", "key concepts explanation"),
      color: "from-yellow-500 to-amber-500"
    },
    {
      id: "quiz",
      text: "Generate Quiz",
      icon: MessageSquare,
      action: () => handleAIAction("quiz", "practice quiz generation"),
      color: "from-blue-500 to-indigo-500"
    },
    {
      id: "summary",
      text: "Summarize",
      icon: FileText,
      action: () => handleAIAction("summary", "lesson summary"),
      color: "from-green-500 to-emerald-500"
    },
    {
      id: "help",
      text: "Get Help",
      icon: HelpCircle,
      action: () => handleAIAction("help", "personalized help"),
      color: "from-purple-500 to-violet-500"
    }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-blue-foreground text-center text-xl font-semibold font-sans">
          Loading AI response...
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Personalizing content based on your learning profile
        </p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-blue-foreground text-center text-xl font-semibold font-sans mb-2">
          Select a lesson to begin
        </p>
        <p className="text-gray-500 text-center max-w-md">
          Choose a topic from the sidebar to start your personalized learning journey. 
          Each lesson is tailored to your learning style and preferences.
        </p>
        <div className="flex items-center gap-2 mt-4 text-sm text-purple-600">
          <Sparkles className="h-4 w-4" />
          <span>AI-powered personalized content</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lesson Header with AI Actions */}
      {title && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl text-blue-700">
                  <BookOpen className="h-6 w-6" />
                  {title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Personalized Content
                  </Badge>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    AI Enhanced
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {aiActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={action.action}
                    className={cn(
                      "flex flex-col h-auto py-3 px-2 hover:shadow-md transition-all duration-200",
                      "border-gray-200 hover:border-transparent",
                      `hover:bg-gradient-to-r hover:${action.color} hover:text-white`
                    )}
                  >
                    <IconComponent className="h-4 w-4 mb-1" />
                    <span className="text-xs font-medium">{action.text}</span>
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              💡 Tip: Highlight any text in the lesson for instant AI explanations
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lesson Content */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="prose prose-lg max-w-none dark:prose-invert markdown-content">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* AI Learning Assistance Footer */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-800">Need more help with this lesson?</p>
                <p className="text-sm text-gray-600">Ask your AI tutor for personalized explanations</p>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => handleAIAction("chat", "lesson discussion")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with AI
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LessonContent;

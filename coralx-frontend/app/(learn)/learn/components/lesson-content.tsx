"use client";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  MessageSquare, 
  FileText, 
  Lightbulb, 
  HelpCircle,
  CheckCircle,
  BookOpen,
  Sparkles,
  Clock,
  Target,
  TrendingUp,
  Award,
  Zap,
  Star,
  PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from 'sonner';

interface LessonContentProps {
  title: string | null;
  content: string | null;
  isLoading: boolean;
  progressPercentage?: number;
  studyTime?: number;
}

const LessonContent = ({
  title,
  content,
  isLoading,
  progressPercentage = 0,
  studyTime = 0
}: LessonContentProps) => {

  const handleAIAction = (action: string, actionText: string) => {
    sonnerToast.success(`AI ${action} requested!`, {
      description: `Processing "${actionText}" for this lesson...`
    });
  };

  const aiActions = [
    {
      id: "explain",
      text: "Explain Concepts",
      icon: Lightbulb,
      color: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
      action: () => handleAIAction("explanation", "key concepts explanation")
    },
    {
      id: "quiz",
      text: "Generate Quiz",
      icon: MessageSquare,
      color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
      action: () => handleAIAction("quiz", "practice quiz generation")
    },
    {
      id: "summary",
      text: "Summarize",
      icon: FileText,
      color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
      action: () => handleAIAction("summary", "lesson summary")
    },
    {
      id: "help",
      text: "Get Help",
      icon: HelpCircle,
      color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
      action: () => handleAIAction("help", "personalized help")
    }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
        </div>
        <div className="text-center max-w-md">
          <h3 className="canvas-heading-3 mb-3">
            AI is crafting your personalized lesson
          </h3>
          <p className="canvas-body text-gray-600 mb-6">
            Analyzing your learning profile and adapting content to your preferred style...
          </p>
          <div className="flex items-center justify-center space-x-3">
            <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
              <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
              <span className="canvas-small font-medium text-purple-700">Powered by AI</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="canvas-card bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <CardContent className="p-8 text-center">
          <div className="mb-8">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h2 className="canvas-heading-2 mb-4">
            Ready to start learning?
          </h2>
          
          <p className="canvas-body text-gray-600 mb-8 max-w-md mx-auto">
            Choose a topic from the sidebar to begin your personalized learning journey.
          </p>

          {/* Learning Stats Preview */}
          {(progressPercentage > 0 || studyTime > 0) && (
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
              <div className="canvas-card bg-green-50 border-green-200 p-4">
                <Target className="h-5 w-5 text-green-600 mx-auto mb-2" />
                <div className="canvas-small text-green-600">Progress</div>
                <div className="canvas-heading-3 text-green-700">{Math.round(progressPercentage)}%</div>
              </div>
              <div className="canvas-card bg-blue-50 border-blue-200 p-4">
                <Clock className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                <div className="canvas-small text-blue-600">Study Time</div>
                <div className="canvas-heading-3 text-blue-700">{studyTime}m</div>
              </div>
              <div className="canvas-card bg-purple-50 border-purple-200 p-4">
                <Award className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                <div className="canvas-small text-purple-600">AI Enhanced</div>
                <div className="canvas-heading-3 text-purple-700">✨</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2 text-purple-600">
            <Sparkles className="h-5 w-5" />
            <span className="canvas-body font-medium">AI-powered personalized content</span>
          </div>
        </CardContent>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      {progressPercentage > 0 && (
        <Card className="canvas-card bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200 modern-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <span className="canvas-heading-3 text-emerald-700">Learning Progress</span>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                {Math.round(progressPercentage)}% Complete
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-3 mb-3" />
            <div className="flex items-center justify-between">
              <span className="canvas-small text-emerald-600">Keep going! You're making excellent progress</span>
              <div className="flex items-center space-x-4 canvas-small text-emerald-600">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {studyTime}m studied
                </span>
                <span className="flex items-center">
                  <Zap className="h-3 w-3 mr-1" />
                  AI Enhanced
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson Header with AI Actions */}
      {title && (
        <Card className="canvas-card border-l-4 border-l-blue-500 modern-hover">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-3 canvas-heading-2 text-blue-700 mb-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  {title}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Personalized
                  </Badge>
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    AI Enhanced
                  </Badge>
                  <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                    <Star className="h-3 w-3 mr-1" />
                    Interactive
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {aiActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={action.action}
                    className={cn(
                      "flex flex-col h-auto py-4 px-4 transition-all duration-200 modern-hover",
                      action.color
                    )}
                  >
                    <IconComponent className="h-5 w-5 mb-2" />
                    <span className="text-xs font-medium">{action.text}</span>
                  </Button>
                );
              })}
            </div>
            
            <div className="canvas-card bg-amber-50 border border-amber-200 p-4">
              <p className="canvas-small text-amber-800 text-center flex items-center justify-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                💡 Tip: Highlight any text for instant AI explanations and deeper insights
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson Content */}
      <Card className="canvas-card shadow-lg modern-hover">
        <CardContent className="p-8">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <ReactMarkdown 
              components={{
                h1: ({children}) => (
                  <h1 className="canvas-heading-1 text-gray-900 mb-6 border-b border-gray-200 pb-4">
                    {children}
                  </h1>
                ),
                h2: ({children}) => (
                  <h2 className="canvas-heading-2 text-gray-800 mb-4 mt-8">
                    {children}
                  </h2>
                ),
                h3: ({children}) => (
                  <h3 className="canvas-heading-3 text-gray-700 mb-3 mt-6">
                    {children}
                  </h3>
                ),
                p: ({children}) => (
                  <p className="canvas-body text-gray-700 leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({children}) => (
                  <ul className="space-y-2 mb-4 ml-6">
                    {children}
                  </ul>
                ),
                li: ({children}) => (
                  <li className="canvas-body text-gray-700 relative">
                    <span className="absolute -left-6 top-2 h-1.5 w-1.5 bg-blue-500 rounded-full"></span>
                    {children}
                  </li>
                ),
                strong: ({children}) => (
                  <strong className="font-semibold text-gray-900">
                    {children}
                  </strong>
                ),
                em: ({children}) => (
                  <em className="italic text-gray-800">
                    {children}
                  </em>
                ),
                code: ({children}) => (
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800 border">
                    {children}
                  </code>
                ),
                pre: ({children}) => (
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200 my-4">
                    {children}
                  </pre>
                ),
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-blue-500 pl-6 italic text-gray-600 bg-blue-50 py-4 my-4 rounded-r-lg">
                    {children}
                  </blockquote>
                )
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* AI Learning Assistance Footer */}
      <Card className="canvas-card bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 modern-hover">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="canvas-heading-3 text-gray-900">Need more help with this lesson?</p>
                <p className="canvas-body text-gray-600">Your AI tutor is ready to provide personalized explanations and answer questions</p>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg modern-hover"
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

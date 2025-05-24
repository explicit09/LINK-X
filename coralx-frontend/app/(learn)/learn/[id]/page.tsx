"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  ArrowLeft,
  Menu,
  MessageSquare,
  Brain,
  Award,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  Video,
  HelpCircle,
  Edit3,
  Zap,
  CheckCircle2,
  Circle,
  Timer,
  Flame,
  Star
} from "lucide-react";

interface Subsection {
  title: string;
  fullText: string;
  type: 'text' | 'video' | 'quiz';
  completed: boolean;
  timeToComplete: number;
  lastVisited?: string;
  score?: number;
}

interface Chapter {
  chapterTitle: string;
  subsections: Subsection[];
  progress: number;
}

export default function LearnPage() {
  const params = useParams();
  const pfId = typeof params?.id === "string" ? params.id : null;

  // Core state
  const [courseName, setCourseName] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);
  const [currentContent, setCurrentContent] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string}>>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Progress state
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [studyTime, setStudyTime] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(3);
  const [recommendedLesson, setRecommendedLesson] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);

  // Study time tracking
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setStudyTime(Math.floor((Date.now() - startTime) / 1000 / 60) + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Auto-hide sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch course data
  useEffect(() => {
    if (!pfId) return;
  
    const fetchCourseData = async () => {
      try {
        const res = await fetch(`http://localhost:8080/student/personalized-files/${pfId}`, {
          credentials: "include",
        });
  
        if (!res.ok) {
          throw new Error(`Failed to fetch personalized file`);
        }
  
        const data = await res.json();
  
        if (data.content) {
          const parsedContent = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
          
          if (parsedContent.courseName || parsedContent.title) {
            setCourseName(parsedContent.courseName || parsedContent.title || "Course Materials");
          }
          
          if (parsedContent.chapters) {
            const formattedChapters: Chapter[] = parsedContent.chapters.map((ch: any, index: number) => ({
              chapterTitle: ch.chapterTitle,
              subsections: ch.subsections.map((sub: any, subIndex: number) => ({
                title: sub.title,
                fullText: sub.fullText,
                type: subIndex % 3 === 0 ? 'video' : subIndex % 3 === 1 ? 'quiz' : 'text',
                completed: Math.random() > 0.7,
                timeToComplete: Math.floor(Math.random() * 15) + 5,
                lastVisited: Math.random() > 0.5 ? `${Math.floor(Math.random() * 7)} days ago` : undefined,
                score: Math.random() > 0.6 ? Math.floor(Math.random() * 30) + 70 : undefined
              })),
              progress: Math.floor(Math.random() * 100)
            }));
            
            setChapters(formattedChapters);
            
            const total = formattedChapters.reduce((acc, chapter) => acc + chapter.subsections.length, 0);
            const completed = formattedChapters.reduce((acc, chapter) => 
              acc + chapter.subsections.filter(sub => sub.completed).length, 0);
            
            setTotalLessons(total);
            setCompletedLessons(completed);

            // Find recommended lesson (first incomplete)
            for (let i = 0; i < formattedChapters.length; i++) {
              for (let j = 0; j < formattedChapters[i].subsections.length; j++) {
                if (!formattedChapters[i].subsections[j].completed) {
                  setRecommendedLesson({ moduleIndex: i, lessonIndex: j });
                  setCurrentModuleIndex(i);
                  return;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching course data:", err);
      }
    };
  
    fetchCourseData();
  }, [pfId]);

  const handleModuleClick = (moduleIndex: number) => {
    if (currentModuleIndex === moduleIndex) {
      setCurrentModuleIndex(null);
      setSelectedLesson(null);
      setCurrentContent(null);
    } else {
      setCurrentModuleIndex(moduleIndex);
      setSelectedLesson(null);
      setCurrentContent(null);
    }
  };

  const handleLessonSelect = (moduleIndex: number, lessonIndex: number) => {
    setSelectedLesson({ moduleIndex, lessonIndex });
    setCurrentModuleIndex(moduleIndex);
    
    // Set content immediately without loading delay
    const lesson = chapters[moduleIndex].subsections[lessonIndex];
    setCurrentContent(lesson.fullText);
  };

  const startRecommendedLesson = () => {
    if (recommendedLesson) {
      handleLessonSelect(recommendedLesson.moduleIndex, recommendedLesson.lessonIndex);
    }
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    
    const newMessage = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, newMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { 
        role: 'ai' as const, 
        content: `I can help explain that concept! Based on your question about "${chatInput}", let me provide some guidance...`
      };
      setChatMessages(prev => [...prev, aiResponse]);
      
      // Increment unread if chat is closed
      if (!chatOpen) {
        setUnreadMessages(prev => prev + 1);
      }
    }, 1000);
    
    setChatInput("");
  };

  const openChat = () => {
    setChatOpen(true);
    setUnreadMessages(0);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'quiz': return HelpCircle;
      default: return FileText;
    }
  };

  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const currentModule = selectedLesson ? chapters[selectedLesson.moduleIndex] : null;
  const currentLesson = selectedLesson ? chapters[selectedLesson.moduleIndex]?.subsections[selectedLesson.lessonIndex] : null;

  if (!pfId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center shadow-lg">
          <CardContent>
            <div className="text-red-500 text-lg font-semibold mb-2">
              Missing personalized file ID
            </div>
            <p className="text-gray-600 mb-4">
              Please return to your course materials and try again.
            </p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Unified Header Strip */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          {/* Navigation & Context */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="text-gray-600 hover:text-gray-900 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className="text-gray-600 hover:text-gray-900"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              {/* Dynamic Breadcrumb */}
              <div className="flex items-center space-x-2 text-sm">
                <span className="font-semibold text-gray-900">{courseName || "Loading..."}</span>
                {currentModule && (
                  <>
                    <span className="text-gray-400">›</span>
                    <span className="text-gray-700">{currentModule.chapterTitle}</span>
                  </>
                )}
                {currentLesson && (
                  <>
                    <span className="text-gray-400">›</span>
                    <span className="font-medium text-blue-600">{currentLesson.title}</span>
                  </>
                )}
              </div>
            </div>

            {/* Contextual Actions */}
            <div className="flex items-center space-x-3">
              {/* Removed contextual action buttons */}
            </div>
          </div>

          {/* Unified Metrics */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-gray-900">{completedLessons}/{totalLessons}</span>
                <span className="text-gray-600">lessons</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-gray-900">{studyTime}m</span>
                <span className="text-gray-600">today</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Flame className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-gray-900">{currentStreak}-day</span>
                <span className="text-gray-600">streak</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Progress value={progressPercentage} className="w-24 h-2" />
                <span className="text-sm font-semibold text-gray-900">{Math.round(progressPercentage)}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Two-Pane Layout */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Pane: Collapsible Navigator */}
        {sidebarVisible && (
          <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto relative">
            <div className="p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Course Modules</h2>
              
              {/* Collapsed Module List */}
              <div className="space-y-2">
                {chapters.map((chapter, moduleIndex) => (
                  <div
                    key={moduleIndex}
                    className="relative"
                  >
                    {/* Module Header */}
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all duration-200 border",
                        currentModuleIndex === moduleIndex 
                          ? "border-blue-500 bg-blue-50 shadow-md" 
                          : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                      )}
                      onClick={() => handleModuleClick(moduleIndex)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className={cn(
                              "text-sm font-semibold leading-tight line-clamp-2",
                              currentModuleIndex === moduleIndex ? "text-blue-900" : "text-gray-900"
                            )}>
                              {chapter.chapterTitle}
                            </CardTitle>
                            <div className="flex items-center space-x-3 mt-2">
                              <span className={cn(
                                "text-xs",
                                currentModuleIndex === moduleIndex ? "text-blue-700" : "text-gray-600"
                              )}>
                                {chapter.subsections.length} lessons
                              </span>
                              <div className="flex items-center space-x-1">
                                <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full transition-all duration-300",
                                      currentModuleIndex === moduleIndex ? "bg-blue-600" : "bg-gray-400"
                                    )}
                                    style={{ width: `${chapter.progress}%` }}
                                  />
                                </div>
                                <span className={cn(
                                  "text-xs font-medium",
                                  currentModuleIndex === moduleIndex ? "text-blue-700" : "text-gray-600"
                                )}>
                                  {chapter.progress}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {currentModuleIndex === moduleIndex ? (
                              <ChevronDown className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Expanded Lessons - Directly Under Module */}
                    {currentModuleIndex === moduleIndex && (
                      <div className="mt-2 ml-4 space-y-2">
                        {chapter.subsections.map((lesson, lessonIndex) => {
                          const TypeIcon = getTypeIcon(lesson.type);
                          const isSelected = selectedLesson?.moduleIndex === moduleIndex && selectedLesson?.lessonIndex === lessonIndex;
                          const isRecommended = recommendedLesson?.moduleIndex === moduleIndex && recommendedLesson?.lessonIndex === lessonIndex;
                          
                          return (
                            <Card
                              key={lessonIndex}
                              className={cn(
                                "cursor-pointer border transition-all duration-200 group relative overflow-hidden",
                                isSelected 
                                  ? "border-blue-500 bg-blue-50 shadow-lg scale-105" 
                                  : lesson.completed
                                  ? "border-green-200 bg-green-50 hover:shadow-md hover:scale-102"
                                  : isRecommended
                                  ? "border-orange-300 bg-orange-50 hover:shadow-md ring-2 ring-orange-200"
                                  : "border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-102"
                              )}
                              onClick={() => handleLessonSelect(moduleIndex, lessonIndex)}
                            >
                              {isRecommended && (
                                <div className="absolute -top-2 -right-2 z-10">
                                  <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
                                </div>
                              )}
                              
                              <CardContent className="p-0">
                                <div className="p-4">
                                  <div className="flex items-center space-x-3">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center relative transition-all duration-200",
                                      lesson.completed 
                                        ? "bg-green-500 text-white shadow-lg"
                                        : isSelected
                                        ? "bg-blue-500 text-white shadow-lg"
                                        : isRecommended
                                        ? "bg-orange-500 text-white shadow-lg"
                                        : "bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:shadow-md"
                                    )}>
                                      {lesson.completed ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        <TypeIcon className="h-4 w-4" />
                                      )}
                                      {lesson.completed && (
                                        <div className="absolute -inset-1 rounded-xl bg-green-500 opacity-20 animate-pulse"></div>
                                      )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <h4 className={cn(
                                        "font-semibold text-sm leading-tight line-clamp-2 mb-2",
                                        isSelected ? "text-blue-900" : "text-gray-900"
                                      )}>
                                        {lesson.title}
                                      </h4>
                                      
                                      <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                                          <Timer className="h-3 w-3" />
                                          <span className="font-medium">{lesson.timeToComplete}m</span>
                                        </div>
                                        
                                        {lesson.score && (
                                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                                            <Star className="h-3 w-3" />
                                            <span className="font-medium">{lesson.score}%</span>
                                          </div>
                                        )}
                                        
                                        {lesson.lastVisited && (
                                          <span className="text-xs text-gray-500 font-medium">{lesson.lastVisited}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Removed Enhanced Action Bar */}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          <div className="flex items-center justify-center min-h-full p-6">
            <div className="w-full max-w-6xl">
              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-16">
                  {!selectedLesson ? (
                    // Intelligent Learning Prompt
                    <div className="space-y-8">
                      <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                          <BookOpen className="h-10 w-10 text-white" />
                        </div>
                        
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            {courseName || "Course Materials"}
                          </h1>
                          
                          {recommendedLesson ? (
                            <div className="space-y-4">
                              <p className="text-lg text-gray-700">
                                You&apos;ve completed <span className="font-semibold text-blue-600">{completedLessons} of {totalLessons}</span> lessons. 
                              </p>
                              
                              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 max-w-2xl mx-auto">
                                <h3 className="font-semibold text-orange-900 mb-2">Today&apos;s recommended lesson:</h3>
                                <p className="text-orange-800 mb-4">
                                  <span className="font-medium">{chapters[recommendedLesson.moduleIndex]?.subsections[recommendedLesson.lessonIndex]?.title}</span>
                                  <span className="text-orange-600 ml-2">
                                    ({chapters[recommendedLesson.moduleIndex]?.subsections[recommendedLesson.lessonIndex]?.timeToComplete}m)
                                  </span>
                                </p>
                                
                                <Button onClick={startRecommendedLesson} className="bg-orange-600 hover:bg-orange-700 text-white">
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Now
                                </Button>
                              </div>
                              
                              {studyTime === 1 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-xl mx-auto">
                                  <p className="text-blue-800 text-sm">
                                    💡 You&apos;re maintaining your {currentStreak}-day streak—keep the momentum going!
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-lg text-gray-600">
                              Outstanding! You&apos;ve completed all available lessons.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Lesson Content View
                    <div className="space-y-8">
                      <div className="space-y-8">
                        {/* Lesson Header */}
                        <div>
                          <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            {currentLesson?.title}
                          </h1>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Timer className="h-4 w-4" />
                              <span>{currentLesson?.timeToComplete} minutes</span>
                            </div>
                            
                            {currentLesson?.score && (
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4" />
                                <span>Your best: {currentLesson.score}%</span>
                              </div>
                            )}
                            
                            {currentLesson?.lastVisited && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>Last visited {currentLesson.lastVisited}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Lesson Content */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
                          <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
                            {currentContent ? (
                              <div dangerouslySetInnerHTML={{ 
                                __html: currentContent.replace(/\n/g, '<br />') 
                              }} />
                            ) : (
                              <div className="text-center py-8">
                                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">Select a lesson to begin learning</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Floating AI Chat Badge */}
          {!chatOpen && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button
                onClick={openChat}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg px-4 py-2 flex items-center space-x-2"
              >
                <Brain className="h-4 w-4" />
                <span className="font-medium">AI Tutor</span>
                {unreadMessages > 0 && (
                  <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadMessages}
                  </Badge>
                )}
              </Button>
            </div>
          )}

          {/* Floating AI Chat Panel */}
          {chatOpen && (
            <div className="fixed top-6 right-6 bottom-6 w-[420px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-purple-50 rounded-t-lg">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">AI Tutor</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatOpen(false)}
                  className="p-1 hover:bg-purple-100"
                >
                  <ChevronRight className="h-4 w-4 text-purple-600" />
                </Button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <Brain className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="font-medium">Ask me anything about your lesson!</p>
                    <p className="text-xs mt-1">I can explain concepts, create quizzes, or help with questions.</p>
                  </div>
                ) : (
                  chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg text-sm max-w-[85%] break-words",
                        message.role === 'user'
                          ? "bg-blue-500 text-white ml-auto"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {message.content}
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="Ask a question..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <Button
                    size="sm"
                    onClick={handleChatSubmit}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

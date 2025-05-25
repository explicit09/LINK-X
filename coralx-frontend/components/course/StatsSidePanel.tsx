"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Clock, 
  Target, 
  Zap, 
  CheckCircle2, 
  Circle,
  Edit,
  Save,
  X,
  Trophy,
  Flame,
  Star,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from 'sonner';
import { SmartRecommendations } from "@/components/ai/SmartRecommendations";
import { studentAPI } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  instructor?: string;
  studentsCount?: number;
  materialsCount?: number;
}

interface CourseProgress {
  completedMaterials: number;
  totalMaterials: number;
  weeklyTimeMinutes: number;
  todayTimeMinutes: number;
  progressPercentage: number;
}

interface TodoItem {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  type: 'reading' | 'quiz' | 'assignment' | 'review';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface StatsSidePanelProps {
  course: Course | null;
  courseProgress: CourseProgress;
  onUpdateDescription: (description: string) => void;
  userRole: string;
}

export function StatsSidePanel({ 
  course, 
  courseProgress, 
  onUpdateDescription, 
  userRole 
}: StatsSidePanelProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);

  // Load todos when component mounts - only once, not on course change
  useEffect(() => {
    const loadTodos = async () => {
      if (userRole !== 'student') {
        setLoadingTodos(false);
        return;
      }

      try {
        setLoadingTodos(true);
        console.log('StatsSidePanel: Loading todos from API...');
        
        // Use real API call instead of mock data
        const response = await studentAPI.getTodoItems();
        const todosData: TodoItem[] = Array.isArray(response) ? response : [];
        console.log('StatsSidePanel: Loaded todos from API:', todosData.length, 'items');

        // Filter todos for this specific course if we have a course ID
        const courseTodos = course?.id
          ? todosData.filter((todo: TodoItem) =>
              todo.course === course?.title ||
              todo.course === 'General' ||
              todo.course === 'This Course'
            )
          : todosData;
        
        console.log('StatsSidePanel: Filtered todos for course:', courseTodos?.length || 0, 'items');
        setTodos(courseTodos);
      } catch (error) {
        console.error('StatsSidePanel: Failed to load todos:', error);
        setTodos([]);
      } finally {
        setLoadingTodos(false);
      }
    };

    // Only load todos once when component mounts, not when course changes
    if (userRole === 'student') {
      loadTodos();
    }
  }, [userRole]); // Removed course?.id from dependencies

  const handleSaveDescription = () => {
    if (editedDescription.trim() !== course?.description) {
      onUpdateDescription(editedDescription.trim());
      sonnerToast.success("Course description updated");
    }
    setIsEditingDescription(false);
  };

  const handleCancelEdit = () => {
    setEditedDescription(course?.description || "");
    setIsEditingDescription(false);
  };

  const handleToggleTodo = async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    try {
      // Update the todo status in the database
      await studentAPI.updateTodoItem(todoId, {
        completed: !todo.completed
      });

      // Update local state after successful API call
      setTodos(prev => 
        prev.map(todo => 
          todo.id === todoId 
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      );
      
      sonnerToast.success(
        todo.completed ? "Task unmarked" : "Task completed! 🎉"
      );
    } catch (error) {
      console.error('Failed to update todo:', error);
      sonnerToast.error("Failed to update task");
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      console.log('StatsSidePanel: Deleting todo with ID:', todoId);
      
      // Delete from database
      const response = await studentAPI.deleteTodoItem(todoId);
      console.log('StatsSidePanel: Delete API response:', response);
      
      // Update local state after successful deletion
      setTodos(prev => {
        const filtered = prev.filter(todo => todo.id !== todoId);
        console.log('StatsSidePanel: Updated todos after delete:', filtered.length, 'items remaining');
        return filtered;
      });
      
      sonnerToast.success("Task deleted successfully!");
    } catch (error) {
      console.error('StatsSidePanel: Failed to delete todo:', error);
      
      // Better error handling
      if (error instanceof Error && error.message.includes('401')) {
        sonnerToast.error("Authentication failed. Please refresh the page and try again.");
      } else if (error instanceof Error && error.message.includes('404')) {
        sonnerToast.error("Task not found. It may have already been deleted.");
        // Remove from local state anyway since it doesn't exist
        setTodos(prev => prev.filter(todo => todo.id !== todoId));
      } else {
        sonnerToast.error("Failed to delete task: " + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const getTodoPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getTodoTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return BookOpen;
      case 'quiz': return Target;
      case 'assignment': return Edit;
      case 'review': return Clock;
      default: return Circle;
    }
  };

  // Calculate achievement badges
  const getAchievementBadges = () => {
    const badges = [];
    
    // Progress badges
    if (courseProgress.progressPercentage >= 25) {
      badges.push({
        icon: Trophy,
        label: 'Getting Started',
        color: 'bg-yellow-100 text-yellow-700',
        description: '25% course completion'
      });
    }
    
    if (courseProgress.progressPercentage >= 50) {
      badges.push({
        icon: Star,
        label: 'Half Way There',
        color: 'bg-blue-100 text-blue-700',
        description: '50% course completion'
      });
    }
    
    if (courseProgress.progressPercentage >= 75) {
      badges.push({
        icon: Zap,
        label: 'Almost Done',
        color: 'bg-purple-100 text-purple-700',
        description: '75% course completion'
      });
    }
    
    // Time-based badges
    if (courseProgress.weeklyTimeMinutes >= 120) { // 2+ hours this week
      badges.push({
        icon: Flame,
        label: 'Study Streak',
        color: 'bg-orange-100 text-orange-700',
        description: '2+ hours this week'
      });
    }
    
    return badges;
  };

  const achievementBadges = getAchievementBadges();

  if (!course) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Course information loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Course Description */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-gray-600">About This Course</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditedDescription(course.description || "");
                setIsEditingDescription(true);
              }}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isEditingDescription ? (
            <div className="space-y-3">
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Describe your course objectives, learning outcomes, and what makes it unique..."
                className="min-h-[100px] resize-none text-sm leading-relaxed"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription} className="bg-[#7B61FF] hover:bg-[#6B51E5]">
                  <Save className="h-3 w-3 mr-2" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-3 w-3 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="text-sm text-gray-700 leading-relaxed cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              onClick={() => {
                setEditedDescription(course.description || "");
                setIsEditingDescription(true);
              }}
            >
              {course.description || "Click to add course description..."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Todo Items */}
      {userRole === 'student' && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Your Tasks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingTodos ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : todos.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">All caught up!</p>
                <p className="text-xs text-gray-500">No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todos.map((todo) => {
                  const IconComponent = getTodoTypeIcon(todo.type);
                  const priorityColor = getTodoPriorityColor(todo.priority);
                  
                  return (
                    <div
                      key={todo.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg transition-all duration-150 group",
                        todo.completed 
                          ? "bg-gray-50 opacity-60" 
                          : "bg-white border border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <button 
                        className="mt-0.5"
                        onClick={() => handleToggleTodo(todo.id)}
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <IconComponent className={cn("h-3 w-3", priorityColor)} />
                          <h4 className={cn(
                            "text-sm font-medium",
                            todo.completed ? "line-through text-gray-500" : "text-gray-900"
                          )}>
                            {todo.title}
                          </h4>
                          <Badge 
                            className={cn(
                              "text-xs px-2 py-0.5 text-white font-medium",
                              todo.priority === 'high' ? 'bg-red-500' :
                              todo.priority === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                            )}
                          >
                            {todo.priority}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTodo(todo.id);
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-[#6B7280]">
                          Due {todo.dueDate}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress & Stats */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Circular Progress Ring */}
          <div className="flex items-center gap-4">
            <div className="relative w-[90px] h-[90px]">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#7B61FF] transition-all duration-300 ease-out"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${courseProgress.progressPercentage}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-[#7B61FF]">{courseProgress.progressPercentage}%</span>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Course Completion</span>
              <p className="text-xs text-[#6B7280] mt-1">
                {courseProgress.completedMaterials} of {courseProgress.totalMaterials} materials completed
              </p>
            </div>
          </div>

          {/* Time Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {Math.round(courseProgress.todayTimeMinutes)}m
              </div>
              <div className="text-xs text-gray-600">Today</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {Math.round(courseProgress.weeklyTimeMinutes / 60 * 10) / 10}h
              </div>
              <div className="text-xs text-gray-600">This Week</div>
            </div>
          </div>

          {/* Achievement Badges */}
          {achievementBadges.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Achievements</h4>
              <div className="space-y-2">
                {achievementBadges.map((badge, index) => {
                  const IconComponent = badge.icon;
                  return (
                    <div key={index} className={cn("flex items-center gap-2 p-2 rounded-lg", badge.color)}>
                      <IconComponent className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{badge.label}</p>
                        <p className="text-xs opacity-75">{badge.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Milestone */}
          {courseProgress.progressPercentage < 100 && (
            <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Next Milestone</span>
              </div>
              <p className="text-xs text-purple-600">
                {courseProgress.progressPercentage < 25 
                  ? "Complete 25% to unlock 'Getting Started' badge"
                  : courseProgress.progressPercentage < 50
                  ? "Complete 50% to unlock 'Half Way There' badge"
                  : courseProgress.progressPercentage < 75
                  ? "Complete 75% to unlock 'Almost Done' badge"
                  : "Complete 100% to finish the course!"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations (Smaller version for sidebar) */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SmartRecommendations 
            courseId={course.id}
            prioritizedLayout={true}
            className="text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
} 
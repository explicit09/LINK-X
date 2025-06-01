"use client";

import { useState, useEffect } from "react";
import { userAPI } from "@/lib/api";
import { SharedDashboardLayout } from "@/components/dashboard/layouts/SharedDashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Play,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowUp,
  ArrowDown,
  Zap,
  Target,
  Brain,
  TrendingUp,
  Sparkles,
  FileText,
  History,
  CheckSquare,
  CheckCircle2,
  ArrowRight,
  Wand2
} from "lucide-react";

interface StudySession {
  id: string;
  title: string;
  course: string;
  duration: string;
  cognitiveLoad: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'soon' | 'later';
  xpReward: number;
  type: 'assignment' | 'study' | 'meeting' | 'lab';
  dueIn?: string;
  estimatedStart: string;
  isGhost?: boolean;
}

// Droppable Time Slot Component
function DroppableTimeSlot({ 
  timeStr, 
  dayIndex, 
  children 
}: { 
  timeStr: string; 
  dayIndex: number; 
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `time-slot-${timeStr}-day-${dayIndex}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-12 border-b border-gray-100 relative transition-colors ${
        isOver ? 'bg-blue-50 border-blue-200' : ''
      }`}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-md bg-blue-50/30 pointer-events-none flex items-center justify-center">
          <span className="text-xs text-blue-600 font-medium">Drop here</span>
        </div>
      )}
    </div>
  );
}

// Draggable Calendar Event Component  
function DraggableCalendarEvent({ 
  session, 
  position, 
  courseStyle, 
  onSelect, 
  onGhostClick 
}: {
  session: StudySession;
  position: { top: number; height: number };
  courseStyle: any;
  onSelect: (session: StudySession) => void;
  onGhostClick: (session: StudySession) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getUrgencyOverlay = () => {
    if (session.urgency === 'urgent') return 'after:bg-red-500/8';
    if (session.urgency === 'soon') return 'after:bg-amber-500/8';
    return 'after:bg-green-500/8';
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        top: `${(position.top / 60) * 48}px`,
        height: `${Math.max((position.height / 60) * 48, 24)}px`,
        backgroundColor: session.isGhost ? '#dbeafe80' : courseStyle?.color + '15',
        borderLeftColor: session.isGhost ? '#60a5fa' : courseStyle?.color,
        borderStyle: session.isGhost ? 'dashed' : 'solid'
      }}
      {...attributes}
      {...listeners}
      className={`absolute left-1 right-1 rounded-md px-2 py-1 text-xs cursor-pointer hover:shadow-lg transition-all relative group border-l-4
        ${session.isGhost ? 'border-dashed border-blue-400 bg-blue-50/50' : getUrgencyOverlay() + ' after:absolute after:inset-0 after:rounded-md after:pointer-events-none'}
        ${isDragging ? 'z-50 shadow-2xl ring-2 ring-blue-400' : ''}`}
      onClick={() => {
        if (!isDragging) {
          session.isGhost ? onGhostClick(session) : onSelect(session);
        }
      }}
    >
      {/* XP Chip - Top Right */}
      <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm z-10">
        +{session.xpReward}
      </div>
      
      <div className={`font-medium truncate text-[11px] ${session.isGhost ? 'text-blue-600' : 'text-gray-900'}`}>
        {session.isGhost ? '✨ AI Suggested' : session.course}
      </div>
      <div className={`truncate text-[10px] leading-tight ${session.isGhost ? 'text-blue-500' : 'text-gray-600'}`}>
        {session.title}
      </div>
      {session.isGhost && (
        <div className="text-[9px] text-blue-400 font-medium">
          Click to add →
        </div>
      )}
      
      {/* Enhanced urgency indicator */}
      {session.dueIn && (
        <div className="flex items-center gap-1 mt-0.5">
          {session.urgency === 'urgent' && <span className="text-red-600 text-[8px]">🔴</span>}
          {session.urgency === 'soon' && <span className="text-orange-600 text-[8px]">🟡</span>}
          <div className="text-red-600 text-[9px] font-medium">
            Due {session.dueIn}
          </div>
        </div>
      )}
      
      {/* Cognitive load indicator */}
      <div className="absolute bottom-1 left-1">
        {session.cognitiveLoad === 'high' && <span className="text-red-500 text-[8px]">🧠</span>}
        {session.cognitiveLoad === 'medium' && <span className="text-orange-500 text-[8px]">🧠</span>}
        {session.cognitiveLoad === 'low' && <span className="text-green-500 text-[8px]">🧠</span>}
      </div>
    </div>
  );
}

// Sortable Session Card Component
function SortableSessionCard({ 
  session, 
  isNext, 
  courseStyle, 
  onSelect, 
  onStart,
  onStop,
  getCognitiveLoadColor,
  getUrgencyIcon,
  isCompleted = false,
  isActive = false
}: {
  session: StudySession;
  index: number;
  isNext: boolean;
  courseStyle: any;
  onSelect: (session: StudySession) => void;
  onStart: (session: StudySession) => void;
  onStop: (session: StudySession) => void;
  getCognitiveLoadColor: (load: string) => string;
  getUrgencyIcon: (urgency: string) => React.ReactNode;
  isCompleted?: boolean;
  isActive?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Urgency overlay class (8% opacity tint)
  const getUrgencyOverlayClass = () => {
    if (session.urgency === 'urgent') return 'after:bg-red-500/8';   
    if (session.urgency === 'soon') return 'after:bg-amber-500/8';   
    return 'after:bg-green-500/8';  
  };

  return (
    <div
      ref={setNodeRef}
      style={{ 
        ...style, 
        borderLeftColor: isActive ? '#8B5CF6' : isCompleted ? '#10b981' : courseStyle?.color 
      }}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(session)}
      className={`relative rounded-lg border-l-4 bg-white shadow-sm px-4 py-3 cursor-pointer transition-all hover:shadow-md ${
        isNext ? 'ring-2 ring-blue-200 shadow-md' : ''
      } ${isDragging ? 'z-50' : ''} ${
        isActive ? 'ring-2 ring-purple-200 bg-gradient-to-r from-purple-50 to-blue-50' : 
        isCompleted ? 'opacity-75 bg-green-50' : getUrgencyOverlayClass()
      } after:absolute after:inset-0 after:rounded-lg after:pointer-events-none`}
    >
      {isActive && (
        <div className="absolute -top-2 -left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
          ⏱️ ACTIVE
        </div>
      )}
      
      {isNext && !isCompleted && !isActive && (
        <div className="absolute -top-2 -left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
          NEXT
        </div>
      )}
      
      {isCompleted && (
        <div className="absolute -top-2 -left-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
          ✓ DONE
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Session Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-700">
              {session.course}
            </span>
            {getUrgencyIcon(session.urgency)}
            <Badge className={`text-xs px-2 py-0 ${getCognitiveLoadColor(session.cognitiveLoad)}`}>
              {session.cognitiveLoad} focus
            </Badge>
            {session.dueIn && (
              <Badge className="bg-red-100 text-red-700 text-xs px-2 py-0">
                Due in {session.dueIn}
              </Badge>
            )}
          </div>

          {/* Session Title & Duration */}
          <h3 className="text-base font-medium text-gray-900 mb-1">
            {session.title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.duration}
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Starts ~{session.estimatedStart}
            </span>
          </div>
        </div>

        {/* XP Reward & Action */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-lg font-bold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
              {isCompleted ? '✓' : '+'}{session.xpReward}
            </div>
            <div className="text-xs text-gray-500">{isCompleted ? 'Earned' : 'XP'}</div>
          </div>
          
          {!isCompleted ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) {
                  // Stop the active session
                  if (window.confirm('Stop this session?')) {
                    onStop(session);
                  }
                } else {
                  onStart(session);
                }
              }}
              size="sm"
              className={
                isActive ? "bg-purple-600 hover:bg-purple-700" :
                isNext ? "bg-green-600 hover:bg-green-700" : 
                "bg-gray-600 hover:bg-gray-700"
              }
            >
              {isActive ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  {isNext ? 'Start' : session.type === 'meeting' ? 'Join' : 'Begin'}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(session);
              }}
              size="sm"
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'deadlines' | 'insights' | 'quickadd'>('deadlines');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'stack' | 'calendar' | 'month'>('calendar');
  const [showCompressedHours, setShowCompressedHours] = useState(false);
  const [visibleFilters, setVisibleFilters] = useState<Set<string>>(new Set(['urgent', 'due-soon', 'completed']));
  const [hiddenCourses, setHiddenCourses] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSession, setDrawerSession] = useState<StudySession | null>(null);
  const [drawerTab, setDrawerTab] = useState<'details' | 'notes' | 'history'>('details');
  const [sessionNotes, setSessionNotes] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState([14]); // Default 2PM
  const [activeId, setActiveId] = useState<string | null>(null);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [showAutofillDialog, setShowAutofillDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());
  const [markingComplete, setMarkingComplete] = useState(false);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showOptimizePreview, setShowOptimizePreview] = useState(false);
  const [optimizedSessions, setOptimizedSessions] = useState<StudySession[]>([]);
  const [optimizationMetrics, setOptimizationMetrics] = useState<{
    urgentTasksFirst: number;
    cognitiveLoadBalance: number;
    deadlineAlignment: number;
    timeEfficiency: number;
    overallScore: number;
  } | null>(null);
  const [mobileBottomSheet, setMobileBottomSheet] = useState(false);
  const [mobileSelectedSession, setMobileSelectedSession] = useState<StudySession | null>(null);
  const [mobileSheetTab, setMobileSheetTab] = useState<'details' | 'actions'>('details');
  const [analyticsEvents, setAnalyticsEvents] = useState<Array<{
    id: string;
    event: string;
    timestamp: Date;
    metadata?: any;
  }>>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await userAPI.getMe();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setCurrentUser({ name: "Student User", email: "student@example.com" });
      }
    };

    fetchUser();
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Session countdown timer effect
  useEffect(() => {
    if (!activeSession || !sessionStartTime) return;

    const timer = setInterval(() => {
      const now = new Date();
      const elapsed = now.getTime() - sessionStartTime.getTime();
      const totalDuration = parseDurationToMinutes(activeSession.duration) * 60 * 1000; // Convert to ms
      const progress = Math.min((elapsed / totalDuration) * 100, 100);
      
      setSessionProgress(progress);
      
      // Auto-complete when timer reaches 100%
      if (progress >= 100) {
        triggerConfetti();
        handleMarkComplete(activeSession);
        setActiveSession(null);
        setSessionStartTime(null);
        setShowCountdown(false);
        clearInterval(timer);
      }
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, [activeSession, sessionStartTime]);

  // AI-prioritized session stack (cognitive load + urgency + deadlines)
  const todaySessions: StudySession[] = [
    {
      id: "1",
      title: "Neural Networks Assignment",
      course: "CS229",
      duration: "2h",
      cognitiveLoad: "high", 
      urgency: "urgent",
      xpReward: 75,
      type: "assignment",
      dueIn: "6 hours",
      estimatedStart: "09:00"
    },
    {
      id: "2", 
      title: "Study Group Notes Review",
      course: "CS161",
      duration: "1h",
      cognitiveLoad: "medium",
      urgency: "soon", 
      xpReward: 25,
      type: "study",
      estimatedStart: "11:30"
    },
    {
      id: "3",
      title: "NLP Paper Reading",
      course: "CS224n", 
      duration: "45m",
      cognitiveLoad: "medium",
      urgency: "later",
      xpReward: 20,
      type: "study",
      estimatedStart: "14:00"
    },
    {
      id: "4",
      title: "Computer Vision Lab Prep",
      course: "CS231n",
      duration: "1.5h", 
      cognitiveLoad: "low",
      urgency: "later",
      xpReward: 30,
      type: "lab",
      estimatedStart: "16:00"
    },
    {
      id: "5",
      title: "Late Night Coding",
      course: "CS229",
      duration: "1h", 
      cognitiveLoad: "high",
      urgency: "later",
      xpReward: 40,
      type: "study",
      estimatedStart: "22:00"
    },
    {
      id: "6",
      title: "Morning Review",
      course: "CS161",
      duration: "30m", 
      cognitiveLoad: "low",
      urgency: "later",
      xpReward: 15,
      type: "study",
      estimatedStart: "08:00"
    }
  ];

  useEffect(() => {
    setIsClient(true);
    safeSetSessions(todaySessions);
    
    // Check localStorage for core hours toast preference
    const hasSeenToast = localStorage.getItem('hasSeenCoreHoursToast');
    if (!hasSeenToast && !showCompressedHours) {
      setTimeout(() => {
        toast.info("Showing full day (12AM-11PM) • Click 'Show core hours' to compress to 8AM-6PM", {
          duration: 5000,
          action: {
            label: 'Got it',
            onClick: () => {
              localStorage.setItem('hasSeenCoreHoursToast', 'true');
            }
          }
        });
      }, 1000);
    }
  }, []);

  // Filter sessions based on hidden courses
  const filteredSessions = sessions.filter(session => !hiddenCourses.has(session.course));

  // AI-suggested ghost sessions for empty calendar
  const ghostSessions = [
    {
      id: "ghost-1",
      title: "Suggested Focus Block",
      course: "AI-Suggested",
      duration: "1h",
      cognitiveLoad: "medium" as const,
      urgency: "later" as const,
      xpReward: 30,
      type: "study" as const,
      estimatedStart: "10:00",
      isGhost: true
    },
    {
      id: "ghost-2", 
      title: "Suggested Study Session",
      course: "AI-Suggested",
      duration: "1.5h",
      cognitiveLoad: "high" as const,
      urgency: "later" as const,
      xpReward: 45,
      type: "study" as const,
      estimatedStart: "14:00",
      isGhost: true
    },
    {
      id: "ghost-3",
      title: "Suggested Review Time",
      course: "AI-Suggested", 
      duration: "45m",
      cognitiveLoad: "low" as const,
      urgency: "later" as const,
      xpReward: 20,
      type: "study" as const,
      estimatedStart: "16:00",
      isGhost: true
    }
  ];

  // Show ghost sessions only if calendar is empty
  const allSessions = filteredSessions.length === 0 ? ghostSessions : filteredSessions;
  
  // Filter sessions by time scope for calendar view
  const displaySessions = (() => {
    // First filter: Remove sessions without valid timestamps
    const validTimestampSessions = allSessions.filter(session => {
      // Check if estimatedStart exists and is a valid time format
      if (!session.estimatedStart || typeof session.estimatedStart !== 'string') {
        console.log(`Removing session "${session.title}" - missing or invalid estimatedStart:`, session.estimatedStart);
        return false;
      }
      
      // Check if estimatedStart matches HH:MM format
      const timeRegex = /^([0-9]{1,2}):([0-9]{2})$/;
      if (!timeRegex.test(session.estimatedStart)) {
        console.log(`Removing session "${session.title}" - invalid time format "${session.estimatedStart}" (expected HH:MM)`);
        return false;
      }
      
      return true;
    });

    // Second filter: Validate 24-hour format (0-23)
    const valid24HourSessions = validTimestampSessions.filter(session => {
      const hour = parseInt(session.estimatedStart.split(':')[0]);
      const minute = parseInt(session.estimatedStart.split(':')[1]);
      
      const isValid24Hour = hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
      
      if (!isValid24Hour) {
        console.log(`Removing invalid session "${session.title}" at ${session.estimatedStart} (outside 0-23 hour range or invalid minutes)`);
      }
      
      return isValid24Hour;
    });

    // Third filter: Additional filter for calendar view compressed hours
    return valid24HourSessions.filter(session => {
      if (viewMode !== 'calendar') return true;
      
      const hour = parseInt(session.estimatedStart.split(':')[0]);
      const baseHour = showCompressedHours ? 8 : 0;
      const endHour = showCompressedHours ? 18 : 23;
      const isWithinViewScope = hour >= baseHour && hour <= endHour;
      
      if (!isWithinViewScope && viewMode === 'calendar') {
        console.log(`Filtering out session "${session.title}" at ${session.estimatedStart} for calendar view (outside ${baseHour}-${endHour})`);
      }
      
      return isWithinViewScope;
    });
  })();

  const toggleCourseVisibility = (courseCode: string) => {
    const newHiddenCourses = new Set(hiddenCourses);
    if (hiddenCourses.has(courseCode)) {
      newHiddenCourses.delete(courseCode);
    } else {
      newHiddenCourses.add(courseCode);
    }
    setHiddenCourses(newHiddenCourses);
  };

  const getCourseCompletionStatus = (courseCode: string) => {
    const courseSessions = sessions.filter(s => s.course === courseCode);
    const completedSessions = 0; // In real app, track completed sessions
    return completedSessions === courseSessions.length && courseSessions.length > 0;
  };

  const courseConfig = {
    "CS229": { color: "#3B82F6", name: "Machine Learning" },
    "CS161": { color: "#10B981", name: "Algorithms" },
    "CS224n": { color: "#8B5CF6", name: "NLP" },
    "CS231n": { color: "#F59E0B", name: "Computer Vision" }
  };

  const getCognitiveLoadColor = (load: string) => {
    switch (load) {
      case 'high': return 'text-red-700 bg-red-50';
      case 'medium': return 'text-orange-700 bg-orange-50'; 
      case 'low': return 'text-green-700 bg-green-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return <Zap className="h-3 w-3 text-red-600" />;
      case 'soon': return <Clock className="h-3 w-3 text-orange-600" />;
      case 'later': return <Calendar className="h-3 w-3 text-gray-500" />;
      default: return null;
    }
  };

  const handleSessionSelect = (session: StudySession) => {
    setDrawerSession(session);
    setDrawerOpen(true);
    setDrawerTab('details');
    // Load session notes (in real app, from API)
    setSessionNotes(`Notes for ${session.title}...`);
  };

  const handleMobileSessionSelect = (session: StudySession) => {
    setMobileSelectedSession(session);
    setMobileBottomSheet(true);
    setMobileSheetTab('details');
    // Load session notes (in real app, from API)
    setSessionNotes(`Notes for ${session.title}...`);
    
    // Track analytics event
    trackEvent('session_details_viewed', {
      sessionId: session.id,
      sessionType: session.type,
      course: session.course,
      platform: 'mobile'
    });
  };

  const trackEvent = (eventName: string, metadata?: any) => {
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      event: eventName,
      timestamp: new Date(),
      metadata
    };
    
    setAnalyticsEvents(prev => [...prev, event]);
    
    // In real app, send to analytics service
    console.log('📊 Analytics Event:', event);
  };

  const validateSession = (session: StudySession): boolean => {
    // Check if estimatedStart exists and is valid
    if (!session.estimatedStart || typeof session.estimatedStart !== 'string') {
      console.warn(`Invalid session "${session.title}" - missing estimatedStart`);
      return false;
    }
    
    // Check time format HH:MM
    const timeRegex = /^([0-9]{1,2}):([0-9]{2})$/;
    if (!timeRegex.test(session.estimatedStart)) {
      console.warn(`Invalid session "${session.title}" - bad time format: "${session.estimatedStart}"`);
      return false;
    }
    
    // Check 24-hour range
    const [hourStr, minuteStr] = session.estimatedStart.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      console.warn(`Invalid session "${session.title}" - time out of range: "${session.estimatedStart}"`);
      return false;
    }
    
    return true;
  };

  const safeSetSessions = (newSessions: StudySession[] | ((prev: StudySession[]) => StudySession[])) => {
    if (typeof newSessions === 'function') {
      setSessions(prev => {
        const result = newSessions(prev);
        const validSessions = result.filter(validateSession);
        if (validSessions.length !== result.length) {
          console.warn(`Filtered out ${result.length - validSessions.length} invalid sessions`);
        }
        return validSessions;
      });
    } else {
      const validSessions = newSessions.filter(validateSession);
      if (validSessions.length !== newSessions.length) {
        console.warn(`Filtered out ${newSessions.length - validSessions.length} invalid sessions`);
      }
      setSessions(validSessions);
    }
  };

  const parseDurationToMinutes = (duration: string): number => {
    // Parse duration (e.g., "2h", "45m", "1.5h") into minutes
    if (duration.includes('h')) {
      const hours = parseFloat(duration.replace('h', ''));
      return hours * 60;
    } else if (duration.includes('m')) {
      return parseInt(duration.replace('m', ''));
    }
    return 60; // Default to 1 hour
  };

  const handleStartSession = (session: StudySession) => {
    setActiveSession(session);
    setSessionStartTime(new Date());
    setSessionProgress(0);
    setShowCountdown(true);
    
    // Close drawer if open
    setDrawerOpen(false);
    
    // Track analytics event
    trackEvent('session_started', {
      sessionId: session.id,
      sessionType: session.type,
      course: session.course,
      duration: session.duration,
      cognitiveLoad: session.cognitiveLoad,
      urgency: session.urgency,
      xpReward: session.xpReward
    });
    
    // Show start toast
    toast.success("Session Started!", {
      description: `Focus time: ${session.duration} • ${session.title}`,
      duration: 3000,
    });
    
    console.log('Starting session:', session.title);
  };

  const handleStopSession = (session: StudySession) => {
    setActiveSession(null);
    setSessionStartTime(null);
    setShowCountdown(false);
    
    // Track analytics event
    trackEvent('session_stopped', {
      sessionId: session.id,
      sessionTitle: session.title,
      reason: 'manual_stop'
    });
    
    toast.info("Session stopped", {
      description: `"${session.title}" focus session ended`,
      duration: 2000
    });
  };


  const calculateOptimizationMetrics = (currentSessions: StudySession[], optimizedSessions: StudySession[]) => {
    // Calculate current metrics
    const currentUrgentFirst = currentSessions.findIndex(s => s.urgency === 'urgent') === 0 ? 100 : 0;
    const currentCognitiveBalance = calculateCognitiveBalance(currentSessions);
    const currentDeadlineAlignment = calculateDeadlineAlignment(currentSessions);
    const currentTimeEfficiency = calculateTimeEfficiency(currentSessions);
    
    // Calculate optimized metrics
    const optimizedUrgentFirst = optimizedSessions.findIndex(s => s.urgency === 'urgent') === 0 ? 100 : 0;
    const optimizedCognitiveBalance = calculateCognitiveBalance(optimizedSessions);
    const optimizedDeadlineAlignment = calculateDeadlineAlignment(optimizedSessions);
    const optimizedTimeEfficiency = calculateTimeEfficiency(optimizedSessions);
    
    return {
      urgentTasksFirst: optimizedUrgentFirst - currentUrgentFirst,
      cognitiveLoadBalance: optimizedCognitiveBalance - currentCognitiveBalance,
      deadlineAlignment: optimizedDeadlineAlignment - currentDeadlineAlignment,
      timeEfficiency: optimizedTimeEfficiency - currentTimeEfficiency,
      overallScore: ((optimizedUrgentFirst + optimizedCognitiveBalance + optimizedDeadlineAlignment + optimizedTimeEfficiency) / 4) - 
                   ((currentUrgentFirst + currentCognitiveBalance + currentDeadlineAlignment + currentTimeEfficiency) / 4)
    };
  };
  
  const calculateCognitiveBalance = (sessions: StudySession[]): number => {
    // Prefer high cognitive load tasks in the morning (better score)
    let score = 0;
    sessions.forEach((session, index) => {
      if (session.cognitiveLoad === 'high' && index < sessions.length / 3) score += 30;
      if (session.cognitiveLoad === 'medium' && index >= sessions.length / 3 && index < 2 * sessions.length / 3) score += 20;
      if (session.cognitiveLoad === 'low' && index >= 2 * sessions.length / 3) score += 15;
    });
    return Math.min(score, 100);
  };
  
  const calculateDeadlineAlignment = (sessions: StudySession[]): number => {
    // Sessions with deadlines should be prioritized
    let score = 0;
    sessions.forEach((session, index) => {
      if (session.dueIn && index < sessions.length / 2) score += 25;
    });
    return Math.min(score, 100);
  };
  
  const calculateTimeEfficiency = (sessions: StudySession[]): number => {
    // Similar duration tasks grouped together for better flow
    let score = 80; // Base score
    for (let i = 0; i < sessions.length - 1; i++) {
      const current = parseDurationToMinutes(sessions[i].duration);
      const next = parseDurationToMinutes(sessions[i + 1].duration);
      if (Math.abs(current - next) <= 30) score += 5; // Similar durations
    }
    return Math.min(score, 100);
  };

  const generateOptimizationPreview = () => {
    // Create optimized version using the same logic as handleAIOptimize
    const optimized = [...sessions].sort((a, b) => {
      const urgencyWeight = { urgent: 3, soon: 2, later: 1 };
      const aScore = urgencyWeight[a.urgency] + (a.cognitiveLoad === 'high' ? 2 : a.cognitiveLoad === 'medium' ? 1 : 0);
      const bScore = urgencyWeight[b.urgency] + (b.cognitiveLoad === 'high' ? 2 : b.cognitiveLoad === 'medium' ? 1 : 0);
      return bScore - aScore;
    });
    
    // Update estimated start times based on new order
    optimized.forEach((session, index) => {
      session.estimatedStart = calculateNewStartTime(index);
    });
    
    setOptimizedSessions(optimized);
    setOptimizationMetrics(calculateOptimizationMetrics(sessions, optimized));
    setShowOptimizePreview(true);
  };

  const applyOptimization = () => {
    // Track comprehensive analytics event
    trackEvent('ai_optimization_applied', {
      sessionsMoved: optimizedSessions.filter((session, index) => 
        sessions.findIndex(s => s.id === session.id) !== index
      ).length,
      overallScoreImprovement: Math.round(optimizationMetrics?.overallScore || 0),
      metrics: {
        urgentTasksFirst: optimizationMetrics?.urgentTasksFirst || 0,
        cognitiveLoadBalance: optimizationMetrics?.cognitiveLoadBalance || 0,
        deadlineAlignment: optimizationMetrics?.deadlineAlignment || 0,
        timeEfficiency: optimizationMetrics?.timeEfficiency || 0
      },
      appliedAt: new Date().toISOString()
    });
    
    safeSetSessions(optimizedSessions);
    setShowOptimizePreview(false);
    
    toast.success("Schedule Optimized!", {
      description: `Applied AI optimization with +${Math.round(optimizationMetrics?.overallScore || 0)} overall efficiency gain`,
      duration: 3000
    });
  };

  const handleAIOptimize = async () => {
    // Track analytics event
    trackEvent('ai_optimization_previewed', {
      totalSessions: sessions.length,
      urgentSessions: sessions.filter(s => s.urgency === 'urgent').length,
      cognitiveLoadDistribution: {
        high: sessions.filter(s => s.cognitiveLoad === 'high').length,
        medium: sessions.filter(s => s.cognitiveLoad === 'medium').length,
        low: sessions.filter(s => s.cognitiveLoad === 'low').length
      }
    });
    
    // Show preview instead of immediately applying
    generateOptimizationPreview();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sessions.findIndex((session) => session.id === active.id);
      const newIndex = sessions.findIndex((session) => session.id === over.id);
      
      const newSessions = arrayMove(sessions, oldIndex, newIndex);
      const movedSession = newSessions[newIndex];
      
      // Track analytics event
      trackEvent('session_reordered', {
        sessionId: active.id,
        sessionTitle: movedSession.title,
        oldPosition: oldIndex,
        newPosition: newIndex,
        direction: newIndex > oldIndex ? 'down' : 'up',
        positionChange: Math.abs(newIndex - oldIndex)
      });
      
      // Optimistic update
      safeSetSessions(newSessions);
      
      // Show success toast immediately
      toast.success("Saved", {
        description: `"${movedSession.title}" moved to position ${newIndex + 1}`,
        duration: 2000,
      });
      
      // Simulate optimistic PATCH request
      console.log(`PATCH /api/sessions/${active.id}`, {
        position: newIndex,
        estimatedStart: calculateNewStartTime(newIndex)
      });
      
      // Auto-open drawer for fine-tuning
      setTimeout(() => {
        setDrawerSession(movedSession);
        setDrawerOpen(true);
        setDrawerTab('details');
      }, 300); // Small delay for better UX
    }
  };

  const calculateNewStartTime = (position: number): string => {
    // Calculate new start time based on position (8 AM base + 1.5h intervals)
    const baseHour = 8;
    const intervalHours = 1.5;
    const newHour = baseHour + (position * intervalHours);
    const hour = Math.floor(newHour);
    const minute = Math.floor((newHour % 1) * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleCalendarDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.id.toString().startsWith('time-slot-')) {
      // Extract time and day from time slot ID (e.g., "time-slot-09:00-day-2")
      const overIdStr = over.id.toString();
      const timeMatch = overIdStr.match(/time-slot-([0-9]{2}:[0-9]{2})/);
      const dayMatch = overIdStr.match(/day-([0-9]+)/);
      
      if (timeMatch) {
        const timeSlot = timeMatch[1];
        const dayIndex = dayMatch ? parseInt(dayMatch[1]) : 2; // Default to Wednesday
        const sessionId = active.id.toString();
        
        // Find and update the session
        const sessionIndex = sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex >= 0) {
          const updatedSessions = [...sessions];
          const movedSession = { ...updatedSessions[sessionIndex] };
          const oldTime = movedSession.estimatedStart;
          movedSession.estimatedStart = timeSlot;
          updatedSessions[sessionIndex] = movedSession;
          
          // Track analytics event
          trackEvent('session_rescheduled_calendar', {
            sessionId: sessionId,
            sessionTitle: movedSession.title,
            oldTime: oldTime,
            newTime: timeSlot,
            dayIndex: dayIndex,
            rescheduleType: 'drag_drop'
          });
          
          // Optimistic update
          safeSetSessions(updatedSessions);
          
          // Show success toast
          toast.success("Saved", {
            description: `"${movedSession.title}" moved to ${timeSlot}`,
            duration: 2000,
          });
          
          // Simulate optimistic PATCH request
          console.log(`PATCH /api/sessions/${sessionId}`, {
            estimatedStart: timeSlot,
            dayIndex: dayIndex
          });
          
          // Auto-open drawer for fine-tuning
          setTimeout(() => {
            setDrawerSession(movedSession);
            setDrawerOpen(true);
            setDrawerTab('details');
          }, 300);
        }
      }
    }
  };

  const handleAIAutofill = async () => {
    if (!selectedAssignment) return;
    
    setAutofillLoading(true);
    setShowAutofillDialog(false);
    
    // Simulate AI analysis and slot creation (in real app: POST /api/sessions/autofill)
    setTimeout(() => {
      // AI finds free slots and creates optimized study blocks
      const newSessions = [
        {
          id: "auto-1",
          title: `${selectedAssignment} - Part 1: Research`,
          course: "CS229",
          duration: "1h",
          cognitiveLoad: "medium" as const,
          urgency: "soon" as const,
          xpReward: 35,
          type: "study" as const,
          estimatedStart: "10:00"
        },
        {
          id: "auto-2", 
          title: `${selectedAssignment} - Part 2: Implementation`,
          course: "CS229",
          duration: "1.5h",
          cognitiveLoad: "high" as const,
          urgency: "soon" as const,
          xpReward: 50,
          type: "assignment" as const,
          estimatedStart: "15:00"
        }
      ];
      
      safeSetSessions(prev => [...prev, ...newSessions]);
      setAutofillLoading(false);
      setSelectedAssignment('');
      
      console.log(`AI Autofill: Created ${newSessions.length} study blocks for "${selectedAssignment}"`);
    }, 2000);
  };

  const handleGhostSessionClick = (ghostSession: StudySession) => {
    // Track analytics event
    trackEvent('ghost_session_converted', {
      sessionTitle: ghostSession.title,
      estimatedStart: ghostSession.estimatedStart,
      type: ghostSession.type,
      xpReward: ghostSession.xpReward
    });
    
    // Convert ghost session to real session
    const realSession = {
      ...ghostSession,
      id: `real-${Date.now()}`,
      course: 'CS229', // Default course for new sessions
      isGhost: false
    };
    
    safeSetSessions(prev => [...prev, realSession]);
    console.log('Ghost session converted to real session:', realSession.title);
  };

  const triggerConfetti = () => {
    // Create confetti animation effect
    const confettiCount = 50;
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-10px';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      confetti.style.zIndex = '9999';
      confetti.style.pointerEvents = 'none';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      
      document.body.appendChild(confetti);
      
      // Animate confetti falling
      const animation = confetti.animate([
        { transform: `translateY(0px) rotate(0deg)`, opacity: 1 },
        { transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, opacity: 0 }
      ], {
        duration: 3000 + Math.random() * 2000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });
      
      animation.onfinish = () => {
        document.body.removeChild(confetti);
      };
    }
  };

  const handleMarkComplete = async (session: StudySession) => {
    setMarkingComplete(true);
    
    // Calculate session duration if it was active
    const sessionDuration = activeSession?.id === session.id && sessionStartTime 
      ? Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60) // minutes
      : parseDurationToMinutes(session.duration);
    
    // Track comprehensive analytics event
    trackEvent('session_completed', {
      sessionId: session.id,
      sessionTitle: session.title,
      course: session.course,
      type: session.type,
      cognitiveLoad: session.cognitiveLoad,
      urgency: session.urgency,
      xpEarned: session.xpReward,
      durationMinutes: sessionDuration,
      wasActive: activeSession?.id === session.id,
      completionMethod: 'manual',
      estimatedStart: session.estimatedStart
    });
    
    // Note: Daily stats would be updated in dedicated analytics service/page
    
    // Trigger confetti celebration
    triggerConfetti();
    
    // Add to completed sessions
    setCompletedSessions(prev => new Set([...prev, session.id]));
    
    // Stop active session if this is it
    if (activeSession?.id === session.id) {
      setActiveSession(null);
      setSessionStartTime(null);
      setShowCountdown(false);
    }
    
    // Show celebration toast with confetti effect
    toast.success("🎉 Session Complete!", {
      description: `Great work! You earned +${session.xpReward} XP from "${session.title}"`,
      duration: 4000,
      action: {
        label: 'Next Session',
        onClick: () => {
          // Auto-select next incomplete session
          const currentIndex = sessions.findIndex(s => s.id === session.id);
          const remainingSessions = sessions.slice(currentIndex + 1);
          const nextIncompleteSession = remainingSessions.find(s => !completedSessions.has(s.id));
          
          if (nextIncompleteSession) {
            setDrawerSession(nextIncompleteSession);
            setDrawerTab('details');
            setDrawerOpen(true);
          }
        }
      }
    });
    
    // Simulate API call to mark complete
    console.log(`PATCH /api/sessions/${session.id}`, {
      completed: true,
      completedAt: new Date().toISOString(),
      xpAwarded: session.xpReward
    });
    
    // Close drawer after brief delay
    setTimeout(() => {
      setDrawerOpen(false);
      setMarkingComplete(false);
    }, 1500);
  };

  const generateTimeMarkers = () => {
    const markers = [];
    const startHour = showCompressedHours ? 8 : 0;
    const endHour = showCompressedHours ? 18 : 23;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      markers.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return markers;
  };

  const timeMarkers = generateTimeMarkers();
  const currentTimeStr = currentTime.toTimeString().slice(0, 5);


  const getEventPosition = (startTime: string, duration: string) => {
    const [hour, minute] = startTime.split(':').map(Number);
    const baseHour = showCompressedHours ? 8 : 0;
    const endHour = showCompressedHours ? 18 : 23;
    
    // Validate hour is within visible range
    if (hour < baseHour || hour > endHour) {
      return null; // Don't render sessions outside visible hours
    }
    
    const startPos = ((hour - baseHour) * 60) + minute; // Minutes from base hour
    
    // Parse duration (e.g., "2h", "45m", "1.5h")
    let durationMins = 60; // default
    if (duration.includes('h')) {
      const hours = parseFloat(duration.replace('h', ''));
      durationMins = hours * 60;
    } else if (duration.includes('m')) {
      durationMins = parseInt(duration.replace('m', ''));
    }
    
    // Ensure session doesn't extend beyond visible hours
    const maxPos = ((endHour - baseHour + 1) * 60); // Total visible minutes
    const endPos = startPos + durationMins;
    if (endPos > maxPos) {
      durationMins = maxPos - startPos; // Truncate to fit
    }
    
    return { top: startPos, height: Math.max(durationMins, 12) }; // Minimum 12px height
  };

  const renderMonthView = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const weeks = [];
    const currentDate = new Date(startDate);
    
    // Generate 6 weeks for full month view
    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(currentDate);
        const isCurrentMonth = dayDate.getMonth() === today.getMonth();
        const isToday = dayDate.toDateString() === today.toDateString();
        
        // Mock sessions for specific days
        const daySessions = dayDate.getDate() === 15 && isCurrentMonth ? 
          filteredSessions.slice(0, 2) : // Show 2 sessions on 15th
          dayDate.getDate() === 20 && isCurrentMonth ? 
          filteredSessions.slice(2, 4) : []; // Show 2 sessions on 20th
        
        days.push({
          date: dayDate,
          dayNumber: dayDate.getDate(),
          isCurrentMonth,
          isToday,
          sessions: daySessions
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(days);
    }

    return (
      <div className="flex h-[calc(100vh-120px)]">
        {/* Month Calendar Grid */}
        <div className="flex-1 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {today.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="text-sm text-gray-600">Monthly overview • Click days to see details</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: '650px' }}>
            {/* Month Header */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-3 bg-gray-50 text-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Month Grid */}
            <div className="flex flex-col h-full">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 flex-1 border-b border-gray-100">
                  {week.map((day, dayIndex) => (
                    <div 
                      key={dayIndex} 
                      className={`border-r border-gray-100 p-2 flex flex-col cursor-pointer hover:bg-gray-50 ${
                        !day.isCurrentMonth ? 'bg-gray-50 opacity-50' : ''
                      } ${day.isToday ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        if (day.isCurrentMonth) {
                          setViewMode('calendar'); // Switch to week view for day details
                        }
                      }}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {day.dayNumber}
                      </div>
                      
                      {/* Day Sessions */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {day.sessions.slice(0, 3).map((session, sessionIndex) => {
                          const courseStyle = courseConfig[session.course as keyof typeof courseConfig];
                          return (
                            <div
                              key={sessionIndex}
                              className="text-xs px-1 py-0.5 rounded truncate"
                              style={{
                                backgroundColor: courseStyle?.color + '20',
                                borderLeft: `2px solid ${courseStyle?.color}`
                              }}
                            >
                              {session.course}: {session.title.substring(0, 15)}...
                            </div>
                          );
                        })}
                        {day.sessions.length > 3 && (
                          <div className="text-xs text-gray-500 px-1">
                            +{day.sessions.length - 3} more
                          </div>
                        )}
                      </div>

                      {/* XP indicator for days with sessions */}
                      {day.sessions.length > 0 && (
                        <div className="text-xs text-blue-600 font-medium mt-1">
                          +{day.sessions.reduce((sum, s) => sum + s.xpReward, 0)} XP
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Month Overview Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Month Overview</h3>
          
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-700 mb-1">Total Sessions</div>
              <div className="text-2xl font-bold text-blue-900">12</div>
              <div className="text-xs text-blue-600">Across {today.toLocaleDateString('en', { month: 'long' })}</div>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-700 mb-1">Month XP Target</div>
              <div className="text-2xl font-bold text-green-900">+450</div>
              <div className="text-xs text-green-600">300 / 450 earned</div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-sm font-medium text-orange-700 mb-2">Upcoming Deadlines</div>
              <div className="space-y-2">
                <div className="text-xs">
                  <div className="font-medium text-gray-900">CS229 Project</div>
                  <div className="text-orange-600">Due in 3 days</div>
                </div>
                <div className="text-xs">
                  <div className="font-medium text-gray-900">CS224n Paper</div>
                  <div className="text-orange-600">Due in 5 days</div>
                </div>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="space-y-2">
              <Button 
                onClick={() => setViewMode('calendar')}
                className="w-full"
                variant="outline"
              >
                Switch to Week View
              </Button>
              <Button 
                onClick={() => setViewMode('stack')}
                className="w-full"
                variant="outline"
              >
                Switch to Focus Stack
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    if (!isClient) {
      return (
        <div className="flex h-[calc(100vh-120px)]">
          <div className="flex-1 p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="bg-gray-200 rounded-lg h-96"></div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleCalendarDragEnd}
      >
        <div className="p-6">
        {/* Week Header with Overview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">This Week</h2>
              <div className="text-sm text-gray-600">Drag & drop to reschedule • Auto-saves changes</div>
            </div>
            
            {/* Week Overview Stats - Inline */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{displaySessions.length}</div>
                <div className="text-xs text-blue-700">Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">+{displaySessions.reduce((sum, s) => sum + s.xpReward, 0)}</div>
                <div className="text-xs text-green-700">XP Available</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-700">{displaySessions.filter(s => s.urgency === 'urgent').length}</div>
                <div className="text-xs text-red-600">Urgent</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Calendar Grid Container */}
        <div className="h-[650px]">

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col" style={{ height: '650px' }}>
            {/* Week Header */}
            <div className="grid grid-cols-8 border-b border-gray-200 flex-shrink-0">
              <div className="p-3 bg-gray-50 text-xs font-medium text-gray-500">Time</div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className="p-3 bg-gray-50 text-center">
                  <div className="text-xs font-medium text-gray-500">{day}</div>
                  <div className={`text-lg font-semibold mt-1 ${index === 2 ? 'text-blue-600' : 'text-gray-900'}`}>
                    {13 + index}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Grid - Scrollable with bounds */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: `${timeMarkers.length * 48}px` }}>
              <SortableContext items={displaySessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-8" style={{ height: `${timeMarkers.length * 48}px` }}>
                  {/* Time Column */}
                  <div className="border-r border-gray-200">
                    {timeMarkers.map((timeStr) => {
                      const hour = parseInt(timeStr.split(':')[0]);
                      return (
                        <div key={hour} className="h-12 border-b border-gray-100 p-2 text-xs text-gray-500">
                          {timeStr}
                        </div>
                      );
                    })}
                  </div>

                  {/* Day Columns */}
                  {Array.from({ length: 7 }, (_, dayIndex) => (
                    <div key={dayIndex} className="relative border-r border-gray-200">
                      {/* Droppable Time Slots */}
                      {timeMarkers.map((timeStr, index) => (
                        <DroppableTimeSlot key={index} timeStr={timeStr} dayIndex={dayIndex}>
                          {/* Events for Today (Wed) only */}
                          {dayIndex === 2 && displaySessions.filter(session => {
                            const position = getEventPosition(session.estimatedStart, session.duration);
                            if (!position) return false;
                            // Check if this session should be rendered in this time slot
                            const sessionHour = parseInt(session.estimatedStart.split(':')[0]);
                            const slotHour = parseInt(timeStr.split(':')[0]);
                            return sessionHour === slotHour;
                          }).map((session) => {
                            const position = getEventPosition(session.estimatedStart, session.duration);
                            if (!position) return null;
                            
                            const courseStyle = courseConfig[session.course as keyof typeof courseConfig];
                            
                            return (
                              <DraggableCalendarEvent
                                key={session.id}
                                session={session}
                                position={position}
                                courseStyle={courseStyle}
                                onSelect={handleSessionSelect}
                                onGhostClick={handleGhostSessionClick}
                              />
                            );
                          })}
                        </DroppableTimeSlot>
                      ))}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>
        </div>
      </div>


        <DragOverlay>
          {activeId ? (
            <div className="bg-white shadow-lg rounded-lg border-l-4 p-4 opacity-90 border-blue-400">
              <div className="font-medium text-gray-900">
                {sessions.find(s => s.id === activeId)?.title}
              </div>
              <div className="text-sm text-gray-600">
                {sessions.find(s => s.id === activeId)?.course}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  return (
    <SharedDashboardLayout currentUser={currentUser} pageTitle="Schedule" showGamification={false}>
      <div className="bg-gray-50">
      {/* Compressed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 h-12 px-6">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-6">
            {/* Month Navigator */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-gray-900 min-w-[100px] text-center">
                {currentTime.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="ghost" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="ghost" size="sm">
              Today
            </Button>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  trackEvent('view_mode_changed', { newMode: 'calendar', previousMode: viewMode });
                  setViewMode('calendar');
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 Week
              </button>
              <button
                onClick={() => {
                  trackEvent('view_mode_changed', { newMode: 'month', previousMode: viewMode });
                  setViewMode('month');
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 Month
              </button>
              <button
                onClick={() => {
                  trackEvent('view_mode_changed', { newMode: 'stack', previousMode: viewMode });
                  setViewMode('stack');
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'stack' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🗂️ Focus Stack
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* XP & Streak Bar - Calendar & Month Views */}
            {(viewMode === 'calendar' || viewMode === 'month') && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-1.5 rounded-full border border-blue-200">
                <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
                  <span className="text-blue-600">⚡</span>
                  +{displaySessions.reduce((sum, s) => sum + s.xpReward, 0)} XP possible
                </div>
                <div className="w-px h-3 bg-blue-300" />
                <div className="flex items-center gap-1 text-xs font-medium text-purple-700">
                  <span className="text-purple-600">🔥</span>
                  streak 5d
                </div>
              </div>
            )}
            
            {/* AI Autofill - Calendar & Month Views */}
            {(viewMode === 'calendar' || viewMode === 'month') && (
              <Button 
                onClick={() => setShowAutofillDialog(true)}
                disabled={autofillLoading}
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {autofillLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-2" />
                    AI Filling...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1" />
                    AI Autofill
                  </>
                )}
              </Button>
            )}
            
            <Button variant="ghost" size="sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              Insights
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Session
            </Button>
          </div>
        </div>
      </div>

      {/* Legend & Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Course Pills - Live Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 mr-2">COURSES</span>
              {Object.entries(courseConfig).map(([course, config]) => {
                const isHidden = hiddenCourses.has(course);
                const isCompleted = getCourseCompletionStatus(course);
                
                return (
                  <button
                    key={course}
                    onClick={() => toggleCourseVisibility(course)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                      isHidden 
                        ? 'opacity-40 border-gray-300 bg-gray-100 text-gray-500' 
                        : `border-[${config.color}] text-[${config.color}] bg-[${config.color}]/15 hover:bg-[${config.color}]/25`
                    }`}
                    style={{
                      borderColor: isHidden ? '#d1d5db' : config.color,
                      backgroundColor: isHidden ? '#f3f4f6' : config.color + '15',
                      color: isHidden ? '#6b7280' : config.color
                    }}
                  >
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: isHidden ? '#9ca3af' : config.color }}
                    />
                    {course}
                    {isCompleted && <span className="text-green-600">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Urgency Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 mr-2">FILTERS</span>
              <button 
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  visibleFilters.has('urgent') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                }`}
                onClick={() => {
                  const newFilters = new Set(visibleFilters);
                  visibleFilters.has('urgent') ? newFilters.delete('urgent') : newFilters.add('urgent');
                  setVisibleFilters(newFilters);
                }}
              >
                🔴 Urgent
              </button>
              <button 
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  visibleFilters.has('due-soon') ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                }`}
                onClick={() => {
                  const newFilters = new Set(visibleFilters);
                  visibleFilters.has('due-soon') ? newFilters.delete('due-soon') : newFilters.add('due-soon');
                  setVisibleFilters(newFilters);
                }}
              >
                🟡 Due Soon
              </button>
              <button 
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  visibleFilters.has('completed') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                }`}
                onClick={() => {
                  const newFilters = new Set(visibleFilters);
                  visibleFilters.has('completed') ? newFilters.delete('completed') : newFilters.add('completed');
                  setVisibleFilters(newFilters);
                }}
              >
                🟢 Completed
              </button>
            </div>
          </div>

          {/* Compressed Hours Toggle */}
          {viewMode === 'calendar' && (
            <button
              onClick={() => {
                const newCompressed = !showCompressedHours;
                
                // Count sessions that will be hidden/shown
                const hiddenSessions = sessions.filter(session => {
                  const hour = parseInt(session.estimatedStart.split(':')[0]);
                  if (newCompressed) {
                    // Switching to core hours - count sessions outside 8-18
                    return hour < 8 || hour > 18;
                  } else {
                    // Switching to full day - count sessions that were hidden
                    return hour < 8 || hour > 18;
                  }
                });
                
                setShowCompressedHours(newCompressed);
                localStorage.setItem('preferCoreHours', newCompressed.toString());
                
                // Inform user about session visibility changes
                if (newCompressed && hiddenSessions.length > 0) {
                  toast.success(`Switched to core hours (8AM-6PM)`, {
                    description: `${hiddenSessions.length} session(s) outside core hours are now hidden`
                  });
                } else if (!newCompressed && hiddenSessions.length > 0) {
                  toast.success(`Switched to full day (12AM-11PM)`, {
                    description: `${hiddenSessions.length} additional session(s) are now visible`
                  });
                } else {
                  toast.success(newCompressed ? 'Switched to core hours (8AM-6PM)' : 'Switched to full day (12AM-11PM)');
                }
              }}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              {showCompressedHours ? 'Show full day (12AM-11PM)' : 'Show core hours (8AM-6PM)'}
            </button>
          )}
        </div>
      </div>

      {/* Active Session Countdown Bar */}
      {showCountdown && activeSession && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 border-b border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Session in Progress</span>
              </div>
              <div>
                <div className="text-lg font-semibold">{activeSession.title}</div>
                <div className="text-xs text-blue-100">{activeSession.course} • {activeSession.duration}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Progress Circle */}
              <div className="relative">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="white"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - sessionProgress / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold">{Math.round(sessionProgress)}%</span>
                </div>
              </div>
              
              {/* Time remaining */}
              <div className="text-right">
                <div className="text-sm font-medium">
                  {Math.round((100 - sessionProgress) * parseDurationToMinutes(activeSession.duration) / 100)}m left
                </div>
                <div className="text-xs text-blue-100">Focus time</div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/30"
                  onClick={() => {
                    if (window.confirm('Mark this session as complete?')) {
                      handleMarkComplete(activeSession);
                    }
                  }}
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/30"
                  onClick={() => {
                    if (window.confirm('Stop this session?')) {
                      setActiveSession(null);
                      setSessionStartTime(null);
                      setShowCountdown(false);
                      toast.info("Session stopped");
                    }
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-blue-100 mb-1">
              <span>0%</span>
              <span className="font-medium">
                {sessionStartTime && `Started ${sessionStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
              <span>100%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${sessionProgress}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Agenda View - ≤768px */}
      <div className="block md:hidden">
        <div className="bg-white">
          {/* Sticky Date Header */}
          <div className="sticky top-12 z-30 bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Today</h2>
                <div className="text-sm text-gray-600">
                  {displaySessions.length} sessions • +{displaySessions.reduce((sum, s) => sum + s.xpReward, 0)} XP
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 text-sm font-medium">🔥 5d</span>
                <Button
                  onClick={handleAIOptimize}
                  size="sm"
                  variant="outline"
                >
                  <Sparkles className="h-3 w-3" />
                  Preview
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Mobile Session List */}
          <div className="p-4 space-y-3 pb-20">
            {displaySessions.map((session, index) => {
              const courseStyle = courseConfig[session.course as keyof typeof courseConfig];
              const isNext = index === 0 && !completedSessions.has(session.id) && activeSession?.id !== session.id;
              const isActive = activeSession?.id === session.id;
              const isCompleted = completedSessions.has(session.id);

              return (
                <div
                  key={session.id}
                  onClick={() => handleMobileSessionSelect(session)}
                  className={`relative border rounded-lg p-4 transition-all active:scale-[0.98] ${
                    isActive ? 'ring-2 ring-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300' :
                    isNext ? 'ring-2 ring-blue-200 bg-blue-50 border-blue-300' :
                    isCompleted ? 'bg-green-50 border-green-200 opacity-80' :
                    'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: isActive ? '#8B5CF6' : isCompleted ? '#10b981' : courseStyle?.color
                  }}
                >
                  {/* Status badges */}
                  {isActive && (
                    <div className="absolute -top-2 -left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      ⏱️ ACTIVE
                    </div>
                  )}
                  {isNext && !isActive && (
                    <div className="absolute -top-2 -left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      NEXT
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute -top-2 -left-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      ✓ DONE
                    </div>
                  )}

                  {/* Session content */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-700">
                          {session.course}
                        </span>
                        {session.urgency === 'urgent' && <span className="text-red-600">🔴</span>}
                        {session.urgency === 'soon' && <span className="text-orange-600">🟡</span>}
                        {session.cognitiveLoad === 'high' && <span className="text-red-500 text-xs">🧠</span>}
                        {session.cognitiveLoad === 'medium' && <span className="text-orange-500 text-xs">🧠</span>}
                        {session.cognitiveLoad === 'low' && <span className="text-green-500 text-xs">🧠</span>}
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm leading-tight">
                        {session.title}
                      </h3>
                      {session.isGhost && (
                        <div className="text-xs text-blue-500 mt-1">✨ AI Suggested • Tap to add</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                        {isCompleted ? '✓' : '+'}{session.xpReward}
                      </div>
                      <div className="text-xs text-gray-500">{isCompleted ? 'Earned' : 'XP'}</div>
                    </div>
                  </div>

                  {/* Session metadata */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {session.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {session.estimatedStart}
                      </span>
                      {(session as any).dueIn && (
                        <span className="text-red-600 font-medium text-xs">
                          Due {(session as any).dueIn}
                        </span>
                      )}
                    </div>
                    
                    {/* Quick action button */}
                    {!isCompleted ? (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isActive) {
                            if (window.confirm('Stop this session?')) {
                              setActiveSession(null);
                              setSessionStartTime(null);
                              setShowCountdown(false);
                              toast.info("Session stopped");
                            }
                          } else if (session.isGhost) {
                            handleGhostSessionClick(session);
                          } else {
                            handleStartSession(session);
                          }
                        }}
                        size="sm"
                        className={`text-xs ${
                          isActive ? "bg-purple-600 hover:bg-purple-700" :
                          isNext ? "bg-green-600 hover:bg-green-700" : 
                          session.isGhost ? "bg-blue-600 hover:bg-blue-700" :
                          "bg-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Stop
                          </>
                        ) : session.isGhost ? (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            {isNext ? 'Start' : 'Begin'}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMobileSessionSelect(session);
                        }}
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50 text-xs"
                      >
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Done
                      </Button>
                    )}
                  </div>

                  {/* Progress indicator for active sessions */}
                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="flex items-center justify-between text-xs text-purple-600 mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{Math.round(sessionProgress)}%</span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-1.5">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full transition-all duration-1000"
                          style={{ width: `${sessionProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enhanced Bottom Actions */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb md:hidden">
            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowAutofillDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Quick Add
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="px-3"
                onClick={handleAIOptimize}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Active session indicator */}
            {activeSession && (
              <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-purple-600 rounded-full animate-pulse" />
                    <span className="font-medium text-purple-700">{activeSession.title}</span>
                  </div>
                  <span className="text-purple-600 font-medium">{Math.round(sessionProgress)}%</span>
                </div>
                <div className="mt-1 w-full bg-purple-200 rounded-full h-1">
                  <div
                    className="bg-purple-600 h-1 rounded-full transition-all duration-1000"
                    style={{ width: `${sessionProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Views - ≥768px */}
      <div className="hidden md:block">
      {/* Conditional View Rendering */}
      {viewMode === 'calendar' ? renderCalendarView() : 
       viewMode === 'month' ? renderMonthView() : (
      <div className="flex h-[calc(100vh-48px)]">
        {/* Focus Stack - Left 60% */}
        <div className="flex-1 max-w-[60%] p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Today's Focus Stack</h2>
                <div className="text-sm text-gray-600 mt-1">
                  Tackle from top to bottom for optimal energy usage
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500 text-right">
                  AI-prioritized by cognitive load & deadlines
                </div>
                <Button
                  onClick={handleAIOptimize}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Preview
                  </>
                </Button>
              </div>
            </div>
          </div>

          {/* Session Stack - DnD Enabled */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={displaySessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3 overflow-y-auto scroll-smooth">
                {displaySessions.map((session, index) => {
                  const courseStyle = courseConfig[session.course as keyof typeof courseConfig];
                  const isNext = index === 0;
                  
                  return (
                    <SortableSessionCard
                      key={session.id}
                      session={session}
                      index={index}
                      isNext={isNext && !completedSessions.has(session.id) && activeSession?.id !== session.id}
                      courseStyle={courseStyle}
                      onSelect={handleSessionSelect}
                      onStart={handleStartSession}
                      onStop={handleStopSession}
                      getCognitiveLoadColor={getCognitiveLoadColor}
                      getUrgencyIcon={getUrgencyIcon}
                      isCompleted={completedSessions.has(session.id)}
                      isActive={activeSession?.id === session.id}
                    />
                  );
                })}
              </div>
            </SortableContext>
            
            <DragOverlay>
              {activeId ? (
                <div className="bg-white shadow-lg rounded-lg border-l-4 p-4 opacity-90">
                  <div className="font-medium text-gray-900">
                    {sessions.find(s => s.id === activeId)?.title}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Timeline Rail - 5% */}
        <div className="w-10 bg-white border-x border-gray-200 flex flex-col items-center py-6">
          <div className="text-xs text-gray-500 mb-4 -rotate-90 whitespace-nowrap">
            NOW
          </div>
          
          {timeMarkers.map((time) => (
            <div key={time} className="relative h-12 flex items-center">
              <div className={`w-2 h-px ${time === currentTimeStr ? 'bg-red-500' : 'bg-gray-200'}`} />
              {time === currentTimeStr && (
                <div className="absolute -left-1 w-1 h-1 bg-red-500 rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* Context Panel - Right 35% */}
        {showContextPanel && selectedSession && (
          <div className="w-[35%] bg-white border-l border-gray-200 shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: courseConfig[selectedSession.course as keyof typeof courseConfig]?.color }}
                  />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedSession.course}
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowContextPanel(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {[
                { id: 'deadlines', label: 'Details' },
                { id: 'insights', label: 'Insights' },
                { id: 'quickadd', label: 'Reschedule' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === id 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'deadlines' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {selectedSession.title}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duration: {selectedSession.duration}
                      </div>
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Cognitive Load: {selectedSession.cognitiveLoad}
                      </div>
                      {selectedSession.dueIn && (
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Due in {selectedSession.dueIn}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 mb-1">
                      +{selectedSession.xpReward} XP
                    </div>
                    <div className="text-sm text-blue-700">
                      Complete this session to earn experience points
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full" onClick={() => handleStartSession(selectedSession)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Focus Session
                    </Button>
                    <Button className="w-full" variant="outline">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Session Insights</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm font-medium text-purple-700 mb-1">
                        Optimal Focus Window
                      </div>
                      <div className="text-xs text-purple-600">
                        Best tackled during 9-11 AM peak hours
                      </div>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-700 mb-1">
                        Study Strategy
                      </div>
                      <div className="text-xs text-green-600">
                        Use Pomodoro technique for {selectedSession.cognitiveLoad} focus tasks
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'quickadd' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Reschedule Session</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">
                        Estimated Start Time
                      </label>
                      <input 
                        type="time" 
                        defaultValue={selectedSession.estimatedStart}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        Move Earlier
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Move Later
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
      </div>

      {/* Session Details Drawer - 320px right slide-in */}
      {drawerOpen && drawerSession && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20"
            onClick={() => setDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute right-0 inset-y-0 w-80 bg-white shadow-xl border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: courseConfig[drawerSession.course as keyof typeof courseConfig]?.color }}
                />
                <h2 className="font-semibold text-gray-900">{drawerSession.course}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {[
                { id: 'details', label: 'Details', icon: <Target className="h-3 w-3" /> },
                { id: 'notes', label: 'Notes', icon: <FileText className="h-3 w-3" /> },
                { id: 'history', label: 'History', icon: <History className="h-3 w-3" /> }
              ].map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setDrawerTab(id as any)}
                  className={`flex-1 flex items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                    drawerTab === id 
                      ? 'text-blue-600 bg-white border-b-2 border-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {drawerTab === 'details' && (
                <div className="space-y-4">
                  {/* Completion Status */}
                  {completedSessions.has(drawerSession.id) && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Session Completed!</span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        You earned +{drawerSession.xpReward} XP
                      </div>
                    </div>
                  )}

                  {/* Session Title */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {drawerSession.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getCognitiveLoadColor(drawerSession.cognitiveLoad)}>
                        {drawerSession.cognitiveLoad} focus
                      </Badge>
                      {drawerSession.urgency === 'urgent' && (
                        <Badge className="bg-red-100 text-red-700">
                          🔴 Urgent
                        </Badge>
                      )}
                      {drawerSession.urgency === 'soon' && (
                        <Badge className="bg-orange-100 text-orange-700">
                          🟡 Due Soon
                        </Badge>
                      )}
                      {drawerSession.dueIn && (
                        <Badge className="bg-orange-100 text-orange-700">
                          Due in {drawerSession.dueIn}
                        </Badge>
                      )}
                      {drawerSession.type && (
                        <Badge className="bg-purple-100 text-purple-700">
                          {drawerSession.type}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Session Progress */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Session Progress</span>
                      <span className="text-xs text-gray-500">
                        {completedSessions.has(drawerSession.id) ? '100%' : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: completedSessions.has(drawerSession.id) ? '100%' : '0%' 
                        }}
                      />
                    </div>
                  </div>

                  {/* XP Reward */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-blue-700">XP Reward</div>
                        <div className="text-xs text-blue-600">Complete to earn points</div>
                      </div>
                      <div className="text-xl font-bold text-blue-900">
                        +{drawerSession.xpReward}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Session Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-gray-900">{drawerSession.duration}</div>
                      <div className="text-xs text-gray-500">Duration</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Target className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-gray-900">{drawerSession.estimatedStart}</div>
                      <div className="text-xs text-gray-500">Start Time</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Brain className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-gray-900 capitalize">{drawerSession.cognitiveLoad}</div>
                      <div className="text-xs text-gray-500">Cognitive Load</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Zap className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-gray-900 capitalize">{drawerSession.urgency}</div>
                      <div className="text-xs text-gray-500">Priority</div>
                    </div>
                  </div>

                  {/* Session Description */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-700 mb-1">Session Goals</div>
                    <div className="text-xs text-blue-600">
                      {drawerSession.type === 'assignment' && 'Complete assignment requirements and submit on time'}
                      {drawerSession.type === 'study' && 'Review material and practice key concepts'}
                      {drawerSession.type === 'meeting' && 'Attend meeting and take notes on key points'}
                      {drawerSession.type === 'lab' && 'Complete lab exercises and submit results'}
                    </div>
                  </div>

                  {/* Reschedule Slider */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-2 block">
                      Reschedule to:
                    </label>
                    <div className="space-y-2">
                      <Slider
                        value={rescheduleTime}
                        onValueChange={setRescheduleTime}
                        min={6}
                        max={22}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-gray-600">
                        {Math.floor(rescheduleTime[0])}:{((rescheduleTime[0] % 1) * 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Quick Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Move Up
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        Move Down
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs"
                        onClick={() => {
                          const newTime = calculateNewStartTime(0); // Move to top
                          const updatedSessions = [...sessions];
                          const sessionIndex = updatedSessions.findIndex(s => s.id === drawerSession.id);
                          if (sessionIndex >= 0) {
                            updatedSessions[sessionIndex].estimatedStart = newTime;
                            safeSetSessions(updatedSessions);
                            toast.success("Moved to earlier time");
                          }
                        }}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Earlier
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs"
                        onClick={() => {
                          const newTime = calculateNewStartTime(sessions.length); // Move to end
                          const updatedSessions = [...sessions];
                          const sessionIndex = updatedSessions.findIndex(s => s.id === drawerSession.id);
                          if (sessionIndex >= 0) {
                            updatedSessions[sessionIndex].estimatedStart = newTime;
                            safeSetSessions(updatedSessions);
                            toast.success("Moved to later time");
                          }
                        }}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Later
                      </Button>
                    </div>
                  </div>

                  {/* Primary Actions */}
                  <div className="space-y-2 pt-4">
                    {!completedSessions.has(drawerSession.id) ? (
                      <>
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700" 
                          onClick={() => handleMarkComplete(drawerSession)}
                          disabled={markingComplete}
                        >
                          {markingComplete ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Mark Done (+{drawerSession.xpReward} XP)
                            </>
                          )}
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => handleStartSession(drawerSession)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Focus Session
                        </Button>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <CheckSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-green-700">Session Complete!</div>
                        <div className="text-xs text-green-600">XP has been awarded</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'notes' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-2 block">
                      Session Notes
                    </label>
                    <Textarea
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder="Add notes about this session..."
                      className="min-h-32"
                    />
                  </div>
                  <Button className="w-full" variant="outline">
                    Save Notes
                  </Button>
                </div>
              )}

              {drawerTab === 'history' && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">Recent activity for this session:</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                      Created 2 hours ago
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="h-1.5 w-1.5 bg-orange-500 rounded-full" />
                      Rescheduled 1 hour ago
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                      AI optimized priority
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {mobileBottomSheet && mobileSelectedSession && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileBottomSheet(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="h-4 w-4 rounded-full" 
                  style={{ backgroundColor: courseConfig[mobileSelectedSession.course as keyof typeof courseConfig]?.color }}
                />
                <div>
                  <h2 className="font-semibold text-gray-900">{mobileSelectedSession.course}</h2>
                  <div className="text-sm text-gray-600">{mobileSelectedSession.type}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMobileBottomSheet(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setMobileSheetTab('details')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  mobileSheetTab === 'details' 
                    ? 'text-blue-600 bg-white border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setMobileSheetTab('actions')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  mobileSheetTab === 'actions' 
                    ? 'text-blue-600 bg-white border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Actions
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {mobileSheetTab === 'details' && (
                <div className="space-y-4">
                  {/* Session title and status */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {mobileSelectedSession.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getCognitiveLoadColor(mobileSelectedSession.cognitiveLoad)}>
                        {mobileSelectedSession.cognitiveLoad} focus
                      </Badge>
                      {mobileSelectedSession.urgency === 'urgent' && (
                        <Badge className="bg-red-100 text-red-700">🔴 Urgent</Badge>
                      )}
                      {mobileSelectedSession.urgency === 'soon' && (
                        <Badge className="bg-orange-100 text-orange-700">🟡 Due Soon</Badge>
                      )}
                      {mobileSelectedSession.dueIn && (
                        <Badge className="bg-orange-100 text-orange-700">
                          Due in {mobileSelectedSession.dueIn}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* XP Reward */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-blue-700">XP Reward</div>
                        <div className="text-xs text-blue-600">Complete to earn points</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">
                        +{mobileSelectedSession.xpReward}
                      </div>
                    </div>
                  </div>

                  {/* Session stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                      <div className="text-sm font-medium text-gray-900">{mobileSelectedSession.duration}</div>
                      <div className="text-xs text-gray-500">Duration</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Target className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                      <div className="text-sm font-medium text-gray-900">{mobileSelectedSession.estimatedStart}</div>
                      <div className="text-xs text-gray-500">Start Time</div>
                    </div>
                  </div>

                  {/* Session goals */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-700 mb-1">Session Goals</div>
                    <div className="text-xs text-blue-600">
                      {mobileSelectedSession.type === 'assignment' && 'Complete assignment requirements and submit on time'}
                      {mobileSelectedSession.type === 'study' && 'Review material and practice key concepts'}
                      {mobileSelectedSession.type === 'meeting' && 'Attend meeting and take notes on key points'}
                      {mobileSelectedSession.type === 'lab' && 'Complete lab exercises and submit results'}
                    </div>
                  </div>
                </div>
              )}

              {mobileSheetTab === 'actions' && (
                <div className="space-y-4">
                  {/* Primary actions */}
                  <div className="space-y-3">
                    {!completedSessions.has(mobileSelectedSession.id) ? (
                      <>
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700 text-base py-3" 
                          onClick={() => {
                            handleMarkComplete(mobileSelectedSession);
                            setMobileBottomSheet(false);
                          }}
                          disabled={markingComplete}
                        >
                          {markingComplete ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckSquare className="h-5 w-5 mr-2" />
                              Mark Done (+{mobileSelectedSession.xpReward} XP)
                            </>
                          )}
                        </Button>
                        <Button 
                          className="w-full text-base py-3" 
                          variant="outline"
                          onClick={() => {
                            handleStartSession(mobileSelectedSession);
                            setMobileBottomSheet(false);
                          }}
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Start Focus Session
                        </Button>
                      </>
                    ) : (
                      <div className="text-center p-6">
                        <CheckSquare className="h-12 w-12 text-green-600 mx-auto mb-3" />
                        <div className="text-lg font-medium text-green-700 mb-1">Session Complete!</div>
                        <div className="text-sm text-green-600">You earned +{mobileSelectedSession.xpReward} XP</div>
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-3">Quick Actions</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-sm"
                        onClick={() => {
                          const newTime = calculateNewStartTime(0);
                          const updatedSessions = [...sessions];
                          const sessionIndex = updatedSessions.findIndex(s => s.id === mobileSelectedSession.id);
                          if (sessionIndex >= 0) {
                            updatedSessions[sessionIndex].estimatedStart = newTime;
                            safeSetSessions(updatedSessions);
                            toast.success("Moved to earlier time");
                            setMobileBottomSheet(false);
                          }
                        }}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Move Earlier
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-sm"
                        onClick={() => {
                          const newTime = calculateNewStartTime(sessions.length);
                          const updatedSessions = [...sessions];
                          const sessionIndex = updatedSessions.findIndex(s => s.id === mobileSelectedSession.id);
                          if (sessionIndex >= 0) {
                            updatedSessions[sessionIndex].estimatedStart = newTime;
                            safeSetSessions(updatedSessions);
                            toast.success("Moved to later time");
                            setMobileBottomSheet(false);
                          }
                        }}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Move Later
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Optimize Preview Dialog */}
      <Dialog open={showOptimizePreview} onOpenChange={setShowOptimizePreview}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Optimization Preview
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Optimization Metrics */}
            {optimizationMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-medium text-blue-700 mb-1">Urgent Tasks First</div>
                  <div className={`text-lg font-bold ${optimizationMetrics.urgentTasksFirst >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {optimizationMetrics.urgentTasksFirst >= 0 ? '+' : ''}{optimizationMetrics.urgentTasksFirst}%
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs font-medium text-green-700 mb-1">Cognitive Balance</div>
                  <div className={`text-lg font-bold ${optimizationMetrics.cognitiveLoadBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {optimizationMetrics.cognitiveLoadBalance >= 0 ? '+' : ''}{Math.round(optimizationMetrics.cognitiveLoadBalance)}%
                  </div>
                </div>
                
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-xs font-medium text-orange-700 mb-1">Deadline Alignment</div>
                  <div className={`text-lg font-bold ${optimizationMetrics.deadlineAlignment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {optimizationMetrics.deadlineAlignment >= 0 ? '+' : ''}{Math.round(optimizationMetrics.deadlineAlignment)}%
                  </div>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-xs font-medium text-purple-700 mb-1">Overall Score</div>
                  <div className={`text-lg font-bold ${optimizationMetrics.overallScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {optimizationMetrics.overallScore >= 0 ? '+' : ''}{Math.round(optimizationMetrics.overallScore)}%
                  </div>
                </div>
              </div>
            )}

            {/* Before/After Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Order */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Order</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {sessions.map((session, index) => (
                    <div key={session.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-500">#{index + 1}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{session.title}</div>
                        <div className="text-xs text-gray-600">{session.course} • {session.duration}</div>
                      </div>
                      <div className="flex gap-1">
                        {session.urgency === 'urgent' && <span className="text-red-600 text-xs">🔴</span>}
                        {session.urgency === 'soon' && <span className="text-orange-600 text-xs">🟡</span>}
                        {session.cognitiveLoad === 'high' && <span className="text-red-500 text-xs">🧠</span>}
                        {session.cognitiveLoad === 'medium' && <span className="text-orange-500 text-xs">🧠</span>}
                        {session.cognitiveLoad === 'low' && <span className="text-green-500 text-xs">🧠</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optimized Order */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Optimized Order</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {optimizedSessions.map((session, index) => {
                    const originalIndex = sessions.findIndex(s => s.id === session.id);
                    const moved = originalIndex !== index;
                    
                    return (
                      <div key={session.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                        moved ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                      }`}>
                        <div className="text-sm font-medium text-gray-500">#{index + 1}</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{session.title}</div>
                          <div className="text-xs text-gray-600">{session.course} • {session.duration}</div>
                          {moved && (
                            <div className="text-xs text-green-600 font-medium">
                              Moved from position {originalIndex + 1} → {index + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {session.urgency === 'urgent' && <span className="text-red-600 text-xs">🔴</span>}
                          {session.urgency === 'soon' && <span className="text-orange-600 text-xs">🟡</span>}
                          {session.cognitiveLoad === 'high' && <span className="text-red-500 text-xs">🧠</span>}
                          {session.cognitiveLoad === 'medium' && <span className="text-orange-500 text-xs">🧠</span>}
                          {session.cognitiveLoad === 'low' && <span className="text-green-500 text-xs">🧠</span>}
                          {moved && <ArrowRight className="h-3 w-3 text-green-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-700 mb-2">🤖 AI Optimization Logic</div>
              <div className="text-xs text-blue-600 space-y-1">
                <div>• Prioritized urgent tasks with deadlines to the top</div>
                <div>• Grouped high cognitive load sessions in the morning (peak focus hours)</div>
                <div>• Arranged sessions to minimize context switching between courses</div>
                <div>• Balanced workload distribution throughout the day</div>
                <div>• Optimized for energy levels and deadline proximity</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setShowOptimizePreview(false)}
                variant="outline" 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={applyOptimization}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Apply Optimization (+{Math.round(optimizationMetrics?.overallScore || 0)}% efficiency)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Autofill Dialog */}
      <Dialog open={showAutofillDialog} onOpenChange={setShowAutofillDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-600" />
              AI Autofill Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-600">
              Pick an assignment and AI will create optimized study blocks in your free time slots.
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Assignment to break down:
              </label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an assignment..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Neural Networks Project">CS229: Neural Networks Project</SelectItem>
                  <SelectItem value="Algorithm Analysis">CS161: Algorithm Analysis</SelectItem>
                  <SelectItem value="NLP Paper Review">CS224n: NLP Paper Review</SelectItem>
                  <SelectItem value="Computer Vision Lab">CS231n: Computer Vision Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs font-medium text-purple-700 mb-1">
                AI will create:
              </div>
              <div className="text-xs text-purple-600 space-y-1">
                <div>• Research phase (1-1.5h blocks)</div>
                <div>• Implementation phase (focus blocks)</div>
                <div>• Review & polish (shorter sessions)</div>
                <div>• Optimal timing based on your energy levels</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => setShowAutofillDialog(false)}
                variant="outline" 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAIAutofill}
                disabled={!selectedAssignment || autofillLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Create Study Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </SharedDashboardLayout>
  );
}
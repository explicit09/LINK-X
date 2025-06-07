'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useStudyTime } from '@/hooks/useStudyTime';
import { useUserCourses } from '@/hooks/course/useCourseData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Pause, 
  Clock, 
  BookOpen, 
  Trophy,
  Sparkles,
  Target,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StudySessionTrackerProps {
  className?: string;
  courseId?: string;
  compact?: boolean;
}

export function StudySessionTracker({ 
  className, 
  courseId,
  compact = false 
}: StudySessionTrackerProps) {
  const { 
    activeSession, 
    startSession, 
    endSession,
    isLoading,
    weeklyStudyHours,
    avgSessionLength
  } = useStudyTime('week');
  
  const { courses } = useUserCourses();
  
  const [sessionTimer, setSessionTimer] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [sessionRating, setSessionRating] = useState({
    focusScore: 7,
    effectiveness: 4,
    notes: ''
  });
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || '');
  const [sessionTitle, setSessionTitle] = useState('');

  // Timer effect
  useEffect(() => {
    if (!activeSession) {
      setSessionTimer(0);
      return;
    }

    const startTime = new Date(activeSession.started_at).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // seconds
      setSessionTimer(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async () => {
    const title = sessionTitle || 'Study Session';
    const success = await startSession(title, selectedCourseId || undefined);
    
    if (success) {
      setSessionTitle('');
    }
  };

  const handleEndSession = () => {
    if (sessionTimer < 60) { // Less than 1 minute
      toast.warning('Study for at least 1 minute to save your session');
      return;
    }
    setShowEndDialog(true);
  };

  const confirmEndSession = async () => {
    const success = await endSession({
      focus_score: sessionRating.focusScore,
      effectiveness_rating: sessionRating.effectiveness,
      notes: sessionRating.notes
    });
    
    if (success) {
      setShowEndDialog(false);
      setSessionRating({ focusScore: 7, effectiveness: 4, notes: '' });
    }
  };

  // Compact view for header/sidebar
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {activeSession ? (
          <>
            <Badge variant="default" className="animate-pulse">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(sessionTimer)}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEndSession}
              className="h-7 px-2"
            >
              <Pause className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartSession}
            className="h-7 px-2"
          >
            <Play className="h-3 w-3 mr-1" />
            Study
          </Button>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <>
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Study Session
            </span>
            {activeSession && (
              <Badge variant="default" className="animate-pulse text-lg px-3">
                {formatTime(sessionTimer)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activeSession ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-title">Session Title (optional)</Label>
                <input
                  id="session-title"
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Chapter 5 Review"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                />
              </div>
              
              {courses && courses.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="course-select">Course (optional)</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger id="course-select">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific course</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button
                onClick={handleStartSession}
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Study Session
              </Button>
              
              <div className="grid grid-cols-2 gap-4 pt-2 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-xl font-semibold">{weeklyStudyHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Session</p>
                  <p className="text-xl font-semibold">{avgSessionLength}m</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-1">
                  {activeSession.title}
                </p>
                <p className="text-3xl font-bold font-mono">
                  {formatTime(sessionTimer)}
                </p>
              </div>
              
              <Button
                onClick={handleEndSession}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Pause className="h-4 w-4 mr-2" />
                End Session
              </Button>
              
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Earning XP while you study!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How was your study session?</DialogTitle>
            <DialogDescription>
              Rate your session to help us personalize your learning experience.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Focus Level ({sessionRating.focusScore}/10)
              </Label>
              <Slider
                value={[sessionRating.focusScore]}
                onValueChange={([value]) => 
                  setSessionRating(prev => ({ ...prev, focusScore: value }))
                }
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Effectiveness Rating
              </Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => 
                      setSessionRating(prev => ({ ...prev, effectiveness: rating }))
                    }
                    className={cn(
                      "p-2 rounded transition-colors",
                      sessionRating.effectiveness >= rating
                        ? "text-yellow-500"
                        : "text-gray-300"
                    )}
                  >
                    <Star 
                      className="h-6 w-6" 
                      fill={sessionRating.effectiveness >= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="What did you work on? Any challenges?"
                value={sessionRating.notes}
                onChange={(e) => 
                  setSessionRating(prev => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Trophy className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">
                  You'll earn up to {Math.min(Math.floor(sessionTimer / 60), 120)} XP
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on {Math.floor(sessionTimer / 60)} minutes of study
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEndSession}>
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
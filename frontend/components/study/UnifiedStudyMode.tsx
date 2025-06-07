'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudyTime } from '@/hooks/useStudyTime';
import { useUserCourses } from '@/hooks/course/useCourseData';
import { 
  Focus, 
  Timer, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Star,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedStudyModeProps {
  className?: string;
  courseId?: string;
  courseTitle?: string;
}

export function UnifiedStudyMode({ className, courseId, courseTitle }: UnifiedStudyModeProps) {
  const { 
    activeSession, 
    startSession, 
    endSession,
    isLoading,
    weeklyStudyHours
  } = useStudyTime('week');
  
  const { courses } = useUserCourses();
  
  // Study session state
  const [isActive, setIsActive] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || '');
  
  // Pomodoro state
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // End session dialog state
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [focusScore, setFocusScore] = useState([7]);
  const [effectivenessRating, setEffectivenessRating] = useState(4);
  const [sessionNotes, setSessionNotes] = useState('');

  // Session timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeSession && isActive) {
      interval = setInterval(() => {
        const startTime = new Date(activeSession.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setSessionTimer(elapsed);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [activeSession, isActive]);

  // Pomodoro timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPomodoroRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(time => time - 1);
      }, 1000);
    } else if (pomodoroTime === 0 && isPomodoroRunning) {
      setIsPomodoroRunning(false);
      if (soundEnabled) {
        // Play completion sound
        toast.success('Pomodoro session complete! Take a 5-minute break.');
      }
      // Reset to 25 minutes
      setPomodoroTime(25 * 60);
    }

    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroTime, soundEnabled]);

  // Restore active session on mount
  useEffect(() => {
    if (activeSession) {
      setIsActive(true);
    }
  }, [activeSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async () => {
    // Prevent duplicate sessions
    if (activeSession) {
      toast.info('You already have an active study session!');
      setIsActive(true);
      return;
    }
    
    const courseName = courseTitle || courses.find(c => c.id === selectedCourseId)?.title;
    const title = courseName ? `Studying: ${courseName}` : 'Study Session';
    
    const success = await startSession(title, courseId || selectedCourseId || undefined);
    if (success) {
      setIsActive(true);
      setSessionTimer(0);
      // Auto-start pomodoro when starting a session
      setIsPomodoroRunning(true);
    }
  };

  const handleEndSession = () => {
    setShowEndDialog(true);
    setIsPomodoroRunning(false); // Pause pomodoro when ending
  };

  const confirmEndSession = async () => {
    const success = await endSession({
      focus_score: focusScore[0],
      effectiveness_rating: effectivenessRating,
      notes: sessionNotes
    });
    
    if (success) {
      setIsActive(false);
      setShowEndDialog(false);
      setSessionTimer(0);
      resetPomodoro();
      // Reset form
      setFocusScore([7]);
      setEffectivenessRating(4);
      setSessionNotes('');
    }
  };

  const resetPomodoro = () => {
    setIsPomodoroRunning(false);
    setPomodoroTime(25 * 60);
  };

  const togglePomodoro = () => {
    setIsPomodoroRunning(!isPomodoroRunning);
  };

  // Floating button when not active
  if (!isActive) {
    // Show different states based on active session
    if (activeSession) {
      // Active session exists - show timer and resume button
      return (
        <div className={cn(
          "fixed bottom-6 right-6 z-50",
          className
        )}>
          <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Study session active</p>
                <p className="text-sm font-mono font-bold">{formatTime(sessionTimer)}</p>
              </div>
            </div>
            <Button
              onClick={() => setIsActive(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              size="sm"
            >
              <Focus className="mr-1 h-4 w-4" />
              Resume
            </Button>
          </div>
        </div>
      );
    }
    
    // No active session - show start button
    return (
      <Button
        onClick={handleStartSession}
        className={cn(
          "fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl transition-all",
          "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
          className
        )}
        size="lg"
        disabled={isLoading}
      >
        <Focus className="mr-2 h-5 w-5" />
        Start Studying
      </Button>
    );
  }

  // Full screen focus mode when active
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4 p-8 relative">
          {/* Close Button (minimize, not end) */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setIsActive(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Content */}
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Study Mode Active
              </h2>
              <p className="text-muted-foreground">
                Focus on your learning. You've got this! 💪
              </p>
            </div>

            {/* Session Info */}
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <p className="text-muted-foreground">Session Time</p>
                <p className="text-2xl font-mono font-bold">{formatTime(sessionTimer)}</p>
              </div>
              <div className="border-l pl-8">
                <p className="text-muted-foreground">Weekly Total</p>
                <p className="text-2xl font-bold">{weeklyStudyHours.toFixed(1)}h</p>
              </div>
            </div>

            {/* Pomodoro Timer */}
            <div className="space-y-4 py-4 border-y">
              <div className="text-5xl font-mono font-bold text-primary">
                {formatTime(pomodoroTime)}
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePomodoro}
                >
                  {isPomodoroRunning ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetPomodoro}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {isPomodoroRunning ? 'Focus time running...' : 'Click play to start focus timer'}
              </p>
            </div>

            {/* Course Selection or Display */}
            {courseId && courseTitle ? (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">Studying for:</p>
                <p className="font-semibold text-blue-900">{courseTitle}</p>
              </div>
            ) : !courseId && courses.length > 0 && (
              <div className="space-y-2">
                <Label>Studying for:</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="General Study Session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">General Study Session</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tips */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 text-sm text-left">
              <p className="font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Study Tips:
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Take a 5-minute break every 25 minutes</li>
                <li>• Keep water nearby to stay hydrated</li>
                <li>• Write down distracting thoughts for later</li>
                <li>• Reward yourself after completing sessions</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setIsActive(false)}
                className="min-w-[120px]"
              >
                Minimize
              </Button>
              <Button
                onClick={handleEndSession}
                className="min-w-[120px] bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                End Session
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Great Job! Rate Your Session
            </DialogTitle>
            <DialogDescription>
              You studied for {formatTime(sessionTimer)}. How did it go?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Focus Score */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>How focused were you?</span>
                <span className="text-2xl font-bold text-primary">{focusScore[0]}/10</span>
              </Label>
              <Slider
                value={focusScore}
                onValueChange={setFocusScore}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Distracted</span>
                <span>Laser-focused</span>
              </div>
            </div>

            {/* Effectiveness Rating */}
            <div className="space-y-2">
              <Label>How effective was this session?</Label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={effectivenessRating === rating ? "default" : "outline"}
                    size="icon"
                    onClick={() => setEffectivenessRating(rating)}
                  >
                    <Star className={cn(
                      "h-4 w-4",
                      effectivenessRating >= rating && "fill-current"
                    )} />
                  </Button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Session notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="What did you work on? Any thoughts?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* XP Preview */}
            <div className="text-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
              <p className="text-sm text-muted-foreground">You'll earn approximately</p>
              <p className="text-2xl font-bold text-orange-600">
                +{Math.max(5, Math.floor(sessionTimer / 60 / 30) * 5)} XP
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEndSession} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              Complete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
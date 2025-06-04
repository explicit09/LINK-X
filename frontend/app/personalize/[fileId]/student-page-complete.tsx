'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StudentPersonalizationView } from './components/StudentPersonalizationView';
import { StudentContentDisplay } from './components/StudentContentDisplay';
import { StudentErrorFallback } from './components/StudentErrorFallback';
import { InteractiveControls } from './components/InteractiveControls';
import { GamificationPanel } from './components/GamificationPanel';
import { useAuthUser } from '@/hooks/useAuthUser';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from 'react-error-boundary';

interface Section {
  id: string;
  title: string;
  content: string;
  isComplete: boolean;
  isActive: boolean;
}

function StudentPersonalizationPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  
  const fileId = params.fileId as string;
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Gamification state
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [showGamification, setShowGamification] = useState(false);
  
  // Interactive controls state
  const [streamSpeed, setStreamSpeed] = useState(1);
  const [explanationStyle, setExplanationStyle] = useState('simple');

  // Fetch file info
  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/v2/files/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch file info');
        
        const data = await response.json();
        setFileInfo(data);

        // Initialize sections from outline
        if (data.outline?.sections) {
          setSections(data.outline.sections.map((section: any, index: number) => ({
            id: `section-${index}`,
            title: section.title || `Section ${index + 1}`,
            content: '',
            isComplete: false,
            isActive: false
          })));
        }
      } catch (error) {
        console.error('Error fetching file:', error);
        toast.error('Failed to load file information');
      }
    };

    if (fileId) {
      fetchFileInfo();
    }
  }, [fileId]);

  // Load gamification data
  useEffect(() => {
    // In a real app, load from user profile
    const savedData = localStorage.getItem('gamification_data');
    if (savedData) {
      const data = JSON.parse(savedData);
      setPoints(data.points || 0);
      setLevel(data.level || 1);
      setStreak(data.streak || 0);
    }
  }, []);

  const startPersonalization = useCallback(() => {
    if (!user) {
      toast.error('Please log in to continue');
      return;
    }

    setIsStreaming(true);
    setCurrentSection(0);
    setShowGamification(true);
    
    // Update first section as active
    setSections(prev => prev.map((section, index) => ({
      ...section,
      isActive: index === 0
    })));

    const token = localStorage.getItem('access_token');
    const eventSourceUrl = `/api/v2/personalization/stream/${fileId}?token=${encodeURIComponent(token || '')}&style=${explanationStyle}&speed=${streamSpeed}`;
    
    const es = new EventSource(eventSourceUrl);
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'section':
            setSections(prev => {
              const newSections = [...prev];
              const sectionIndex = data.sectionIndex;
              
              if (newSections[sectionIndex]) {
                newSections[sectionIndex] = {
                  ...newSections[sectionIndex],
                  content: data.content,
                  isComplete: true,
                  isActive: false
                };
                
                // Activate next section if exists
                if (sectionIndex + 1 < newSections.length) {
                  newSections[sectionIndex + 1].isActive = true;
                  setCurrentSection(sectionIndex + 1);
                }
              }
              
              return newSections;
            });
            
            // Award points for completing section
            setPoints(prev => {
              const newPoints = prev + 10;
              // Check for level up
              if (newPoints >= (level * 100)) {
                setLevel(l => l + 1);
              }
              return newPoints;
            });
            
            // Update progress
            const completedSections = sections.filter(s => s.isComplete).length + 1;
            setProgress((completedSections / sections.length) * 100);
            break;
            
          case 'complete':
            setIsStreaming(false);
            setProgress(100);
            toast.success('Your personalized study guide is ready!');
            
            // Save gamification progress
            localStorage.setItem('gamification_data', JSON.stringify({
              points,
              level,
              streak: streak + 1
            }));
            
            es.close();
            break;
            
          case 'error':
            toast.error('Something went wrong. Please try again.');
            setIsStreaming(false);
            es.close();
            break;
        }
      } catch (error) {
        console.error('Error processing stream:', error);
      }
    };

    es.onerror = () => {
      toast.error('Connection lost. Please refresh and try again.');
      setIsStreaming(false);
      es.close();
    };

    setEventSource(es);
  }, [fileId, user, sections.length, explanationStyle, streamSpeed, points, level, streak]);

  const pauseStreaming = () => {
    setIsPaused(true);
    eventSource?.close();
  };

  const resumeStreaming = () => {
    setIsPaused(false);
    // Restart from current section
    startPersonalization();
  };

  const skipSection = () => {
    if (currentSection < sections.length - 1) {
      setSections(prev => {
        const newSections = [...prev];
        newSections[currentSection].isActive = false;
        newSections[currentSection].isComplete = true;
        newSections[currentSection + 1].isActive = true;
        return newSections;
      });
      setCurrentSection(prev => prev + 1);
    }
  };

  const regenerateSection = async (sectionId: string) => {
    const sectionIndex = parseInt(sectionId.split('-')[1]);
    
    setSections(prev => prev.map((section, index) => ({
      ...section,
      isActive: index === sectionIndex,
      isComplete: index === sectionIndex ? false : section.isComplete
    })));

    // Trigger regeneration through API
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v2/personalization/regenerate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId,
          sectionIndex,
          sectionTitle: sections[sectionIndex].title
        })
      });

      const data = await response.json();
      
      setSections(prev => prev.map((section, index) => ({
        ...section,
        content: index === sectionIndex ? data.content : section.content,
        isComplete: index === sectionIndex ? true : section.isComplete,
        isActive: false
      })));

      toast.success('Section regenerated!');
    } catch (error) {
      toast.error('Failed to regenerate section');
    }
  };

  const bookmarkSection = (sectionId: string) => {
    // In a real app, this would save to user's bookmarks
    console.log('Bookmarking section:', sectionId);
  };

  const handlePlayPause = () => {
    if (isStreaming) {
      if (isPaused) {
        resumeStreaming();
      } else {
        pauseStreaming();
      }
    } else {
      startPersonalization();
    }
  };

  if (authLoading || !fileInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Getting everything ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Simple Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Course
            </Button>
            
            <h1 className="text-xl font-semibold text-gray-900">
              Study Helper
            </h1>
            
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome/Progress View */}
            <StudentPersonalizationView
              fileId={fileId}
              fileName={fileInfo?.file_name || 'Document'}
              courseId={fileInfo?.course_id || ''}
              courseName={fileInfo?.course?.name || 'Course'}
              onStart={startPersonalization}
              onPause={pauseStreaming}
              onResume={resumeStreaming}
              onSkipSection={skipSection}
              isStreaming={isStreaming}
              isPaused={isPaused}
              currentSection={currentSection + 1}
              totalSections={sections.length}
              progress={progress}
            />

            {/* Interactive Controls */}
            {(isStreaming || sections.some(s => s.isComplete)) && (
              <InteractiveControls
                isStreaming={isStreaming}
                isPaused={isPaused}
                onPlayPause={handlePlayPause}
                onSkip={skipSection}
                onSpeedChange={setStreamSpeed}
                onStyleChange={setExplanationStyle}
                currentSpeed={streamSpeed}
                currentStyle={explanationStyle}
                progress={progress}
                streakDays={streak}
              />
            )}

            {/* Content Display */}
            {sections.length > 0 && (
              <StudentContentDisplay
                sections={sections}
                onRegenerateSection={regenerateSection}
                onBookmarkSection={bookmarkSection}
              />
            )}
          </div>

          {/* Gamification Panel */}
          {showGamification && (
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <GamificationPanel
                  points={points}
                  level={level}
                  streak={streak}
                  sectionsCompleted={sections.filter(s => s.isComplete).length}
                  totalSections={sections.length}
                  onAchievementUnlock={(achievement) => {
                    toast.success(`Achievement unlocked: ${achievement.title}!`);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StudentPersonalizationPage() {
  return (
    <ErrorBoundary
      FallbackComponent={StudentErrorFallback}
      onReset={() => window.location.reload()}
    >
      <StudentPersonalizationPageContent />
    </ErrorBoundary>
  );
}
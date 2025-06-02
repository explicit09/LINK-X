'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Mission {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  action: () => void;
  actionLabel: string;
}

interface SetupMissionsProps {
  onMissionComplete?: (missionId: string) => void;
  completedMissions?: string[];
}

export function SetupMissions({ onMissionComplete, completedMissions = [] }: SetupMissionsProps) {
  const router = useRouter();
  
  const missions: Mission[] = [
    {
      id: 'add-course',
      title: '🎯 Add your first course',
      description: 'Import from your LMS or add manually',
      xp: 25,
      completed: completedMissions.includes('add-course'),
      action: () => router.push('/courses'),
      actionLabel: 'Add Course'
    },
    {
      id: 'book-study',
      title: '🗓️ Book your first study block',
      description: 'Schedule time to focus on learning',
      xp: 25,
      completed: completedMissions.includes('book-study'),
      action: () => router.push('/schedule'),
      actionLabel: 'Schedule Study'
    },
    {
      id: 'complete-quiz',
      title: '✅ Complete the 3-min onboarding quiz',
      description: 'Help us personalize your experience',
      xp: 50,
      completed: completedMissions.includes('complete-quiz'),
      action: () => router.push('/onboarding?step=quiz'),
      actionLabel: 'Take Quiz'
    }
  ];

  const totalXP = missions.reduce((sum, m) => sum + m.xp, 0);
  const earnedXP = missions.filter(m => m.completed).reduce((sum, m) => sum + m.xp, 0);
  const progress = (earnedXP / totalXP) * 100;

  // If all missions completed, return null to show normal dashboard
  if (progress === 100) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-100 bg-gradient-to-r from-purple-50/50 to-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>Kick-Start Checklist</span>
          </CardTitle>
          <div className="text-sm font-medium text-purple-600">
            {earnedXP} / {totalXP} XP
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2 bg-purple-100" />
        
        <div className="space-y-3">
          {missions.map((mission) => (
            <div
              key={mission.id}
              className={`p-4 rounded-lg border transition-all ${
                mission.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-0.5">
                    {mission.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      mission.completed ? 'text-green-900 line-through' : 'text-gray-900'
                    }`}>
                      {mission.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{mission.description}</p>
                    <div className="text-xs font-medium text-purple-600 mt-2">
                      +{mission.xp} XP
                    </div>
                  </div>
                </div>
                {!mission.completed && (
                  <Button
                    size="sm"
                    onClick={() => {
                      mission.action();
                      onMissionComplete?.(mission.id);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {mission.actionLabel}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center text-sm text-gray-600 pt-2">
          Complete all missions to unlock your personalized dashboard!
        </div>
      </CardContent>
    </Card>
  );
}
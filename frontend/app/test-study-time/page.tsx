'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudySessionTracker } from '@/components/study';
import { useStudyTime } from '@/hooks/useStudyTime';
import { Clock, Trophy, TrendingUp, BookOpen } from 'lucide-react';

export default function TestStudyTime() {
  const { 
    studyTime, 
    activeSession, 
    isLoading, 
    weeklyStudyHours,
    avgSessionLength,
    studyStreak,
    startSession,
    endSession
  } = useStudyTime('week');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Study Time Tracking Test Page</h1>
      
      {/* Study Time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Weekly Study Hours</h3>
            </div>
            <p className="text-3xl font-bold">
              {isLoading ? '...' : weeklyStudyHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Avg Session Length</h3>
            </div>
            <p className="text-3xl font-bold">
              {isLoading ? '...' : Math.round(avgSessionLength)} min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold">Study Streak</h3>
            </div>
            <p className="text-3xl font-bold">
              {isLoading ? '...' : studyStreak} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Study Session Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Full Tracker View</h2>
          <StudySessionTracker />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Compact Tracker View</h2>
          <StudySessionTracker compact />
        </div>
      </div>

      {/* Active Session Info */}
      {activeSession && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Active Study Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Session ID:</strong> {activeSession.session_id}</p>
              <p><strong>Title:</strong> {activeSession.title}</p>
              <p><strong>Started At:</strong> {new Date(activeSession.started_at).toLocaleString()}</p>
              <p><strong>Status:</strong> <Badge>{activeSession.status}</Badge></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Study Time Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Study Time Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(studyTime, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Manual Controls */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Manual Test Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => startSession('Test Session', undefined)}
            disabled={!!activeSession}
          >
            Start Test Session
          </Button>
          
          <Button 
            onClick={() => endSession({ focus_score: 8, effectiveness_rating: 4 })}
            disabled={!activeSession}
            variant="secondary"
          >
            End Test Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
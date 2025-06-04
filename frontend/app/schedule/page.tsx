/**
 * Schedule Page - Route Handler
 * LOCKED during beta - will be available after beta launch
 */

'use client';

import { LockedPage } from '@/components/ui/locked-page';

export default function SchedulePageRoute() {
  return (
    <LockedPage
      featureName="Smart Study Schedule"
      description="Plan and manage your study sessions with AI-powered scheduling, time blocking, and progress tracking. Get personalized recommendations for optimal learning times."
      icon="schedule"
      estimatedRelease="shortly after beta launch"
    />
  );
}
/**
 * Progress Page - Route Handler
 * LOCKED during beta - will be available after beta launch
 */

'use client';

import { LockedPage } from '@/components/ui/locked-page';

export default function ProgressPage() {
  return (
    <LockedPage
      featureName="Progress Analytics"
      description="Track your learning progress with detailed analytics, performance insights, and achievement tracking. Monitor your study habits and optimize your learning efficiency."
      icon="progress"
      estimatedRelease="shortly after beta launch"
    />
  );
}
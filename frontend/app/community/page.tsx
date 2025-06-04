/**
 * Community Page - Route Handler
 * LOCKED during beta - will be available after beta launch
 */

'use client';

import { LockedPage } from '@/components/ui/locked-page';

export default function CommunityPage() {
  return (
    <LockedPage
      featureName="Community Hub"
      description="Connect with fellow learners, join study groups, share resources, and participate in discussions. Build your learning network and collaborate with peers."
      icon="progress" // Using progress icon as community icon
      estimatedRelease="shortly after beta launch"
    />
  );
}